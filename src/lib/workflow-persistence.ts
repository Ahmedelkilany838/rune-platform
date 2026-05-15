import { APP_CONFIG } from "@/lib/app-config";
import type { ChatApiResponse, JsonObject, JsonValue } from "@/lib/chat-types";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type PersistWorkflowContextArgs = {
  conversationSessionId: string | null;
  metadata: {
    project_context?: JsonObject;
    prompt_output_contract: typeof APP_CONFIG.promptOutputContract;
    source: typeof APP_CONFIG.metadataSource;
    ui_version: typeof APP_CONFIG.uiVersion;
  };
  projectId: string | null;
  promptRequestId: string | null;
  supabase: SupabaseServerClient;
  workspaceId: string;
};

type GeneratedOutputLike = {
  avoid_constraints: string | null;
  final_prompt: string | null;
  generation_metadata: unknown;
  id: string;
  platform_parameters: unknown;
  prompt_request_id: string;
  structured_output: unknown;
  validation_status: string | null;
};

type PersistGeneratedOutputArgs = {
  conversationSessionId: string | null;
  output: GeneratedOutputLike;
  response?: ChatApiResponse | null;
  supabase: SupabaseServerClient;
  workspaceId: string;
};

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asJsonObject(value: unknown): JsonObject {
  return isJsonObject(value) ? value : {};
}

function countWords(value: string | null) {
  if (!value) return 0;
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function hasNonEmptyJsonObject(value: unknown) {
  return isJsonObject(value) && Object.keys(value).length > 0;
}

function buildOutputValidationSnapshot(output: GeneratedOutputLike) {
  const minimumPromptWords = APP_CONFIG.promptOutputContract.minimumPromptWords;
  const wordCount = countWords(output.final_prompt);
  const hasAvoidConstraints = Boolean(output.avoid_constraints?.trim());
  const hasPlatformParameters = hasNonEmptyJsonObject(output.platform_parameters);
  const hasStructuredOutput = hasNonEmptyJsonObject(output.structured_output);
  const passesMinimumWordCount = wordCount >= minimumPromptWords;
  const passesContract =
    passesMinimumWordCount &&
    (!APP_CONFIG.promptOutputContract.requireAvoidConstraints || hasAvoidConstraints) &&
    (!APP_CONFIG.promptOutputContract.requirePlatformParameters || hasPlatformParameters) &&
    hasStructuredOutput;

  return {
    checked_at: new Date().toISOString(),
    contract: APP_CONFIG.promptOutputContract,
    has_avoid_constraints: hasAvoidConstraints,
    has_platform_parameters: hasPlatformParameters,
    has_structured_output: hasStructuredOutput,
    minimum_prompt_words: minimumPromptWords,
    passes_contract: passesContract,
    passes_minimum_word_count: passesMinimumWordCount,
    prompt_word_count: wordCount,
    source: "rune_frontend_enforcement"
  } satisfies JsonObject;
}

function buildResponseSnapshot(output: GeneratedOutputLike, response?: ChatApiResponse | null): ChatApiResponse {
  return {
    ok: response?.ok ?? true,
    message_to_user: response?.message_to_user ?? null,
    conversation_session_id: response?.conversation_session_id ?? null,
    prompt_request_id: output.prompt_request_id,
    generated_output_id: output.id,
    wf10_status: response?.wf10_status ?? "generated",
    output_type: response?.output_type ?? null,
    platform: response?.platform ?? null,
    generation_layer: response?.generation_layer ?? null,
    next_workflow: response?.next_workflow ?? null,
    generated_prompt: output.final_prompt,
    avoid_constraints: output.avoid_constraints,
    structured_output: isJsonObject(output.structured_output) ? output.structured_output : null,
    used_knowledge_blocks: Array.isArray(response?.used_knowledge_blocks) ? response.used_knowledge_blocks : null,
    validation_status: response?.validation_status ?? output.validation_status,
    status: response?.status ?? null,
    errors: response?.errors ?? [],
    raw: response?.raw ?? {}
  };
}

function buildCanonicalAssistantContent(output: GeneratedOutputLike) {
  if (!output.final_prompt) return null;
  const sections = [`Prompt:\n\n${output.final_prompt}`];
  if (output.avoid_constraints) sections.push(`Avoid:\n\n${output.avoid_constraints}`);
  return sections.join("\n\n");
}

export async function persistWorkflowContextSnapshot({
  conversationSessionId,
  metadata,
  projectId,
  promptRequestId,
  supabase,
  workspaceId
}: PersistWorkflowContextArgs) {
  if (!promptRequestId) return;

  const { data: promptRequest } = await supabase
    .from("prompt_requests")
    .select("id, request_context")
    .eq("id", promptRequestId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!promptRequest) return;

  const existingContext = asJsonObject(promptRequest.request_context);

  await supabase
    .from("prompt_requests")
    .update({
      ...(projectId ? { project_id: projectId } : {}),
      request_context: {
        ...existingContext,
        conversation_session_id: conversationSessionId,
        project_context: metadata.project_context ?? null,
        prompt_output_contract: metadata.prompt_output_contract,
        source: metadata.source,
        ui_version: metadata.ui_version,
        workflow_persistence_enforced_at: new Date().toISOString()
      }
    })
    .eq("id", promptRequestId)
    .eq("workspace_id", workspaceId);
}

export async function persistGeneratedOutputEnforcement({
  conversationSessionId,
  output,
  response,
  supabase,
  workspaceId
}: PersistGeneratedOutputArgs) {
  const { data: promptRequest } = await supabase
    .from("prompt_requests")
    .select("id, workspace_id")
    .eq("id", output.prompt_request_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!promptRequest) return;

  const validationSnapshot = buildOutputValidationSnapshot(output);
  const existingMetadata = asJsonObject(output.generation_metadata);

  await supabase
    .from("generated_outputs")
    .update({
      generation_metadata: {
        ...existingMetadata,
        prompt_output_validation: validationSnapshot
      }
    })
    .eq("id", output.id);

  if (!conversationSessionId) return;

  const canonicalContent = buildCanonicalAssistantContent(output);
  if (!canonicalContent) return;

  const responseSnapshot = buildResponseSnapshot(output, response);
  const { data: latestAssistantMessage } = await supabase
    .from("conversation_messages")
    .select("id, metadata")
    .eq("conversation_session_id", conversationSessionId)
    .neq("sender", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestAssistantMessage) return;

  const messageMetadata = asJsonObject(latestAssistantMessage.metadata);

  await supabase
    .from("conversation_messages")
    .update({
      message_text: canonicalContent,
      metadata: {
        ...messageMetadata,
        response: responseSnapshot as unknown as JsonValue,
        prompt_output_validation: validationSnapshot
      }
    })
    .eq("id", latestAssistantMessage.id);
}
