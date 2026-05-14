import { NextResponse } from "next/server";
import { getActiveWorkspace } from "@/lib/auth/get-active-workspace";
import type { StoredChatSession } from "@/lib/chat-storage";
import type { JsonObject } from "@/lib/chat-types";
import { enrichConversationMessagesWithOutputs } from "@/lib/db/enrich-conversation-messages";
import { mapConversationMessage, type ConversationMessageRow } from "@/lib/db/map-conversation-message";
import { createClient } from "@/lib/supabase/server";

type ConversationSessionListRow = {
  created_at: string;
  id: string;
  metadata: JsonObject | null;
  project_id: string | null;
  summary: string | null;
  updated_at: string;
};

function getStringMetadataValue(metadata: JsonObject | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getBooleanMetadataValue(metadata: JsonObject | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "boolean" ? value : false;
}

function getTemporaryExpiresAt(metadata: JsonObject | null) {
  const value = metadata?.temporaryExpiresAt;
  return typeof value === "string" ? value : null;
}

function isTemporarySession(metadata: JsonObject | null) {
  return getBooleanMetadataValue(metadata, "isTemporary");
}

function isExpiredTemporarySession(metadata: JsonObject | null, nowIso: string) {
  const expiresAt = getTemporaryExpiresAt(metadata);
  return isTemporarySession(metadata) && Boolean(expiresAt && expiresAt <= nowIso);
}

function mapConversationSession(
  row: ConversationSessionListRow,
  messagesBySessionId: Map<string, ReturnType<typeof mapConversationMessage>[]>
): StoredChatSession {
  const title = getStringMetadataValue(row.metadata, "title") ?? row.summary ?? "Untitled brief";

  return {
    id: row.id,
    title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    conversationSessionId: row.id,
    messages: messagesBySessionId.get(row.id) ?? [],
    latestResponse: null,
    projectId: row.project_id,
    isPinned: getBooleanMetadataValue(row.metadata, "isPinned"),
    isArchived: getBooleanMetadataValue(row.metadata, "isArchived"),
    isTemporary: isTemporarySession(row.metadata),
    temporaryExpiresAt: getTemporaryExpiresAt(row.metadata)
  };
}

export async function GET() {
  const activeWorkspace = await getActiveWorkspace();

  if (!activeWorkspace.ok) {
    const status = activeWorkspace.error === "not_authenticated" ? 401 : 403;
    return NextResponse.json({ ok: false, error: activeWorkspace.error }, { status });
  }

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("conversation_sessions")
    .select("id, project_id, summary, metadata, created_at, updated_at")
    .eq("workspace_id", activeWorkspace.workspace.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: "conversation_sessions_query_failed" }, { status: 500 });
  }

  const allSessionRows = data ?? [];
  const expiredTemporarySessionIds = allSessionRows
    .filter((row) => isExpiredTemporarySession(row.metadata, nowIso))
    .map((row) => row.id);

  if (expiredTemporarySessionIds.length > 0) {
    await supabase.from("conversation_messages").delete().in("conversation_session_id", expiredTemporarySessionIds);
    await supabase.from("conversation_sessions").delete().in("id", expiredTemporarySessionIds);
  }

  const sessionRows = allSessionRows.filter((row) => !isTemporarySession(row.metadata));
  const sessionIds = sessionRows.map((row) => row.id);
  const messagesBySessionId = new Map<string, ReturnType<typeof mapConversationMessage>[]>();

  if (sessionIds.length > 0) {
    const { data: messageRows, error: messagesError } = await supabase
      .from("conversation_messages")
      .select("id, conversation_session_id, sender, sender_role, message_text, message_type, metadata, created_at")
      .in("conversation_session_id", sessionIds)
      .order("created_at", { ascending: true });

    if (!messagesError) {
      const mappedMessages = await enrichConversationMessagesWithOutputs(
        supabase,
        activeWorkspace.workspace.id,
        ((messageRows ?? []) as ConversationMessageRow[]).map((row) => mapConversationMessage(row))
      );
      const originalRows = (messageRows ?? []) as ConversationMessageRow[];

      for (const [index, row] of originalRows.entries()) {
        const sessionId = row.conversation_session_id;
        if (!sessionId) continue;
        const currentMessages = messagesBySessionId.get(sessionId) ?? [];
        const mappedMessage = mappedMessages[index];
        if (mappedMessage) {
          currentMessages.push(mappedMessage);
        }
        messagesBySessionId.set(sessionId, currentMessages);
      }
    }
  }

  const sessions = sessionRows.map((row) => mapConversationSession(row, messagesBySessionId));

  return NextResponse.json({ ok: true, sessions });
}
