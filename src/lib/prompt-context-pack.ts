import type { JsonObject, JsonValue } from "@/lib/chat-types";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type QueryableSupabase = {
  from: (table: string) => {
    select: (columns: string) => QueryBuilder;
  };
};

type QueryBuilder = {
  eq: (column: string, value: unknown) => QueryBuilder;
  limit: (count: number) => Promise<QueryResult>;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => QueryBuilder;
};

type QueryResult = {
  data: unknown[] | null;
  error: unknown;
};

type DomainRetrievalConfig = {
  domain: string;
  limit: number;
  select: string;
  table: string;
};

type PromptContextPackArgs = {
  messageText: string;
  outputType?: string | null;
  platform?: string | null;
  projectContext?: JsonObject | null;
  supabase: SupabaseServerClient;
};

const DOMAIN_RETRIEVAL_CONFIGS: DomainRetrievalConfig[] = [
  {
    domain: "lighting",
    table: "lighting_profiles",
    limit: 3,
    select: "id, knowledge_block_id, name, category, subcategory, lighting_family, source_type, direction, softness, intensity, shadow_behavior, highlight_behavior, material_effect, mood_effect, prompt_fragment, failure_risks, repair_notes, tags"
  },
  {
    domain: "shadow",
    table: "shadow_profiles",
    limit: 2,
    select: "id, knowledge_block_id, name, category, subcategory, shadow_type, edge_hardness, density, direction, contact_shadow_behavior, cast_shadow_behavior, grounding_effect, realism_effect, prompt_fragment, failure_risks, repair_notes, tags"
  },
  {
    domain: "camera",
    table: "camera_bodies",
    limit: 2,
    select: "id, knowledge_block_id, name, category, subcategory, brand, model, camera_type, visual_association, color_science_notes, dynamic_range_notes, prompt_fragment, tags"
  },
  {
    domain: "sensor",
    table: "sensor_profiles",
    limit: 2,
    select: "id, name, category, subcategory, sensor_name, sensor_size, depth_of_field_effect, field_of_view_effect, noise_behavior, dynamic_range_feel, image_character, tags"
  },
  {
    domain: "lens",
    table: "lens_profiles",
    limit: 3,
    select: "id, knowledge_block_id, name, category, subcategory, lens_family, focal_length_mm, focal_range, typical_aperture, field_of_view, distortion_behavior, compression_behavior, depth_of_field_behavior, bokeh_behavior, product_effect, scene_effect, prompt_fragment, ai_failure_risks, repair_notes, tags"
  },
  {
    domain: "composition",
    table: "composition_patterns",
    limit: 3,
    select: "id, knowledge_block_id, name, category, subcategory, composition_type, hero_placement, primary_read, balance_type, negative_space_usage, text_space_position, safe_zone_behavior, layering_strategy, emotional_effect, attention_flow, prompt_fragment, failure_risks, repair_notes, tags"
  },
  {
    domain: "framing",
    table: "framing_profiles",
    limit: 3,
    select: "id, knowledge_block_id, name, category, subcategory, framing_name, crop_style, subject_position, safe_zone_notes, hero_scale, edge_margin_rules, platform_considerations, prompt_fragment, failure_risks, repair_notes, tags"
  },
  {
    domain: "camera_angle",
    table: "camera_angle_profiles",
    limit: 2,
    select: "id, knowledge_block_id, name, category, subcategory, angle_name, camera_height, camera_tilt, subject_relation, perspective_effect, emotional_effect, product_effect, distortion_risk, prompt_fragment, failure_risks, repair_notes, tags"
  },
  {
    domain: "shot_type",
    table: "shot_type_profiles",
    limit: 2,
    select: "id, knowledge_block_id, name, category, subcategory, shot_name, shot_family, subject_scale_in_frame, camera_distance, environment_visibility, emotional_distance, prompt_fragment, failure_risks, repair_notes, tags"
  },
  {
    domain: "color_palette",
    table: "color_palettes",
    limit: 2,
    select: "id, knowledge_block_id, name, category, subcategory, palette_name, dominant_colors, secondary_colors, accent_colors, harmony_type, saturation_level, brightness_level, contrast_level, warmth_coolness, psychological_effect, mood_effect, prompt_fragment, avoid_cases, tags"
  },
  {
    domain: "color_grading",
    table: "color_grading_profiles",
    limit: 2,
    select: "id, knowledge_block_id, name, category, subcategory, grading_style, contrast_curve, black_level, white_level, highlight_behavior, shadow_tint, midtone_behavior, saturation_behavior, skin_tone_policy, film_grain, final_finish, prompt_fragment, failure_risks, repair_notes, tags"
  },
  {
    domain: "materials",
    table: "material_profiles",
    limit: 3,
    select: "id, knowledge_block_id, name, category, subcategory, material_name, material_family, roughness, reflectivity, metallic_level, transparency, texture_type, highlight_behavior, reflection_behavior, shadow_behavior, best_lighting, bad_lighting, prompt_fragment, common_ai_failures, repair_notes, tags"
  },
  {
    domain: "styling",
    table: "styling_profiles",
    limit: 2,
    select: "id, knowledge_block_id, name, category, subcategory, styling_type, wardrobe_logic, prop_logic, surface_logic, color_coordination, texture_coordination, brand_fit, culture_fit, prompt_fragment, failure_risks, repair_notes, tags"
  },
  {
    domain: "retouching",
    table: "retouching_profiles",
    limit: 2,
    select: "id, knowledge_block_id, name, category, subcategory, retouching_type, subject_type, visible_result, texture_policy, skin_policy, product_policy, material_policy, color_policy, avoid_constraints, prompt_fragment, failure_risks, repair_notes, tags"
  }
];

function asJsonObject(value: unknown): JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function getQueryableSupabase(supabase: SupabaseServerClient): QueryableSupabase {
  return supabase as unknown as QueryableSupabase;
}

function normalizeRows(rows: unknown[] | null) {
  return (rows ?? []).map((row) => asJsonObject(row));
}

async function fetchDomainRows(supabase: QueryableSupabase, config: DomainRetrievalConfig) {
  try {
    const result = await supabase
      .from(config.table)
      .select(config.select)
      .eq("active", true)
      .order("confidence_score", { ascending: false, nullsFirst: false })
      .limit(config.limit);

    return {
      domain: config.domain,
      rows: normalizeRows(result.data)
    };
  } catch {
    return {
      domain: config.domain,
      rows: []
    };
  }
}

async function fetchRuleRows(supabase: QueryableSupabase, outputType: string | null | undefined, platform: string | null | undefined) {
  const [templates, writingRules, assemblyRules, validationRules, platformRules, knowledgeBlocks] = await Promise.all([
    supabase.from("prompt_templates").select("id, template_name, output_type, platform, structure, required_sections, optional_sections, variables, word_count_min, word_count_max, final_prompt_style, language").eq("active", true).order("created_at", { ascending: false }).limit(5),
    supabase.from("prompt_writing_rules").select("id, rule_name, rule_category, description, applies_to_output_types, applies_to_platforms, priority, example_good, example_bad, repair_instruction").eq("active", true).order("priority", { ascending: true }).limit(12),
    supabase.from("prompt_assembly_rules").select("id, output_type, section_order, section_name, required, data_source_domain, writing_instruction, fallback_behavior").eq("active", true).order("section_order", { ascending: true }).limit(20),
    supabase.from("prompt_validation_rules").select("id, rule_name, output_type, check_type, severity, validation_logic, failure_message, repair_instruction").eq("active", true).order("created_at", { ascending: false }).limit(12),
    supabase.from("platform_rules").select("id, platform_name, platform_type, prompt_syntax, supports_negative_prompt, aspect_ratio_rules, recommended_prompt_length, parameter_rules, strengths, weaknesses, avoid_terms, best_practices").eq("active", true).order("created_at", { ascending: false }).limit(8),
    supabase.from("creative_knowledge_blocks").select("id, title, domain, category, subcategory, definition, use_when, avoid_when, visual_effect, physical_description, prompt_fragment, avoid_constraints, compatible_output_types, compatible_platforms, compatible_industries, compatible_moods, required_inputs, missing_input_defaults, failure_risks, repair_notes, tags").eq("active", true).order("confidence_score", { ascending: false, nullsFirst: false }).limit(16)
  ]);

  return {
    output_type_hint: outputType ?? null,
    platform_hint: platform ?? null,
    prompt_templates: normalizeRows(templates.data),
    prompt_writing_rules: normalizeRows(writingRules.data),
    prompt_assembly_rules: normalizeRows(assemblyRules.data),
    prompt_validation_rules: normalizeRows(validationRules.data),
    platform_rules: normalizeRows(platformRules.data),
    creative_knowledge_blocks: normalizeRows(knowledgeBlocks.data)
  };
}

export async function buildPromptContextPack({ messageText, outputType, platform, projectContext, supabase }: PromptContextPackArgs): Promise<JsonObject> {
  const queryableSupabase = getQueryableSupabase(supabase);
  const domainResults = await Promise.all(
    DOMAIN_RETRIEVAL_CONFIGS.map((config) => fetchDomainRows(queryableSupabase, config))
  );
  const rules = await fetchRuleRows(queryableSupabase, outputType, platform);
  const domains: JsonObject = {};
  const usedKnowledgeBlockIds: string[] = [];

  for (const result of domainResults) {
    domains[result.domain] = result.rows as unknown as JsonValue;
    for (const row of result.rows) {
      const knowledgeBlockId = row.knowledge_block_id;
      if (typeof knowledgeBlockId === "string" && knowledgeBlockId) {
        usedKnowledgeBlockIds.push(knowledgeBlockId);
      }
    }
  }

  for (const row of rules.creative_knowledge_blocks) {
    const id = row.id;
    if (typeof id === "string" && id) usedKnowledgeBlockIds.push(id);
  }

  return {
    assembly_contract: {
      final_prompt_only: true,
      must_integrate_domains_as_natural_prompt_language: true,
      must_not_list_domains_as_empty_keywords: true,
      must_use_physical_visual_language: true,
      minimum_final_prompt_words: 300,
      required_domains: [
        "lighting",
        "shadow",
        "camera",
        "lens",
        "composition",
        "framing",
        "color_palette",
        "color_grading",
        "materials",
        "styling",
        "retouching",
        "platform_parameters"
      ]
    },
    domains,
    input_snapshot: {
      message_text: messageText,
      output_type: outputType ?? null,
      platform: platform ?? null,
      project_context: projectContext ?? null
    },
    retrieval_counts: Object.fromEntries(domainResults.map((result) => [result.domain, result.rows.length])),
    rules: rules as unknown as JsonValue,
    used_knowledge_block_ids: [...new Set(usedKnowledgeBlockIds)]
  };
}
