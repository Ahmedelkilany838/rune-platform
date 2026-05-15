"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChatApiResponse, ChatMessage, ConnectionStatus, JsonObject, JsonValue } from "@/lib/chat-types";
import { createChatTitle, loadStoredChatSessions, saveStoredChatSessions, type StoredChatSession, type StoredProject } from "@/lib/chat-storage";
import { cn, createClientId } from "@/lib/utils";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Sidebar } from "@/components/workspace/sidebar";
import { Topbar } from "@/components/workspace/topbar";
import { NewProjectModal } from "@/components/workspace/new-project-modal";
import { ProjectDashboard } from "@/components/workspace/project-dashboard";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/auth/app-user";

const APP_SHELL_BASE_ROUTES = ["/chat", "/conversations", "/outputs"] as const;
type AppShellBaseRoute = (typeof APP_SHELL_BASE_ROUTES)[number];

type ConversationsApiResponse = { ok: true; sessions: StoredChatSession[] } | { error: string; ok: false };
type ProjectsApiResponse = { ok: true; projects: StoredProject[] } | { error: string; ok: false };
type CreateProjectApiResponse = { ok: true; project: StoredProject } | { error: string; ok: false };
type UpdateConversationPayload = { isArchived?: boolean; isPinned?: boolean; projectId?: string | null; status?: "active" | "archived" | "deleted"; title?: string };
type UpdateConversationApiResponse = { ok: true; session: unknown } | { error: string; ok: false };
type ConversationMessagesApiResponse = { messages: ChatMessage[]; ok: true } | { error: string; ok: false };

type GeneratedOutputData = {
  avoid_constraints: string | null;
  created_at: string;
  final_prompt: string | null;
  generation_metadata: JsonObject | null;
  id: string;
  output_type: string | null;
  platform_parameters: JsonObject | null;
  prompt_request_id: string;
  quality_score: number | null;
  status: string | null;
  structured_output: JsonObject | null;
  updated_at: string;
  used_knowledge_blocks: JsonValue[] | null;
  used_platform_rules: JsonObject | null;
  used_prompt_rules: JsonValue[] | null;
  validation_status: string | null;
};

type GeneratedOutputApiResponse = { ok: true; output: GeneratedOutputData } | { error: string; ok: false };
type CanonicalOutputResolutionRequest = { conversationSessionId: string | null; generatedOutputId: string | null; messageText: string; promptRequestId: string | null; submittedAt: string };

const CANONICAL_OUTPUT_RETRY_DELAYS = [0, 1500, 3000, 5000, 8000, 12000] as const;
const TEMP_CHAT_PREFIX = "chat-";

function getAppShellBaseRoute(pathname: string): AppShellBaseRoute {
  return APP_SHELL_BASE_ROUTES.includes(pathname as AppShellBaseRoute) ? (pathname as AppShellBaseRoute) : "/chat";
}

function getSessionCanonicalKey(session: StoredChatSession) {
  return session.conversationSessionId ?? session.id;
}

function isTemporarySessionId(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(TEMP_CHAT_PREFIX);
}

function dedupeSessions(sessions: StoredChatSession[]) {
  const sorted = [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const seen = new Set<string>();
  const result: StoredChatSession[] = [];

  for (const session of sorted) {
    const canonicalKey = getSessionCanonicalKey(session);
    const titleKey = [session.projectId ?? "global", session.title.trim().toLowerCase(), session.createdAt].join("|");
    const keys = [canonicalKey, titleKey].filter(Boolean);
    if (keys.some((key) => seen.has(key))) continue;
    keys.forEach((key) => seen.add(key));
    result.push(session);
  }

  return result;
}

async function loadConversationSessionsFromApi(): Promise<StoredChatSession[] | null> {
  try {
    const response = await fetch("/api/conversations", { method: "GET", headers: { Accept: "application/json" } });
    const result = (await response.json()) as ConversationsApiResponse;
    return response.ok && result.ok ? result.sessions : null;
  } catch {
    return null;
  }
}

async function loadProjectsFromApi(): Promise<StoredProject[] | null> {
  try {
    const response = await fetch("/api/projects", { method: "GET", headers: { Accept: "application/json" } });
    const result = (await response.json()) as ProjectsApiResponse;
    return response.ok && result.ok ? result.projects : null;
  } catch {
    return null;
  }
}

async function createProjectFromApi(name: string, description: string, instructions: string): Promise<StoredProject> {
  const response = await fetch("/api/projects", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ name, description, instructions }) });
  const result = (await response.json()) as CreateProjectApiResponse;
  if (!response.ok || !result.ok) throw new Error("project_create_failed");
  return result.project;
}

async function updateConversationSessionApi(sessionId: string, payload: UpdateConversationPayload) {
  const response = await fetch(`/api/conversations/${encodeURIComponent(sessionId)}`, { method: "PATCH", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const result = (await response.json()) as UpdateConversationApiResponse;
  if (!response.ok || !result.ok) throw new Error(result.ok ? "conversation_update_failed" : result.error);
}

async function fetchConversationMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/conversations/${encodeURIComponent(sessionId)}/messages`, { method: "GET", headers: { Accept: "application/json" } });
  const result = (await response.json()) as ConversationMessagesApiResponse;
  if (!response.ok || !result.ok) throw new Error("conversation_messages_fetch_failed");
  return result.messages;
}

async function resolveGeneratedOutputFromApi(resolutionRequest: CanonicalOutputResolutionRequest): Promise<GeneratedOutputData | null> {
  try {
    const response = await fetch("/api/generated-outputs/resolve", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ conversation_session_id: resolutionRequest.conversationSessionId, generated_output_id: resolutionRequest.generatedOutputId, message_text: resolutionRequest.messageText, prompt_request_id: resolutionRequest.promptRequestId, submitted_at: resolutionRequest.submittedAt }) });
    const result = (await response.json()) as GeneratedOutputApiResponse;
    return response.ok && result.ok ? result.output : null;
  } catch {
    return null;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function resolveCanonicalGeneratedOutput(resolutionRequest: CanonicalOutputResolutionRequest): Promise<GeneratedOutputData | null> {
  if (!resolutionRequest.generatedOutputId && !resolutionRequest.promptRequestId && !resolutionRequest.messageText.trim()) return null;
  for (const retryDelay of CANONICAL_OUTPUT_RETRY_DELAYS) {
    if (retryDelay > 0) await delay(retryDelay);
    const output = await resolveGeneratedOutputFromApi(resolutionRequest);
    if (output?.final_prompt) return output;
  }
  return null;
}

function enrichResponseWithGeneratedOutput(response: ChatApiResponse, output: GeneratedOutputData): ChatApiResponse {
  return { ...response, generated_output_id: output.id, prompt_request_id: output.prompt_request_id, generated_prompt: output.final_prompt ?? response.generated_prompt, avoid_constraints: output.avoid_constraints, structured_output: output.structured_output, used_knowledge_blocks: output.used_knowledge_blocks, validation_status: output.validation_status, status: output.status, output_type: output.output_type };
}

function getAssistantMessageContent(response: ChatApiResponse) {
  if (!response.generated_prompt) return response.message_to_user;
  const sections = [`Prompt:\n\n${response.generated_prompt}`];
  if (response.avoid_constraints) sections.push(`Avoid:\n\n${response.avoid_constraints}`);
  return sections.join("\n\n");
}

async function resolveFinalAssistantResponse({ response, messageText, submittedAt }: { response: ChatApiResponse; messageText: string; submittedAt: string }) {
  if (!response.ok) return response;
  const output = await resolveCanonicalGeneratedOutput({ conversationSessionId: response.conversation_session_id, generatedOutputId: response.generated_output_id, messageText, promptRequestId: response.prompt_request_id, submittedAt });
  return output?.final_prompt ? enrichResponseWithGeneratedOutput(response, output) : response;
}

export function AppShell({ user }: { user: AppUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generatingChatIds, setGeneratingChatIds] = useState<string[]>([]);
  const [latestResponse, setLatestResponse] = useState<ChatApiResponse | null>(null);
  const [conversationSessionId, setConversationSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("not_tested");
  const [composerValue, setComposerValue] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatSessions, setChatSessions] = useState<StoredChatSession[]>([]);
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showProjectDashboard, setShowProjectDashboard] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);

  const activeChatIdRef = useRef<string | null>(null);
  const chatSessionsRef = useRef<StoredChatSession[]>([]);
  const visibleChatSessions = useMemo(() => dedupeSessions(chatSessions), [chatSessions]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    chatSessionsRef.current = chatSessions;
  }, [chatSessions]);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialState() {
      const [apiSessions, apiProjects] = await Promise.all([loadConversationSessionsFromApi(), loadProjectsFromApi()]);
      const loadedChats = dedupeSessions(apiSessions ?? loadStoredChatSessions());
      if (cancelled) return;
      chatSessionsRef.current = loadedChats;
      setChatSessions(loadedChats);
      setProjects(apiProjects ?? []);
      saveStoredChatSessions(loadedChats);
      setIsLoaded(true);
    }
    void loadInitialState();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const urlChat = searchParams.get("chat");
    const urlProject = searchParams.get("project");
    const urlTemporaryChat = searchParams.get("temporary-chat") === "true";
    if (urlTemporaryChat) {
      setIsTemporaryChat(true);
      if (!activeChatId && !activeProjectId) return;
      clearChatView({ keepProject: false });
      return;
    }
    setIsTemporaryChat(false);
    if (urlChat && urlChat !== activeChatId) {
      const session = chatSessionsRef.current.find((s) => s.id === urlChat || s.conversationSessionId === urlChat);
      if (session) void selectChatSession(session.id, { updateRoute: false });
      else {
        clearChatView({ keepProject: false });
        updateUrl(null, null);
      }
    } else if (urlProject && urlProject !== activeProjectId && !urlChat) {
      setActiveProjectId(urlProject);
      setActiveChatId(null);
      activeChatIdRef.current = null;
      setMessages([]);
      setConversationSessionId(null);
      setLatestResponse(null);
      setConnectionStatus("not_tested");
      setShowProjectDashboard(true);
    } else if (!urlChat && !urlProject && (activeChatId || activeProjectId)) {
      clearChatView({ keepProject: false });
    }
  }, [isLoaded, searchParams, chatSessions.length, activeChatId, activeProjectId]);

  function updateUrl(chat: string | null, project: string | null, temporaryChat = isTemporaryChat) {
    const params = new URLSearchParams();
    if (temporaryChat) params.set("temporary-chat", "true");
    else {
      if (chat) params.set("chat", chat);
      if (project) params.set("project", project);
    }
    const query = params.toString();
    const basePath = getAppShellBaseRoute(pathname);
    router.push((query ? `${basePath}?${query}` : basePath) as Route);
  }

  function persistSessions(nextSessions: StoredChatSession[]) {
    const sortedSessions = dedupeSessions(nextSessions);
    chatSessionsRef.current = sortedSessions;
    setChatSessions(sortedSessions);
    saveStoredChatSessions(sortedSessions);
  }

  function persistConversationMetadata(chatId: string, payload: UpdateConversationPayload) {
    const session = chatSessionsRef.current.find((item) => sessionsMatch(item, chatId, chatId));
    const sessionId = session?.conversationSessionId ?? session?.id ?? chatId;
    if (isTemporarySessionId(sessionId)) return;
    void updateConversationSessionApi(sessionId, payload).catch(() => {
      void reloadConversationSessions();
    });
  }

  async function reloadConversationSessions() {
    const apiSessions = await loadConversationSessionsFromApi();
    if (!apiSessions) return;
    persistSessions(apiSessions);
  }

  function sessionsMatch(session: StoredChatSession, chatId: string | null, conversationId: string | null) {
    return (Boolean(chatId) && session.id === chatId) || (Boolean(chatId) && session.conversationSessionId === chatId) || (Boolean(conversationId) && session.id === conversationId) || (Boolean(conversationId) && session.conversationSessionId === conversationId);
  }

  function clearChatView({ keepProject }: { keepProject: boolean }) {
    activeChatIdRef.current = null;
    setActiveChatId(null);
    if (!keepProject) setActiveProjectId(null);
    setMessages([]);
    setConversationSessionId(null);
    setLatestResponse(null);
    setConnectionStatus("not_tested");
    setShowProjectDashboard(false);
    setComposerValue("");
  }

  function startNewChat() {
    if (isTemporaryChat) {
      clearChatView({ keepProject: false });
      updateUrl(null, null, true);
      return;
    }
    const projectId = activeProjectId;
    clearChatView({ keepProject: true });
    setActiveProjectId(projectId);
    setShowProjectDashboard(Boolean(projectId));
    updateUrl(null, projectId, false);
  }

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      window.location.assign("/");
    }
  }

  async function handleCreateProject(name: string, description: string, instructions: string) {
    const newProject = await createProjectFromApi(name, description, instructions);
    setProjects([newProject, ...projects.filter((project) => project.id !== newProject.id)]);
    setActiveProjectId(newProject.id);
    setIsProjectModalOpen(false);
    setShowProjectDashboard(true);
    setActiveChatId(null);
    activeChatIdRef.current = null;
    setMessages([]);
    setConversationSessionId(null);
    setLatestResponse(null);
    setConnectionStatus("not_tested");
    setComposerValue("");
    updateUrl(null, newProject.id);
  }

  function updateSession(session: StoredChatSession, replacedChatId?: string | null) {
    const withoutCurrent = chatSessionsRef.current.filter((item) => !sessionsMatch(item, session.id, session.conversationSessionId) && !(replacedChatId && sessionsMatch(item, replacedChatId, replacedChatId)));
    persistSessions([session, ...withoutCurrent]);
  }

  async function selectChatSession(sessionId: string, options: { updateRoute?: boolean } = {}) {
    const session = chatSessionsRef.current.find((s) => s.id === sessionId || s.conversationSessionId === sessionId);
    if (!session) return;
    const shouldUpdateRoute = options.updateRoute ?? true;
    const messageSessionId = session.conversationSessionId ?? session.id;
    activeChatIdRef.current = session.id;
    setIsTemporaryChat(false);
    setActiveChatId(session.id);
    setActiveProjectId(session.projectId);
    setShowProjectDashboard(false);
    setMessages(session.messages);
    setConversationSessionId(session.conversationSessionId);
    setLatestResponse(session.latestResponse);
    setConnectionStatus(session.latestResponse ? (session.latestResponse.ok ? "connected" : "error") : "not_tested");
    setComposerValue("");
    if (shouldUpdateRoute) updateUrl(session.id, session.projectId, false);
    if (isTemporarySessionId(messageSessionId)) return;
    try {
      const fetchedMessages = await fetchConversationMessages(messageSessionId);
      const currentSession = chatSessionsRef.current.find((item) => item.id === session.id || item.conversationSessionId === messageSessionId);
      if (currentSession) updateSession({ ...currentSession, messages: fetchedMessages, latestResponse: null });
      if (activeChatIdRef.current === session.id) {
        setMessages(fetchedMessages);
        setLatestResponse(null);
        setConnectionStatus("not_tested");
      }
    } catch {
      if (activeChatIdRef.current === session.id) setMessages([{ id: createClientId("error"), role: "error", content: "Could not load this conversation from Supabase.", createdAt: new Date().toISOString() }]);
    }
  }

  function handleDeleteChat(chatId: string) {
    const next = chatSessionsRef.current.filter((session) => !sessionsMatch(session, chatId, chatId));
    persistSessions(next);
    persistConversationMetadata(chatId, { status: "deleted" });
    if (activeChatId === chatId) {
      if (activeProjectId) {
        clearChatView({ keepProject: true });
        setShowProjectDashboard(true);
        updateUrl(null, activeProjectId);
      } else {
        clearChatView({ keepProject: false });
        updateUrl(null, null);
      }
    }
  }

  function handleRenameChat(chatId: string, newTitle: string) {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;
    persistSessions(chatSessionsRef.current.map((session) => (sessionsMatch(session, chatId, chatId) ? { ...session, title: trimmedTitle, updatedAt: new Date().toISOString() } : session)));
    persistConversationMetadata(chatId, { title: trimmedTitle });
  }

  function handleMoveChat(chatId: string, newProjectId: string | null) {
    persistSessions(chatSessionsRef.current.map((session) => (sessionsMatch(session, chatId, chatId) ? { ...session, projectId: newProjectId, updatedAt: new Date().toISOString() } : session)));
    persistConversationMetadata(chatId, { projectId: newProjectId });
  }

  function handleTogglePinChat(chatId: string) {
    const targetSession = chatSessionsRef.current.find((session) => sessionsMatch(session, chatId, chatId));
    const nextPinned = !targetSession?.isPinned;
    persistSessions(chatSessionsRef.current.map((session) => (sessionsMatch(session, chatId, chatId) ? { ...session, isPinned: nextPinned, updatedAt: new Date().toISOString() } : session)));
    persistConversationMetadata(chatId, { isPinned: nextPinned });
  }

  function handleToggleArchiveChat(chatId: string) {
    const targetSession = chatSessionsRef.current.find((session) => sessionsMatch(session, chatId, chatId));
    const nextArchived = !targetSession?.isArchived;
    persistSessions(chatSessionsRef.current.map((session) => (sessionsMatch(session, chatId, chatId) ? { ...session, isArchived: nextArchived, updatedAt: new Date().toISOString() } : session)));
    persistConversationMetadata(chatId, { isArchived: nextArchived, status: nextArchived ? "archived" : "active" });
    if (activeChatId === chatId) {
      clearChatView({ keepProject: Boolean(activeProjectId) });
      if (activeProjectId) {
        setShowProjectDashboard(true);
        updateUrl(null, activeProjectId);
      } else updateUrl(null, null);
    }
  }

  function upsertChatSession({ chatId, nextConversationSessionId, nextLatestResponse, nextMessages, titleSource }: { chatId: string; nextConversationSessionId: string | null; nextLatestResponse: ChatApiResponse | null; nextMessages: ChatMessage[]; titleSource?: string }) {
    const now = new Date().toISOString();
    const id = nextConversationSessionId ?? chatId;
    const existingSession = chatSessionsRef.current.find((session) => sessionsMatch(session, chatId, nextConversationSessionId));
    const title = existingSession?.title && !["New chat", "New brief"].includes(existingSession.title) ? existingSession.title : createChatTitle(titleSource ?? "");
    const nextSession: StoredChatSession = { id, title, createdAt: existingSession?.createdAt ?? now, updatedAt: now, conversationSessionId: nextConversationSessionId, messages: nextMessages, latestResponse: nextLatestResponse, projectId: existingSession?.projectId ?? activeProjectId, isPinned: existingSession?.isPinned, isArchived: existingSession?.isArchived, isTemporary: isTemporaryChat, temporaryExpiresAt: isTemporaryChat ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null };
    if (isTemporaryChat) {
      if (activeChatIdRef.current === chatId || activeChatIdRef.current === nextConversationSessionId) {
        activeChatIdRef.current = id;
        setActiveChatId(id);
        updateUrl(null, null, true);
      }
      return nextSession;
    }
    updateSession(nextSession, chatId);
    if (activeChatIdRef.current === chatId || activeChatIdRef.current === nextConversationSessionId) {
      activeChatIdRef.current = id;
      setActiveChatId(id);
      if (id !== chatId) updateUrl(id, nextSession.projectId ?? activeProjectId, false);
    }
    return nextSession;
  }

  async function submitMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const requestChatId = activeChatId ?? createClientId("chat");
    const requestConversationSessionId = conversationSessionId;
    const baseSession = chatSessionsRef.current.find((session) => session.id === requestChatId || session.conversationSessionId === requestConversationSessionId) ?? ({ id: requestChatId, title: createChatTitle(trimmed), createdAt: now, updatedAt: now, conversationSessionId: requestConversationSessionId, messages: [], latestResponse: null, projectId: activeProjectId } satisfies StoredChatSession);
    const userMessage: ChatMessage = { id: createClientId("user"), role: "user", content: trimmed, createdAt: new Date().toISOString() };
    const messagesWithUser = [...baseSession.messages, userMessage];
    if (!activeChatId) {
      activeChatIdRef.current = requestChatId;
      setActiveChatId(requestChatId);
    }
    setShowProjectDashboard(false);
    setMessages(messagesWithUser);
    upsertChatSession({ chatId: requestChatId, nextConversationSessionId: requestConversationSessionId, nextLatestResponse: baseSession.latestResponse, nextMessages: messagesWithUser, titleSource: trimmed });
    setGeneratingChatIds((current) => (current.includes(requestChatId) ? current : [...current, requestChatId]));
    try {
      const response = await fetch("/api/chat/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message_text: trimmed, conversation_session_id: requestConversationSessionId, project_id: activeProjectId, is_temporary: isTemporaryChat }) });
      const data = (await response.json()) as ChatApiResponse;
      const nextConversationSessionId = data.conversation_session_id ?? requestConversationSessionId;
      const nextConnectionStatus = response.ok && data.ok ? "connected" : "error";
      const latestRequestSession = chatSessionsRef.current.find((session) => sessionsMatch(session, requestChatId, nextConversationSessionId)) ?? (isTemporaryChat ? { ...baseSession, messages: messagesWithUser } : baseSession);
      const finalResponse = await resolveFinalAssistantResponse({ response: data, messageText: trimmed, submittedAt: now });
      const assistantContent = getAssistantMessageContent(finalResponse);

      if (assistantContent) {
        const messagesWithAssistant: ChatMessage[] = [...latestRequestSession.messages, { id: createClientId("assistant"), animate: activeChatIdRef.current === requestChatId || activeChatIdRef.current === nextConversationSessionId, role: "assistant", content: assistantContent, createdAt: new Date().toISOString(), response: finalResponse }];
        if (activeChatIdRef.current === requestChatId || activeChatIdRef.current === nextConversationSessionId) {
          setMessages(messagesWithAssistant);
          setLatestResponse(finalResponse);
          setConversationSessionId(nextConversationSessionId);
          setConnectionStatus(nextConnectionStatus);
        }
        upsertChatSession({ chatId: requestChatId, nextConversationSessionId, nextLatestResponse: finalResponse, nextMessages: messagesWithAssistant, titleSource: trimmed });
      } else if (finalResponse.errors.length > 0) {
        const messagesWithError: ChatMessage[] = [...latestRequestSession.messages, { id: createClientId("error"), role: "error", content: "Rune could not complete this request. Try rephrasing your message or start a new chat.", createdAt: new Date().toISOString(), response: finalResponse }];
        if (activeChatIdRef.current === requestChatId || activeChatIdRef.current === nextConversationSessionId) {
          setMessages(messagesWithError);
          setLatestResponse(finalResponse);
          setConversationSessionId(nextConversationSessionId);
          setConnectionStatus(nextConnectionStatus);
        }
        upsertChatSession({ chatId: requestChatId, nextConversationSessionId, nextLatestResponse: finalResponse, nextMessages: messagesWithError, titleSource: trimmed });
      } else {
        if (activeChatIdRef.current === requestChatId || activeChatIdRef.current === nextConversationSessionId) {
          setLatestResponse(finalResponse);
          setConversationSessionId(nextConversationSessionId);
          setConnectionStatus(nextConnectionStatus);
        }
        upsertChatSession({ chatId: requestChatId, nextConversationSessionId, nextLatestResponse: finalResponse, nextMessages: latestRequestSession.messages, titleSource: trimmed });
      }
    } catch {
      const failedResponse: ChatApiResponse = { ok: false, message_to_user: null, conversation_session_id: requestConversationSessionId, prompt_request_id: null, generated_output_id: null, wf10_status: null, output_type: null, platform: null, generation_layer: null, next_workflow: null, generated_prompt: null, avoid_constraints: null, structured_output: null, used_knowledge_blocks: null, validation_status: null, status: null, errors: ["frontend_request_failed"], raw: {} };
      const failedMessages: ChatMessage[] = [...(chatSessionsRef.current.find((session) => session.id === requestChatId)?.messages ?? messagesWithUser), { id: createClientId("error"), role: "error", content: "The frontend could not reach the intake API route.", createdAt: new Date().toISOString(), response: failedResponse }];
      if (activeChatIdRef.current === requestChatId) {
        setMessages(failedMessages);
        setLatestResponse(failedResponse);
        setConnectionStatus("error");
      }
      upsertChatSession({ chatId: requestChatId, nextConversationSessionId: requestConversationSessionId, nextLatestResponse: failedResponse, nextMessages: failedMessages, titleSource: trimmed });
    } finally {
      setGeneratingChatIds((current) => current.filter((chatId) => chatId !== requestChatId));
    }
  }

  const activeSession = activeChatId ? visibleChatSessions.find((session) => session.id === activeChatId || session.conversationSessionId === activeChatId) : null;
  const activeProject = activeProjectId ? projects.find((project) => project.id === activeProjectId) : null;
  const shouldShowDashboard = showProjectDashboard && activeProject && !activeChatId;
  const topbarProjectName = activeProject?.name ?? (activeSession?.projectId ? projects.find((project) => project.id === activeSession.projectId)?.name : undefined);
  const activeChatLoading = activeChatId ? generatingChatIds.includes(activeChatId) : false;

  return (
    <div className="min-h-screen overflow-hidden bg-[#212121] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[#212121]" />
      <div className="relative flex min-h-screen">
        <Sidebar
          activeChatId={activeChatId}
          activeProjectId={activeProjectId}
          chatSessions={visibleChatSessions}
          projects={projects}
          collapsed={sidebarCollapsed}
          onExpand={() => setSidebarCollapsed(false)}
          onNewPrompt={startNewChat}
          onSelectChat={selectChatSession}
          onSetComposerValue={setComposerValue}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          onNewProject={() => setIsProjectModalOpen(true)}
          onSelectProject={(id) => {
            activeChatIdRef.current = null;
            setActiveProjectId(id);
            setActiveChatId(null);
            setMessages([]);
            setConversationSessionId(null);
            setLatestResponse(null);
            setConnectionStatus("not_tested");
            setComposerValue("");
            setShowProjectDashboard(true);
            updateUrl(null, id);
          }}
          onSelectHome={() => {
            clearChatView({ keepProject: false });
            updateUrl(null, null);
          }}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onMoveChat={handleMoveChat}
          onTogglePinChat={handleTogglePinChat}
          onToggleArchiveChat={handleToggleArchiveChat}
          user={user}
          onSignOut={() => void handleSignOut()}
        />

        <main className={cn("flex h-dvh min-w-0 flex-1 flex-col transition-[margin-left] duration-200 ease-out lg:ml-[272px]", sidebarCollapsed && "lg:ml-0")}>
          <Topbar activeProjectName={topbarProjectName} onNewPrompt={startNewChat} showProjectCrumb={Boolean(topbarProjectName)} />
          {shouldShowDashboard ? (
            <ProjectDashboard
              project={activeProject!}
              chats={visibleChatSessions.filter((chat) => chat.projectId === activeProjectId && !chat.isArchived)}
              composerValue={composerValue}
              loading={activeChatLoading}
              onComposerChange={setComposerValue}
              onSelectChat={selectChatSession}
              onSubmit={submitMessage}
            />
          ) : (
            <ChatPanel messages={messages} loading={activeChatLoading} composerValue={composerValue} onComposerChange={setComposerValue} onSubmit={submitMessage} />
          )}
        </main>
      </div>

      <NewProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} onSubmit={handleCreateProject} />
    </div>
  );
}
