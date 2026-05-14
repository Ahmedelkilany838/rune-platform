export const APP_CONFIG = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Rune",
  appSubtitle: "Build here. Execute anywhere.",
  workspaceId: "22222222-2222-4222-8222-222222222222",
  userId: "11111111-1111-4111-8111-111111111111",
  projectId: null,
  intakeChannel: "frontend_chat",
  uiVersion: "phase_1_chat",
  metadataSource: "rune_frontend",
  maxMessageCharacters: 12000,
  webhookTimeoutMs: 120000
} as const;
