import type { ChatApiResponse, ChatMessage, ChatRole, JsonObject, JsonValue } from "@/lib/chat-types";

export type ConversationMessageRow = {
  conversation_session_id?: string;
  created_at: string;
  id: string;
  message_text: string | null;
  message_type: string;
  metadata: JsonObject | null;
  sender: string;
  sender_role: string | null;
};

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getStringOrNull(value: JsonObject, key: string) {
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
}

function getBoolean(value: JsonObject, key: string) {
  const candidate = value[key];
  return typeof candidate === "boolean" ? candidate : false;
}

function getErrors(value: JsonObject) {
  const candidate = value.errors;

  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate.filter((item): item is string => typeof item === "string");
}

function getStructuredOutput(value: JsonObject) {
  const candidate = value.structured_output;
  return isJsonObject(candidate) ? candidate : null;
}

function getUsedKnowledgeBlocks(value: JsonObject) {
  const candidate = value.used_knowledge_blocks;
  return Array.isArray(candidate) ? candidate : null;
}

function getWorkflowStatus(value: JsonObject) {
  const candidate = value.wf10_status;
  return candidate === "generated" || candidate === "failed" ? candidate : null;
}

function getChatApiResponse(metadata: JsonObject | null): ChatApiResponse | undefined {
  const response = metadata?.response;

  if (!isJsonObject(response) || typeof response.ok !== "boolean" || !Array.isArray(response.errors)) {
    return undefined;
  }

  return {
    ok: getBoolean(response, "ok"),
    message_to_user: getStringOrNull(response, "message_to_user"),
    conversation_session_id: getStringOrNull(response, "conversation_session_id"),
    prompt_request_id: getStringOrNull(response, "prompt_request_id"),
    generated_output_id: getStringOrNull(response, "generated_output_id"),
    wf10_status: getWorkflowStatus(response),
    output_type: getStringOrNull(response, "output_type"),
    platform: getStringOrNull(response, "platform"),
    generation_layer: getStringOrNull(response, "generation_layer"),
    next_workflow: getStringOrNull(response, "next_workflow"),
    generated_prompt: getStringOrNull(response, "generated_prompt"),
    avoid_constraints: getStringOrNull(response, "avoid_constraints"),
    structured_output: getStructuredOutput(response),
    used_knowledge_blocks: getUsedKnowledgeBlocks(response),
    validation_status: getStringOrNull(response, "validation_status"),
    status: getStringOrNull(response, "status"),
    errors: getErrors(response),
    raw: response.raw ?? {}
  };
}

function getMessageRole(row: ConversationMessageRow): ChatRole {
  if (row.message_type === "error") {
    return "error";
  }

  if (row.sender_role === "user" || row.sender === "user") {
    return "user";
  }

  return "assistant";
}

export function mapConversationMessage(row: ConversationMessageRow): ChatMessage {
  const response = getChatApiResponse(row.metadata);

  return {
    id: row.id,
    role: getMessageRole(row),
    content: row.message_text ?? "",
    createdAt: row.created_at,
    ...(response ? { response } : {})
  };
}
