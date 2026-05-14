import { NextResponse } from "next/server";
import { getActiveWorkspace } from "@/lib/auth/get-active-workspace";
import { enrichConversationMessagesWithOutputs } from "@/lib/db/enrich-conversation-messages";
import { mapConversationMessage } from "@/lib/db/map-conversation-message";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    sessionId?: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "missing_session_id" }, { status: 400 });
  }

  const activeWorkspace = await getActiveWorkspace();

  if (!activeWorkspace.ok) {
    const status = activeWorkspace.error === "not_authenticated" ? 401 : 403;
    return NextResponse.json({ ok: false, error: activeWorkspace.error }, { status });
  }

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("conversation_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("workspace_id", activeWorkspace.workspace.id)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ ok: false, error: "conversation_session_query_failed" }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ ok: false, error: "conversation_session_not_found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id, sender, sender_role, message_text, message_type, metadata, created_at")
    .eq("conversation_session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: "conversation_messages_query_failed" }, { status: 500 });
  }

  const messages = await enrichConversationMessagesWithOutputs(
    supabase,
    activeWorkspace.workspace.id,
    (data ?? []).map((row) => mapConversationMessage(row))
  );

  return NextResponse.json({ ok: true, messages });
}
