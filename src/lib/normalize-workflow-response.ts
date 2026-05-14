import type { ChatApiResponse } from "@/lib/chat-types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unwrapN8nItem(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.length > 0 ? unwrapN8nItem(value[0]) : {};
  }

  if (isRecord(value) && isRecord(value.json)) {
    return value.json;
  }

  return value;
}

function recordOrNull(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function getRecord(source: UnknownRecord | null, key: string): UnknownRecord | null {
  if (!source) return null;
  return recordOrNull(source[key]);
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    const picked = getString(value);
    if (picked) return picked;
  }

  return null;
}

function wf10Status(value: unknown): "generated" | "failed" | null {
  if (value === "generated" || value === "failed") return value;
  return null;
}

function hasWf10Fields(value: UnknownRecord | null) {
  if (!value) return false;
  return (
    "wf10_status" in value ||
    "generated_output_id" in value ||
    "generation_layer" in value ||
    Boolean(getRecord(value, "debug"))
  );
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function objectField(value: unknown): Record<string, unknown> | null {
  const parsed = parseMaybeJson(value);

  if (parsed === null || parsed === undefined) return null;
  if (isRecord(parsed)) return parsed;

  return { raw: parsed };
}

function arrayField(value: unknown): unknown[] | null {
  const parsed = parseMaybeJson(value);

  if (parsed === null || parsed === undefined) return null;
  if (Array.isArray(parsed)) return parsed;
  if (isRecord(parsed)) return [parsed];

  return [{ raw: parsed }];
}

function collectErrors(...sources: unknown[]) {
  const errors: string[] = [];

  for (const source of sources) {
    if (Array.isArray(source)) {
      for (const item of source) {
        if (typeof item === "string" && item.trim()) errors.push(item.trim());
        else if (isRecord(item)) errors.push(JSON.stringify(item));
      }
      continue;
    }

    if (typeof source === "string" && source.trim()) {
      errors.push(source.trim());
    } else if (isRecord(source) && typeof source.message === "string") {
      errors.push(source.message);
    }
  }

  return [...new Set(errors)];
}

function createRawObject(value: unknown) {
  return value ?? {};
}

export function normalizeWorkflowResponse(input: unknown): ChatApiResponse {
  const root = recordOrNull(unwrapN8nItem(input)) ?? {};
  const wf01Result = getRecord(root, "wf01_result");
  const wf10Result = getRecord(root, "wf10_result");
  const topLevelWf10 = hasWf10Fields(root) ? root : null;
  const wf10Source = wf10Result ?? topLevelWf10;
  const wf10Debug = getRecord(wf10Source, "debug") ?? getRecord(root, "debug");
  const generatedOutput =
    getRecord(wf10Debug, "create_generated_output_raw") ??
    getRecord(root, "create_generated_output_raw");

  const structuredOutput = objectField(generatedOutput?.structured_output);
  const usedKnowledgeBlocks = arrayField(generatedOutput?.used_knowledge_blocks);

  return {
    ok: true,
    message_to_user: pickString(root.message_to_user, getRecord(root, "composer_result")?.message_to_user),
    conversation_session_id: pickString(root.conversation_session_id, wf01Result?.conversation_session_id),
    prompt_request_id: pickString(
      wf10Source?.prompt_request_id,
      root.prompt_request_id,
      wf01Result?.prompt_request_id,
      generatedOutput?.prompt_request_id
    ),
    generated_output_id: pickString(wf10Source?.generated_output_id, root.generated_output_id, generatedOutput?.id),
    wf10_status: wf10Status(wf10Source?.wf10_status ?? root.wf10_status),
    output_type: pickString(wf10Source?.output_type, generatedOutput?.output_type, root.output_type, wf01Result?.output_type),
    platform: pickString(wf10Source?.platform, root.platform, wf01Result?.platform),
    generation_layer: pickString(wf10Source?.generation_layer, structuredOutput?.generation_layer),
    next_workflow: pickString(wf10Source?.next_workflow, root.next_workflow, wf01Result?.next_workflow),
    generated_prompt: pickString(generatedOutput?.final_prompt, root.final_prompt, wf10Source?.final_prompt),
    avoid_constraints: pickString(generatedOutput?.avoid_constraints, root.avoid_constraints, wf10Source?.avoid_constraints),
    structured_output: structuredOutput,
    used_knowledge_blocks: usedKnowledgeBlocks,
    validation_status: pickString(generatedOutput?.validation_status, structuredOutput?.validation_status),
    status: pickString(generatedOutput?.status, structuredOutput?.status, root.status, root.wf_status),
    errors: collectErrors(root.errors, wf01Result?.errors, wf10Source?.errors, root.error),
    raw: createRawObject(input)
  };
}
