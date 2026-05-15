export const APP_CONFIG = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Rune",
  appSubtitle: "Build here. Execute anywhere.",
  intakeChannel: "frontend_chat",
  uiVersion: "phase_1_chat",
  metadataSource: "rune_frontend",
  maxMessageCharacters: 12000,
  promptOutputContract: {
    minimumPromptWords: 300,
    requireDetailedVisualSpecificity: true,
    requireAvoidConstraints: true,
    requirePlatformParameters: true
  },
  webhookTimeoutMs: 120000
} as const;
