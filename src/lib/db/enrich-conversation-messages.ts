import type { ChatApiResponse, ChatMessage, JsonObject, JsonValue } from "@/lib/chat-types";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type PromptRequestLookupRow = {
  created_at: string;
  id: string;
  output_type: string | null;
  raw_input: string;
  status: string | null;
};

type GeneratedOutputLookupRow = {
  avoid_constraints: string | null;
  created_at: string;
  final_prompt: string | null;
  id: string;
  output_type: string | null;
  prompt_request_id: string;
  status: string | null;
  structured_output: JsonObject | null;
  used_knowledge_blocks: JsonValue[] | null;
  validation_status: string | null;
};

const PROMPT_REQUEST_MATCH_WINDOW_BEFORE_MS = 5 * 60 * 1000;
const PROMPT_REQUEST_MATCH_WINDOW_AFTER_MS = 30 * 60 * 1000;

function buildCanonicalContent(output: GeneratedOutputLookupRow) {
  if (!output.final_prompt) return null;

  const sections = [`Prompt:\n\n${output.final_prompt}`];

  if (output.avoid_constraints) {
    sections.push(`Avoid:\n\n${output.avoid_constraints}`);
  }

  return sections.join("\n\n");
}

function buildResponseFromOutput(message: ChatMessage, output: GeneratedOutputLookupRow): ChatApiResponse {
  return {
    ok: message.response?.ok ?? true,
    message_to_user: message.response?.message_to_user ?? null,
    conversation_session_id: message.response?.conversation_session_id ?? null,
    prompt_request_id: output.prompt_request_id,
    generated_output_id: output.id,
    wf10_status: message.response?.wf10_status ?? "generated",
    output_type: output.output_type,
    platform: message.response?.platform ?? null,
    generation_layer: message.response?.generation_layer ?? null,
    next_workflow: message.response?.next_workflow ?? null,
    generated_prompt: output.final_prompt,
    avoid_constraints: output.avoid_constraints,
    structured_output: output.structured_output,
    used_knowledge_blocks: output.used_knowledge_blocks,
    validation_status: output.validation_status,
    status: output.status,
    errors: message.response?.errors ?? [],
    raw: message.response?.raw ?? {}
  };
}

function getTime(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getNearestPromptRequest(
  promptRequests: PromptRequestLookupRow[],
  outputsByPromptRequestId: Map<string, GeneratedOutputLookupRow>,
  userMessage: ChatMessage,
  assistantMessage: ChatMessage
) {
  const userTime = getTime(userMessage.createdAt);
  const assistantTime = getTime(assistantMessage.createdAt);
  const userText = userMessage.content.trim();

  const candidates = promptRequests
    .filter((promptRequest) => promptRequest.raw_input.trim() === userText)
    .filter((promptRequest) => outputsByPromptRequestId.has(promptRequest.id));

  if (candidates.length === 0) {
    return null;
  }

  const boundedCandidates =
    userTime && assistantTime
      ? candidates.filter((promptRequest) => {
          const requestTime = getTime(promptRequest.created_at);
          if (!requestTime) return false;
          return (
            requestTime >= userTime - PROMPT_REQUEST_MATCH_WINDOW_BEFORE_MS &&
            requestTime <= assistantTime + PROMPT_REQUEST_MATCH_WINDOW_AFTER_MS
          );
        })
      : [];

  const matchingCandidates = boundedCandidates.length > 0 ? boundedCandidates : candidates;

  return matchingCandidates
    .slice()
    .sort((a, b) => {
      const aTime = getTime(a.created_at) ?? 0;
      const bTime = getTime(b.created_at) ?? 0;
      if (!userTime) return bTime - aTime;
      return Math.abs(aTime - userTime) - Math.abs(bTime - userTime);
    })[0];
}

export async function enrichConversationMessagesWithOutputs(
  supabase: SupabaseServerClient,
  workspaceId: string,
  messages: ChatMessage[]
) {
  const userTexts = Array.from(
    new Set(
      messages
        .filter((message) => message.role === "user")
        .map((message) => message.content.trim())
        .filter(Boolean)
    )
  );

  if (userTexts.length === 0) {
    return messages;
  }

  const { data: promptRequestRows, error: promptRequestError } = await supabase
    .from("prompt_requests")
    .select("id, raw_input, output_type, status, created_at")
    .eq("workspace_id", workspaceId)
    .in("raw_input", userTexts)
    .order("created_at", { ascending: false })
    .limit(300);

  if (promptRequestError || !promptRequestRows || promptRequestRows.length === 0) {
    return messages;
  }

  const promptRequests = promptRequestRows as PromptRequestLookupRow[];
  const promptRequestIds = promptRequests.map((promptRequest) => promptRequest.id);

  const { data: outputRows, error: outputError } = await supabase
    .from("generated_outputs")
    .select("id, prompt_request_id, output_type, final_prompt, avoid_constraints, structured_output, used_knowledge_blocks, validation_status, status, created_at")
    .in("prompt_request_id", promptRequestIds)
    .order("created_at", { ascending: false });

  if (outputError || !outputRows || outputRows.length === 0) {
    return messages;
  }

  const outputsByPromptRequestId = new Map<string, GeneratedOutputLookupRow>();

  for (const output of outputRows as GeneratedOutputLookupRow[]) {
    if (!outputsByPromptRequestId.has(output.prompt_request_id) && output.final_prompt) {
      outputsByPromptRequestId.set(output.prompt_request_id, output);
    }
  }

  if (outputsByPromptRequestId.size === 0) {
    return messages;
  }

  return messages.map((message, index) => {
    if (message.role !== "assistant" || message.response?.generated_prompt) {
      return message;
    }

    const previousUserMessage = messages
      .slice(0, index)
      .reverse()
      .find((candidate) => candidate.role === "user");

    if (!previousUserMessage) {
      return message;
    }

    const promptRequest = getNearestPromptRequest(
      promptRequests,
      outputsByPromptRequestId,
      previousUserMessage,
      message
    );

    if (!promptRequest) {
      return message;
    }

    const output = outputsByPromptRequestId.get(promptRequest.id);
    if (!output) {
      return message;
    }

    const content = buildCanonicalContent(output);
    if (!content) {
      return message;
    }

    return {
      ...message,
      content,
      response: buildResponseFromOutput(message, output)
    };
  });
}
