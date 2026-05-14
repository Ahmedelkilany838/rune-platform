import { NextResponse } from "next/server";
import { getActiveWorkspace } from "@/lib/auth/get-active-workspace";
import { createClient } from "@/lib/supabase/server";

type UnknownRecord = Record<string, unknown>;

type GeneratedOutputRow = {
  avoid_constraints: string | null;
  created_at: string;
  final_prompt: string | null;
  generation_metadata: unknown;
  id: string;
  output_type: string | null;
  platform_parameters: unknown;
  prompt_request_id: string;
  quality_score: number | null;
  status: string | null;
  structured_output: unknown;
  updated_at: string;
  used_knowledge_blocks: unknown;
  used_platform_rules: unknown;
  used_prompt_rules: unknown;
  validation_status: string | null;
};

type PromptRequestLookupRow = {
  created_at: string;
  id: string;
  normalized_brief: unknown;
  raw_input: string;
  workspace_id: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

function getSourceConversationSessionId(normalizedBrief: unknown) {
  const parsed =
    typeof normalizedBrief === "string"
      ? (() => {
          try {
            return JSON.parse(normalizedBrief) as unknown;
          } catch {
            return null;
          }
        })()
      : normalizedBrief;

  if (!isRecord(parsed)) return null;
  return stringOrNull(parsed.source_conversation_session_id);
}

function submittedAfterDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  date.setMinutes(date.getMinutes() - 2);
  return date.toISOString();
}

function outputSelect() {
  return "id, prompt_request_id, output_type, final_prompt, avoid_constraints, structured_output, platform_parameters, used_knowledge_blocks, used_prompt_rules, used_platform_rules, generation_metadata, quality_score, validation_status, status, created_at, updated_at";
}

async function getPromptRequestWorkspace(supabase: Awaited<ReturnType<typeof createClient>>, promptRequestId: string) {
  return supabase
    .from("prompt_requests")
    .select("id, workspace_id")
    .eq("id", promptRequestId)
    .maybeSingle();
}

async function getLatestOutputForPromptRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  promptRequestId: string,
  workspaceId: string
) {
  const { data: promptRequest, error: promptRequestError } = await getPromptRequestWorkspace(supabase, promptRequestId);

  if (promptRequestError) {
    return { error: "prompt_request_query_failed" as const, output: null, status: 500 };
  }

  if (!promptRequest || promptRequest.workspace_id !== workspaceId) {
    return { error: "prompt_request_not_found" as const, output: null, status: 404 };
  }

  const { data: output, error: outputError } = await supabase
    .from("generated_outputs")
    .select(outputSelect())
    .eq("prompt_request_id", promptRequest.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<GeneratedOutputRow>();

  if (outputError) {
    return { error: "generated_output_query_failed" as const, output: null, status: 500 };
  }

  if (!output) {
    return { error: "generated_output_not_found" as const, output: null, status: 404 };
  }

  return { error: null, output, status: 200 };
}

async function getOutputById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  outputId: string,
  workspaceId: string
) {
  const { data: output, error: outputError } = await supabase
    .from("generated_outputs")
    .select(outputSelect())
    .eq("id", outputId)
    .maybeSingle<GeneratedOutputRow>();

  if (outputError) {
    return { error: "generated_output_query_failed" as const, output: null, status: 500 };
  }

  if (!output) {
    return { error: "generated_output_not_found" as const, output: null, status: 404 };
  }

  const { data: promptRequest, error: promptRequestError } = await getPromptRequestWorkspace(
    supabase,
    output.prompt_request_id
  );

  if (promptRequestError) {
    return { error: "prompt_request_query_failed" as const, output: null, status: 500 };
  }

  if (!promptRequest || promptRequest.workspace_id !== workspaceId) {
    return { error: "generated_output_not_found" as const, output: null, status: 404 };
  }

  return { error: null, output, status: 200 };
}

async function findPromptRequestForSubmittedMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  messageText: string,
  conversationSessionId: string | null,
  submittedAt: string | null
) {
  let query = supabase
    .from("prompt_requests")
    .select("id, workspace_id, raw_input, normalized_brief, created_at")
    .eq("workspace_id", workspaceId)
    .eq("raw_input", messageText);

  const lowerBound = submittedAfterDate(submittedAt);
  if (lowerBound) {
    query = query.gte("created_at", lowerBound);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(10);

  if (error) {
    return { error: "prompt_request_query_failed" as const, promptRequestId: null, status: 500 };
  }

  const rows = (data ?? []) as PromptRequestLookupRow[];
  const matchingRow =
    rows.find((row) => {
      if (!conversationSessionId) return true;
      return getSourceConversationSessionId(row.normalized_brief) === conversationSessionId;
    }) ?? rows[0];

  if (!matchingRow) {
    return { error: "prompt_request_not_found" as const, promptRequestId: null, status: 404 };
  }

  return { error: null, promptRequestId: matchingRow.id, status: 200 };
}

export async function POST(request: Request) {
  const body = await readJson(request);

  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "invalid_request_body" }, { status: 400 });
  }

  const generatedOutputId = stringOrNull(body.generated_output_id);
  const promptRequestId = stringOrNull(body.prompt_request_id);
  const conversationSessionId = stringOrNull(body.conversation_session_id);
  const messageText = stringOrNull(body.message_text);
  const submittedAt = stringOrNull(body.submitted_at);

  const activeWorkspace = await getActiveWorkspace();

  if (!activeWorkspace.ok) {
    const status = activeWorkspace.error === "not_authenticated" ? 401 : 403;
    return NextResponse.json({ ok: false, error: activeWorkspace.error }, { status });
  }

  const supabase = await createClient();
  const workspaceId = activeWorkspace.workspace.id;

  if (generatedOutputId) {
    const result = await getOutputById(supabase, generatedOutputId, workspaceId);
    if (result.output) {
      return NextResponse.json({ ok: true, output: result.output });
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  if (promptRequestId) {
    const result = await getLatestOutputForPromptRequest(supabase, promptRequestId, workspaceId);
    if (result.output) {
      return NextResponse.json({ ok: true, output: result.output });
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  if (!messageText) {
    return NextResponse.json({ ok: false, error: "missing_resolution_target" }, { status: 400 });
  }

  const promptRequestResult = await findPromptRequestForSubmittedMessage(
    supabase,
    workspaceId,
    messageText,
    conversationSessionId,
    submittedAt
  );

  if (!promptRequestResult.promptRequestId) {
    return NextResponse.json({ ok: false, error: promptRequestResult.error }, { status: promptRequestResult.status });
  }

  const outputResult = await getLatestOutputForPromptRequest(supabase, promptRequestResult.promptRequestId, workspaceId);

  if (!outputResult.output) {
    return NextResponse.json({ ok: false, error: outputResult.error }, { status: outputResult.status });
  }

  return NextResponse.json({ ok: true, output: outputResult.output });
}
