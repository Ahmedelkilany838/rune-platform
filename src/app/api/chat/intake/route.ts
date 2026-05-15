import { APP_CONFIG } from "@/lib/app-config";
import { getActiveWorkspace } from "@/lib/auth/get-active-workspace";
import type { ChatApiResponse, ChatRequest } from "@/lib/chat-types";
import { normalizeWorkflowResponse } from "@/lib/normalize-workflow-response";
import { createClient } from "@/lib/supabase/server";

type IntakePayload = {
  workspace_id: string;
  user_id: string;
  project_id: string | null;
  conversation_session_id: string | null;
  message_text: string;
  channel: typeof APP_CONFIG.intakeChannel;
  attachments: [];
  metadata: {
    source: typeof APP_CONFIG.metadataSource;
    is_temporary?: boolean;
    project_context?: {
      description: string | null;
      objective: string | null;
      platforms: string[];
      project_name: string;
      project_type: string;
    };
    temporary_expires_at?: string;
    ui_version: typeof APP_CONFIG.uiVersion;
  };
};

type ProjectContext = NonNullable<IntakePayload["metadata"]["project_context"]>;

type ProjectContextResolution =
  | {
      context: ProjectContext | null;
      ok: true;
      projectId: string | null;
    }
  | {
      error: "project_not_found" | "project_query_failed";
      ok: false;
    };

function errorResponse(status: number, errors: string[]) {
  const body: ChatApiResponse = {
    ok: false,
    message_to_user: null,
    conversation_session_id: null,
    prompt_request_id: null,
    generated_output_id: null,
    wf10_status: null,
    output_type: null,
    platform: null,
    generation_layer: null,
    next_workflow: null,
    generated_prompt: null,
    avoid_constraints: null,
    structured_output: null,
    used_knowledge_blocks: null,
    validation_status: null,
    status: null,
    errors,
    raw: {}
  };

  return Response.json(body, { status });
}

function isChatRequest(value: unknown): value is ChatRequest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;

  const candidate = value as Record<string, unknown>;
  const hasMessage = typeof candidate.message_text === "string";
  const hasSession =
    candidate.conversation_session_id === null ||
    typeof candidate.conversation_session_id === "string" ||
    candidate.conversation_session_id === undefined;
  const hasProject =
    candidate.project_id === null ||
    typeof candidate.project_id === "string" ||
    candidate.project_id === undefined;

  return hasMessage && hasSession && hasProject;
}

function getTemporaryExpiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

async function parseResponseJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      errors: ["n8n_response_was_not_valid_json"],
      raw_text_preview: text.slice(0, 500)
    };
  }
}

async function getValidatedProjectContext(
  workspaceId: string,
  projectId: string | null
): Promise<ProjectContextResolution> {
  if (!projectId) {
    return {
      context: null,
      ok: true,
      projectId: null
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("project_name, project_type, description, objective, platforms, status")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    return {
      error: "project_query_failed",
      ok: false
    };
  }

  if (!data || data.status === "deleted") {
    return {
      error: "project_not_found",
      ok: false
    };
  }

  return {
    context: {
      description: data.description,
      objective: data.objective,
      platforms: data.platforms ?? [],
      project_name: data.project_name,
      project_type: data.project_type
    },
    ok: true,
    projectId
  };
}

export async function POST(request: Request) {
  const body = await readJson(request);

  if (!isChatRequest(body)) {
    return errorResponse(400, ["invalid_request_body"]);
  }

  const messageText = body.message_text.trim();

  if (!messageText) {
    return errorResponse(400, ["message_text_required"]);
  }

  if (body.message_text.length > APP_CONFIG.maxMessageCharacters) {
    return errorResponse(400, ["message_text_too_long"]);
  }

  const webhookUrl = process.env.N8N_CHAT_INTAKE_WEBHOOK_URL;

  if (!webhookUrl) {
    return errorResponse(500, ["n8n_chat_intake_webhook_url_missing"]);
  }

  const activeWorkspace = await getActiveWorkspace();

  if (!activeWorkspace.ok) {
    if (activeWorkspace.error === "not_authenticated") {
      return errorResponse(401, ["authentication_required"]);
    }

    return errorResponse(403, [activeWorkspace.error]);
  }

  const projectResolution = await getValidatedProjectContext(activeWorkspace.workspace.id, body.project_id ?? null);

  if (!projectResolution.ok) {
    return errorResponse(projectResolution.error === "project_not_found" ? 404 : 500, [projectResolution.error]);
  }

  const temporaryExpiresAt = body.is_temporary ? getTemporaryExpiresAt() : null;
  const payload: IntakePayload = {
    workspace_id: activeWorkspace.workspace.id,
    user_id: activeWorkspace.profile.id,
    project_id: projectResolution.projectId,
    conversation_session_id: body.conversation_session_id ?? null,
    message_text: body.message_text,
    channel: APP_CONFIG.intakeChannel,
    attachments: [],
    metadata: {
      source: APP_CONFIG.metadataSource,
      ...(projectResolution.context
        ? {
            project_context: projectResolution.context
          }
        : {}),
      ...(body.is_temporary
        ? {
            is_temporary: true,
            temporary_expires_at: temporaryExpiresAt ?? getTemporaryExpiresAt()
          }
        : {}),
      ui_version: APP_CONFIG.uiVersion
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.webhookTimeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const upstreamJson = await parseResponseJson(response);
    const normalized = normalizeWorkflowResponse(upstreamJson);

    if (body.is_temporary && normalized.conversation_session_id) {
      const supabase = await createClient();
      const expiresAt = temporaryExpiresAt ?? getTemporaryExpiresAt();
      const { data: existingSession } = await supabase
        .from("conversation_sessions")
        .select("metadata")
        .eq("id", normalized.conversation_session_id)
        .eq("workspace_id", activeWorkspace.workspace.id)
        .maybeSingle();

      await supabase
        .from("conversation_sessions")
        .update({
          metadata: {
            ...(existingSession?.metadata ?? {}),
            isTemporary: true,
            temporaryExpiresAt: expiresAt
          }
        })
        .eq("id", normalized.conversation_session_id)
        .eq("workspace_id", activeWorkspace.workspace.id);
    }

    if (!response.ok) {
      return Response.json(
        {
          ...normalized,
          ok: false,
          errors: [
            ...normalized.errors,
            `n8n_request_failed_status_${response.status}`
          ]
        } satisfies ChatApiResponse,
        { status: 502 }
      );
    }

    return Response.json(normalized);
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === "AbortError";
    return errorResponse(isAbort ? 504 : 502, [isAbort ? "n8n_request_timeout" : "n8n_request_failed"]);
  } finally {
    clearTimeout(timeout);
  }
}
