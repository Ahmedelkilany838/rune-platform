import type { ChatApiResponse, ChatMessage } from "@/lib/chat-types";

export const CHAT_HISTORY_STORAGE_KEY = "rune_prompt_sessions_v1";
const LEGACY_CHAT_HISTORY_STORAGE_KEY = "acd_os_chat_sessions_v1";

export type StoredChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  conversationSessionId: string | null;
  messages: ChatMessage[];
  latestResponse: ChatApiResponse | null;
  projectId: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  isTemporary?: boolean;
  temporaryExpiresAt?: string | null;
};

export const PROJECT_STORAGE_KEY = "rune_projects_v1";
const LEGACY_PROJECT_STORAGE_KEY = "acd_os_projects_v1";

export type StoredProject = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  createdAt: string;
  updatedAt: string;
};

function stripMessageRuntimeState(message: ChatMessage): ChatMessage {
  const { animate: _animate, ...persistentMessage } = message;
  return persistentMessage;
}

function stripSessionRuntimeState(session: StoredChatSession): StoredChatSession {
  return {
    ...session,
    messages: session.messages.map(stripMessageRuntimeState)
  };
}

function isStoredChatSession(value: unknown): value is StoredChatSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredChatSession>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.messages)
  );
}

export function loadStoredChatSessions(): StoredChatSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_CHAT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isStoredChatSession)
      .map(stripSessionRuntimeState)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function saveStoredChatSessions(sessions: StoredChatSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(sessions.map(stripSessionRuntimeState)));
}

function isStoredProject(value: unknown): value is StoredProject {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredProject>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.instructions === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

export function loadStoredProjects(): StoredProject[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_PROJECT_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isStoredProject)
      .map((project) => ({ ...project, description: project.description ?? "" }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function saveStoredProjects(projects: StoredProject[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
}

export function createChatTitle(message: string) {
  const trimmed = message.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New brief";
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}...` : trimmed;
}
