export const APP_CONFIG = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Rune",
  appSubtitle: "Build here. Execute anywhere.",
  intakeChannel: "frontend_chat",
  uiVersion: "phase_1_chat",
  metadataSource: "rune_frontend",
  maxMessageCharacters: 12000,
  promptOutputContract: {
    appliesTo: "final_prompt_only",
    minimumFinalPromptWords: 300,
    minimumPromptWords: 300,
    requireDomainCoverage: true,
    requiredVisualDomains: [
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
      "mood",
      "platform_parameters"
    ],
    requireDetailedVisualSpecificity: true,
    requireAvoidConstraints: true,
    requirePlatformParameters: true
  },
  webhookTimeoutMs: 120000
} as const;
