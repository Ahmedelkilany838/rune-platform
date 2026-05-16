import { APP_CONFIG } from "@/lib/app-config";
import type { ChatApiResponse, JsonObject, JsonValue } from "@/lib/chat-types";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type PersistWorkflowContextArgs = {
  conversationSessionId: string | null;
  metadata: {
    detected_intent?: JsonObject;
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

const VISUAL_DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  lighting: [/\blight(?:ing)?\b/i, /\bkey light\b/i, /\bsoftbox\b/i, /\bambient\b/i, /\bexposure\b/i],
  shadow: [/\bshadow\b/i, /\bcontrast\b/i, /\bfalloff\b/i, /\bocclusion\b/i],
  camera: [/\bcamera\b/i, /\bsensor\b/i, /\bshot on\b/i, /\bphotographed\b/i],
  lens: [/\blens\b/i, /\bfocal length\b/i, /\b\d{2,3}mm\b/i, /\bdepth of field\b/i, /\bbokeh\b/i],
  composition: [/\bcomposition\b/i, /\brule of thirds\b/i, /\bnegative space\b/i, /\bsymmetry\b/i],
  framing: [/\bframing\b/i, /\bclose-up\b/i, /\bwide shot\b/i, /\bhero angle\b/i, /\bcrop\b/i],
  color_palette: [/\bpalette\b/i, /\bcolor palette\b/i, /\btones?\b/i, /\bhue\b/i],
  color_grading: [/\bcolor grading\b/i, /\bgrade\b/i, /\btonal\b/i, /\bfilm look\b/i],
  materials: [/\bmaterial\b/i, /\btexture\b/i, /\bmetal\b/i, /\bglass\b/i, /\bplastic\b/i, /\bfabric\b/i, /\bfinish\b/i],
  styling: [/\bstyling\b/i, /\bwardrobe\b/i, /\bprops?\b/i, /\bset design\b/i],
  retouching: [/\bretouch(?:ing)?\b/i, /\bskin detail\b/i, /\bclean-up\b/i, /\bpost-production\b/i],
  mood: [/\bmood\b/i, /\batmosphere\b/i, /\bemotion\b/i, /\bfeeling\b/i],
  platform_parameters: [/\baspect ratio\b/i, /\bseed\b/i, /\bquality\b/i, /\bresolution\b/i, /\bplatform\b/i, /\bparameters\b/i]
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

function getPromptOutputContractSnapshot(): JsonObject {
  return {
    appliesTo: APP_CONFIG.promptOutputContract.appliesTo,
    minimumFinalPromptWords: APP_CONFIG.promptOutputContract.minimumFinalPromptWords,
    minimumPromptWords: APP_CONFIG.promptOutputContract.minimumPromptWords,
    requireDomainCoverage: APP_CONFIG.promptOutputContract.requireDomainCoverage,
    requiredVisualDomains: [...APP_CONFIG.promptOutputContract.requiredVisualDomains],
    requireDetailedVisualSpecificity: APP_CONFIG.promptOutputContract.requireDetailedVisualSpecificity,
    requireAvoidConstraints: APP_CONFIG.promptOutputContract.requireAvoidConstraints,
    requirePlatformParameters: APP_CONFIG.promptOutputContract.requirePlatformParameters
  };
}

function getCoveredVisualDomains(finalPrompt: string | null) {
  const prompt = finalPrompt ?? "";
  return APP_CONFIG.promptOutputContract.requiredVisualDomains.filter((domain) => {
    const patterns = VISUAL_DOMAIN_PATTERNS[domain] ?? [new RegExp(`\\b${domain.replace(/_/g, " ")}\\b`, "i")];
    return patterns.some((pattern) => pattern.test(prompt));
  });
}

function buildOutputValidationSnapshot(output: GeneratedOutputLike) {
  const minimumFinalPromptWords = APP_CONFIG.promptOutputContract.minimumFinalPromptWords;
  const finalPromptWordCount = countWords(output.final_prompt);
  const hasAvoidConstraints = Boolean(output.avoid_constraints?.trim());
  const hasPlatformParameters = hasNonEmptyJsonObject(output.platform_parameters);
  const hasStructuredOutput = hasNonEmptyJsonObject(output.structured_output);
  const coveredVisualDomains = getCoveredVisualDomains(output.final_prompt);
  const missingVisualDomains = APP_CONFIG.promptOutputContract.requiredVisualDomains.filter(
    (domain) => !coveredVisualDomains.includes(domain)
  );
  const passesMinimumFinalPromptWordCount = finalPromptWordCount >= minimumFinalPromptWords;
  const passesDomainCoverage =
    !APP_CONFIG.promptOutputContract.requireDomainCoverage || missingVisualDomains.length === 0;
  const passesContract =
    passesMinimumFinalPromptWordCount &&
    passesDomainCoverage &&
    (!APP_CONFIG.promptOutputContract.requireAvoidConstraints || hasAvoidConstraints) &&
    (!APP_CONFIG.promptOutputContract.requirePlatformParameters || hasPlatformParameters) &&
    hasStructuredOutput;

  return {
    applies_to: APP_CONFIG.promptOutputContract.appliesTo,
    checked_at: new Date().toISOString(),
    contract: getPromptOutputContractSnapshot(),
    covered_visual_domains: coveredVisualDomains,
    final_prompt_word_count: finalPromptWordCount,
    has_avoid_constraints: hasAvoidConstraints,
    has_platform_parameters: hasPlatformParameters,
    has_structured_output: hasStructuredOutput,
    minimum_final_prompt_words: minimumFinalPromptWords,
    missing_visual_domains: missingVisualDomains,
    passes_contract: passesContract,
    passes_domain_coverage: passesDomainCoverage,
    passes_minimum_final_prompt_word_count: passesMinimumFinalPromptWordCount,
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
        detected_intent: metadata.detected_intent ?? null,
        project_context: metadata.project_context ?? null,
        prompt_output_contract: getPromptOutputContractSnapshot(),
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
