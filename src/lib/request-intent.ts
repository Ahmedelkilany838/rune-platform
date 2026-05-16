export type RequestIntent =
  | "campaign_direction"
  | "character_consistency"
  | "character_sheet"
  | "image_editing"
  | "image_prompt"
  | "key_visual_direction"
  | "product_advertising_visual"
  | "product_locking"
  | "reference_analysis"
  | "retouching_direction"
  | "social_media_visual"
  | "video_prompt"
  | "visual_direction";

export type RequestOutputType =
  | "campaign_direction"
  | "character_sheet"
  | "image_edit_prompt"
  | "image_prompt"
  | "reference_analysis"
  | "retouching_prompt"
  | "social_media_prompt"
  | "video_prompt"
  | "visual_direction";

export type RequestPlatform =
  | "adobe_firefly"
  | "generic_image_model"
  | "generic_video_model"
  | "ideogram"
  | "leonardo"
  | "midjourney"
  | "runway"
  | "sora";

export type DetectedRequestIntent = {
  confidence: number;
  is_product_related: boolean;
  is_reference_related: boolean;
  needs_clarification: boolean;
  output_type: RequestOutputType;
  platform: RequestPlatform;
  request_intent: RequestIntent;
  routing_notes: string[];
};

type IntentSignal = {
  keywords: string[];
  outputType: RequestOutputType;
  platform?: RequestPlatform;
  score: number;
  requestIntent: RequestIntent;
};

const PLATFORM_SIGNALS: Array<{ keywords: string[]; platform: RequestPlatform }> = [
  { keywords: ["midjourney", "--ar", "--style raw", "--v ", "mj"], platform: "midjourney" },
  { keywords: ["sora"], platform: "sora" },
  { keywords: ["runway", "gen-3", "gen 3", "gen-4", "gen 4"], platform: "runway" },
  { keywords: ["firefly", "adobe firefly"], platform: "adobe_firefly" },
  { keywords: ["ideogram"], platform: "ideogram" },
  { keywords: ["leonardo"], platform: "leonardo" }
];

const INTENT_SIGNALS: IntentSignal[] = [
  {
    keywords: ["video", "فيديو", "motion", "camera movement", "frame by frame", "storyboard", "shot sequence", "runway", "sora"],
    outputType: "video_prompt",
    platform: "generic_video_model",
    requestIntent: "video_prompt",
    score: 9
  },
  {
    keywords: ["edit", "تعديل", "retouch", "ريتاتش", "remove", "replace", "cleanup", "background removal", "inpaint", "outpaint"],
    outputType: "image_edit_prompt",
    requestIntent: "image_editing",
    score: 8
  },
  {
    keywords: ["retouching", "retouch", "skin cleanup", "product cleanup", "color correction", "تنضيف", "ريتاتش"],
    outputType: "retouching_prompt",
    requestIntent: "retouching_direction",
    score: 8
  },
  {
    keywords: ["campaign", "kampaign", "حملة", "campaign direction", "campaign plan", "launch campaign"],
    outputType: "campaign_direction",
    requestIntent: "campaign_direction",
    score: 8
  },
  {
    keywords: ["social", "instagram", "facebook", "tiktok", "post", "story", "reel", "سوشيال", "بوست", "ستوري"],
    outputType: "social_media_prompt",
    requestIntent: "social_media_visual",
    score: 7
  },
  {
    keywords: ["character sheet", "شخصية", "character consistency", "same character", "ثبات الشخصية", "model sheet"],
    outputType: "character_sheet",
    requestIntent: "character_sheet",
    score: 7
  },
  {
    keywords: ["reference", "مرجع", "analyze image", "حلل الصورة", "copy lighting", "copy composition", "mood reference"],
    outputType: "reference_analysis",
    requestIntent: "reference_analysis",
    score: 7
  },
  {
    keywords: ["product", "منتج", "packshot", "packaging", "bottle", "jar", "logo", "label", "advertising", "ad visual", "اعلان", "إعلان"],
    outputType: "image_prompt",
    requestIntent: "product_advertising_visual",
    score: 6
  },
  {
    keywords: ["key visual", "kv", "hero visual", "visual identity", "brand visual", "اتجاه بصري"],
    outputType: "visual_direction",
    requestIntent: "key_visual_direction",
    score: 6
  },
  {
    keywords: ["prompt", "برومبت", "بروموت", "image", "صورة", "visual", "مشهد", "photographic", "cinematic"],
    outputType: "image_prompt",
    requestIntent: "image_prompt",
    score: 4
  }
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function detectPlatform(text: string, fallback: RequestPlatform): RequestPlatform {
  for (const signal of PLATFORM_SIGNALS) {
    if (includesAny(text, signal.keywords)) return signal.platform;
  }

  return fallback;
}

function getDefaultPlatform(outputType: RequestOutputType): RequestPlatform {
  if (outputType === "video_prompt") return "generic_video_model";
  return "generic_image_model";
}

function shouldAskClarification(messageText: string, matchedScore: number, outputType: RequestOutputType) {
  const normalized = normalizeText(messageText);
  const words = normalized.split(" ").filter(Boolean);

  if (words.length <= 3 && matchedScore <= 4) return true;
  if (["prompt", "برومبت", "بروموت", "عايز برومبت", "اكتب برومبت"].includes(normalized)) return true;
  if (outputType === "image_prompt" && words.length <= 5 && !includesAny(normalized, ["product", "منتج", "scene", "مشهد", "brand", "براند", "photo", "صورة"])) return true;

  return false;
}

export function detectRequestIntent(args: {
  messageText: string;
  projectContext?: {
    description?: string | null;
    objective?: string | null;
    platforms?: string[] | null;
    project_instructions?: string | null;
    project_name?: string | null;
    project_type?: string | null;
  } | null;
}): DetectedRequestIntent {
  const projectText = args.projectContext
    ? [
        args.projectContext.project_name,
        args.projectContext.project_type,
        args.projectContext.description,
        args.projectContext.objective,
        args.projectContext.project_instructions,
        ...(args.projectContext.platforms ?? [])
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const combinedText = normalizeText(`${args.messageText} ${projectText}`);
  const matched = INTENT_SIGNALS
    .filter((signal) => includesAny(combinedText, signal.keywords))
    .sort((a, b) => b.score - a.score)[0];

  const outputType = matched?.outputType ?? "image_prompt";
  const defaultPlatform = matched?.platform ?? getDefaultPlatform(outputType);
  const platform = detectPlatform(combinedText, defaultPlatform);
  const matchedScore = matched?.score ?? 3;
  const requestIntent = matched?.requestIntent ?? "image_prompt";
  const needsClarification = shouldAskClarification(args.messageText, matchedScore, outputType);
  const isProductRelated = includesAny(combinedText, ["product", "منتج", "packshot", "packaging", "label", "logo", "bottle", "jar", "اعلان", "إعلان"]);
  const isReferenceRelated = includesAny(combinedText, ["reference", "مرجع", "ref", "image reference", "copy lighting", "copy composition"]);

  return {
    confidence: Math.min(0.95, Math.max(0.35, matchedScore / 10)),
    is_product_related: isProductRelated,
    is_reference_related: isReferenceRelated,
    needs_clarification: needsClarification,
    output_type: outputType,
    platform,
    request_intent: requestIntent,
    routing_notes: [
      `matched_intent:${requestIntent}`,
      `selected_output_type:${outputType}`,
      `selected_platform:${platform}`,
      needsClarification ? "clarification_recommended:true" : "clarification_recommended:false"
    ]
  };
}
