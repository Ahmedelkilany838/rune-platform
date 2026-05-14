export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type ChatRole = "user" | "assistant" | "status" | "error";

export type ConnectionStatus = "not_tested" | "connected" | "error";

export type WorkflowRawResponse = unknown;

export type ChatRequest = {
  message_text: string;
  conversation_session_id: string | null;
  is_temporary?: boolean;
};

export type GeneratedPromptData = {
  prompt_request_id: string | null;
  generated_output_id: string | null;
  output_type: string | null;
  platform: string | null;
  generation_layer: string | null;
  validation_status: string | null;
  generated_prompt: string | null;
  avoid_constraints: string | null;
  structured_output: Record<string, unknown> | null;
  used_knowledge_blocks: unknown[] | null;
};

export type ChatApiResponse = GeneratedPromptData & {
  ok: boolean;
  message_to_user: string | null;
  conversation_session_id: string | null;
  wf10_status: "generated" | "failed" | null;
  next_workflow: string | null;
  status: string | null;
  errors: string[];
  raw: WorkflowRawResponse;
};

export type ChatMessage = {
  animate?: boolean;
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  response?: ChatApiResponse;
};
