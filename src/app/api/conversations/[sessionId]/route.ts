import { NextResponse } from "next/server";
import { getActiveWorkspace } from "@/lib/auth/get-active-workspace";
import type { JsonObject } from "@/lib/chat-types";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    sessionId?: string;
  }>;
};

type UpdateConversationPayload = {
  isArchived?: unknown;
  isPinned?: unknown;
  projectId?: unknown;
  status?: unknown;
  title?: unknown;
};

const MAX_TITLE_LENGTH = 140;
const ALLOWED_STATUSES = new Set(["active", "archived", "deleted"]);

function normalizeTitle(value: unknown) {
  if (typeof value !== "string") return undefined;
  const title = value.trim().replace(/\s+/g, " ").slice(0, MAX_TITLE_LENGTH);
  return title || undefined;
}

function normalizeBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeProjectId(value: unknown) {
  if (value === null) return null;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeStatus(value: unknown) {
  if (typeof value !== "string") return undefined;
  const status = value.trim().toLowerCase();
  return ALLOWED_STATUSES.has(status) ? status : undefined;
}

function cleanMetadata(metadata: JsonObject | null): JsonObject {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

export async function PATCH(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "missing_session_id" }, { status: 400 });
  }

  const activeWorkspace = await getActiveWorkspace();

  if (!activeWorkspace.ok) {
    const status = activeWorkspace.error === "not_authenticated" ? 401 : 403;
    return NextResponse.json({ ok: false, error: activeWorkspace.error }, { status });
  }

  let payload: UpdateConversationPayload;

  try {
    payload = (await request.json()) as UpdateConversationPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const title = normalizeTitle(payload.title);
  const isPinned = normalizeBoolean(payload.isPinned);
  const isArchived = normalizeBoolean(payload.isArchived);
  const projectId = normalizeProjectId(payload.projectId);
  const status = normalizeStatus(payload.status);

  if (
    title === undefined &&
    isPinned === undefined &&
    isArchived === undefined &&
    projectId === undefined &&
    status === undefined
  ) {
    return NextResponse.json({ ok: false, error: "no_valid_updates" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("conversation_sessions")
    .select("id, metadata, project_id, status")
    .eq("id", sessionId)
    .eq("workspace_id", activeWorkspace.workspace.id)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ ok: false, error: "conversation_session_query_failed" }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ ok: false, error: "conversation_session_not_found" }, { status: 404 });
  }

  if (projectId) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("workspace_id", activeWorkspace.workspace.id)
      .neq("status", "deleted")
      .maybeSingle();

    if (projectError) {
      return NextResponse.json({ ok: false, error: "project_query_failed" }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ ok: false, error: "project_not_found" }, { status: 404 });
    }
  }

  const metadata = cleanMetadata(session.metadata as JsonObject | null);

  if (title !== undefined) metadata.title = title;
  if (isPinned !== undefined) metadata.isPinned = isPinned;
  if (isArchived !== undefined) metadata.isArchived = isArchived;

  const updatePayload: {
    metadata: JsonObject;
    project_id?: string | null;
    status?: string;
    updated_at: string;
  } = {
    metadata,
    updated_at: new Date().toISOString()
  };

  if (projectId !== undefined) updatePayload.project_id = projectId;
  if (status !== undefined) updatePayload.status = status;

  const { data, error } = await supabase
    .from("conversation_sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .eq("workspace_id", activeWorkspace.workspace.id)
    .select("id, project_id, summary, metadata, status, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: "conversation_session_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, session: data });
}
