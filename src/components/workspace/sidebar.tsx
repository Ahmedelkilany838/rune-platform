"use client";

import {
  Box,
  BrainCircuit,
  Folder,
  FolderPlus,
  Image,
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Video,
  Wand2,
  Plus,
  ChevronRight,
  Trash2,
  Edit2,
  Share,
  UserPlus,
  Pin,
  Archive,
  LogOut,
  Settings,
  UserCircle
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { ComponentType } from "react";
import type { StoredChatSession, StoredProject } from "@/lib/chat-storage";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { AppUser } from "@/lib/auth/app-user";

type Shortcut = {
  alt?: boolean;
  ctrl?: boolean;
  key: string;
  shift?: boolean;
  text: string;
};

type SidebarItem = {
  active?: boolean;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  onSelect: () => void;
  shortcut: Shortcut;
};

type SidebarProps = {
  activeChatId: string | null;
  activeProjectId: string | null;
  chatSessions: StoredChatSession[];
  projects: StoredProject[];
  collapsed: boolean;
  onExpand: () => void;
  onNewPrompt: () => void;
  onSelectChat: (sessionId: string) => void;
  onSetComposerValue: (value: string) => void;
  onToggleCollapsed: () => void;
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectHome: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onMoveChat: (chatId: string, newProjectId: string | null) => void;
  onTogglePinChat: (chatId: string) => void;
  onToggleArchiveChat: (chatId: string) => void;
  user: AppUser;
  onSignOut: () => void;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
}

function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut) {
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    event.ctrlKey === Boolean(shortcut.ctrl) &&
    event.shiftKey === Boolean(shortcut.shift) &&
    event.altKey === Boolean(shortcut.alt) &&
    !event.metaKey
  );
}

export function Sidebar({
  activeChatId,
  activeProjectId,
  chatSessions,
  projects,
  collapsed,
  onExpand,
  onNewPrompt,
  onSelectChat,
  onSetComposerValue,
  onToggleCollapsed,
  onNewProject,
  onSelectProject,
  onSelectHome,
  onDeleteChat,
  onRenameChat,
  onMoveChat,
  onTogglePinChat,
  onToggleArchiveChat,
  user,
  onSignOut
}: SidebarProps) {
  const primaryItems: SidebarItem[] = [
    {
      label: "New chat",
      icon: MessageSquarePlus,
      active: activeChatId === null && activeProjectId === null,
      shortcut: { ctrl: true, shift: true, key: "o", text: "Ctrl + Shift + O" },
      onSelect: onNewPrompt
    },
    {
      label: "Search chats",
      icon: Search,
      shortcut: { ctrl: true, key: "k", text: "Ctrl + K" },
      onSelect: onExpand
    },
    {
      label: "Rune Codex",
      icon: BrainCircuit,
      shortcut: { ctrl: true, key: "j", text: "Ctrl + J" },
      onSelect: onExpand
    },
    {
      label: "More",
      icon: MoreHorizontal,
      shortcut: { ctrl: true, key: "m", text: "Ctrl + M" },
      onSelect: onExpand
    }
  ];

  const moduleItems: SidebarItem[] = [
    {
      label: "Images",
      icon: Image,
      shortcut: { ctrl: true, alt: true, key: "i", text: "Ctrl + Alt + I" },
      onSelect: () => onSetComposerValue("Build image direction for ")
    },
    {
      label: "Video AI",
      icon: Video,
      shortcut: { ctrl: true, alt: true, key: "v", text: "Ctrl + Alt + V" },
      onSelect: () => onSetComposerValue("Build video direction for ")
    },
    {
      label: "Retouching",
      icon: Wand2,
      shortcut: { ctrl: true, alt: true, key: "r", text: "Ctrl + Alt + R" },
      onSelect: () => onSetComposerValue("Create retouching direction for ")
    },
    {
      label: "Explore GPTs",
      icon: Box,
      shortcut: { ctrl: true, alt: true, key: "c", text: "Ctrl + Alt + C" },
      onSelect: () => onSetComposerValue("Structure campaign direction for ")
    }
  ];

  // Split chat sessions by active project and exclude archived
  const activeChats = chatSessions.filter(c => !c.isArchived);
  const getProjectChats = (projectId: string) => activeChats.filter((chat) => chat.projectId === projectId);

  useEffect(() => {
    const shortcutItems = [...primaryItems, ...moduleItems];

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      const matchedItem = shortcutItems.find((item) => matchesShortcut(event, item.shortcut));
      if (!matchedItem) return;

      event.preventDefault();
      matchedItem.onSelect();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moduleItems, onExpand, onNewPrompt, onSetComposerValue, primaryItems]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden h-dvh shrink-0 border-r border-white/[0.07] bg-black px-2 py-2 transition-[width] duration-300 ease-in-out lg:flex lg:flex-col",
        collapsed ? "w-[58px]" : "w-[272px]"
      )}
      onClick={() => {
        if (collapsed) onExpand();
      }}
    >
      <div
        className={cn(
          "mb-5 flex shrink-0 items-center",
          collapsed ? "h-9 justify-center" : "h-9 justify-between gap-2 px-3"
        )}
      >
        <Link href="/" className={cn("min-w-0", collapsed && "sr-only")}>
          <p className="truncate text-[18px] font-semibold leading-none text-white">Rune</p>
        </Link>
        <button
          type="button"
          data-sidebar-toggle
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapsed();
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto pr-1" aria-label="Workspace navigation">
        <div className="space-y-1">
          <SidebarItemGroup collapsed={collapsed} items={primaryItems} />
        </div>

        <div className={cn("mt-6", collapsed && "mt-2")}>
          <p className={cn("mb-1 px-3 text-[13px] font-semibold text-white", collapsed && "sr-only")}>GPTs</p>
          <SidebarItemGroup collapsed={collapsed} items={moduleItems} />
        </div>

        <div className={cn("mt-6", collapsed && "hidden")}>
          <div className="mb-1 flex items-center justify-between px-3">
            <p className="text-[13px] font-semibold text-white">Projects</p>
          </div>
          
          <div className="space-y-0.5">
            <button
              className="group flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-[14px] text-zinc-200 transition hover:bg-white/[0.08]"
              onClick={onNewProject}
              type="button"
            >
              <FolderPlus className="h-[18px] w-[18px] shrink-0 text-zinc-300" />
              New project
            </button>
            {projects.map((project) => (
              <ProjectSidebarItem
                activeChatId={activeChatId}
                activeProjectId={activeProjectId}
                key={project.id}
                onDeleteChat={onDeleteChat}
                onMoveChat={onMoveChat}
                onNewProject={onNewProject}
                onRenameChat={onRenameChat}
                onSelectChat={onSelectChat}
                onSelectProject={onSelectProject}
                onToggleArchiveChat={onToggleArchiveChat}
                onTogglePinChat={onTogglePinChat}
                project={project}
                projects={projects}
                sessions={getProjectChats(project.id)}
              />
            ))}
          </div>
        </div>

        <div className={cn("mt-5 pb-6", collapsed && "hidden")}>
          <ChatSessionList 
            title="Recent chats"
            activeChatId={activeChatId} 
            sessions={activeChats} 
            projects={projects}
            onSelectChat={onSelectChat} 
            onDeleteChat={onDeleteChat}
            onRenameChat={onRenameChat}
            onMoveChat={onMoveChat}
            onNewProject={onNewProject}
            onTogglePinChat={onTogglePinChat}
            onToggleArchiveChat={onToggleArchiveChat}
          />
        </div>
      </nav>

      <div className="mt-2 shrink-0 border-t border-white/[0.05] pt-2">
        <SidebarAccount collapsed={collapsed} onSignOut={onSignOut} user={user} />
      </div>
    </aside>
  );
}

function getUserInitial(user: AppUser) {
  const source = user.name ?? user.email ?? "Rune";
  return source.trim().charAt(0).toUpperCase();
}

function SidebarAccount({ collapsed, onSignOut, user }: { collapsed: boolean; onSignOut: () => void; user: AppUser }) {
  const [open, setOpen] = useState(false);
  const displayName = user.name ?? user.email ?? "Rune user";
  const secondary = user.planLabel || "Free";

  return (
    <div className={cn("relative mt-1", collapsed && "flex flex-col items-center")}>
      <div
        className={cn(
          "group flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.06]",
          collapsed && "h-9 w-9 justify-center p-0"
        )}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
          title={displayName}
          type="button"
        >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#2f2f2f] text-[12px] font-semibold text-white">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={user.avatarUrl} />
          ) : (
            getUserInitial(user)
          )}
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-4 text-white">{displayName}</p>
            <p className="truncate text-xs leading-4 text-zinc-500">{secondary}</p>
          </div>
        )}
        </button>
        {!collapsed ? (
          <button
            aria-label="Account settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 opacity-80 transition hover:bg-white/[0.08] hover:text-white group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              setOpen((value) => !value);
            }}
            type="button"
          >
            <Settings className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          className={cn(
            "absolute bottom-[50px] z-50 w-64 rounded-2xl border border-white/[0.09] bg-[#202020] p-2 shadow-2xl",
            collapsed ? "left-[48px]" : "left-0"
          )}
        >
          <div className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#303030] text-sm font-semibold text-white">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="h-full w-full object-cover" src={user.avatarUrl} />
              ) : (
                getUserInitial(user)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs text-zinc-500">{user.email ?? "Signed in"}</p>
            </div>
          </div>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.07]">
            <UserCircle className="h-4 w-4" />
            Account
          </button>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.07]">
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.07]"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ProjectSidebarItem({
  activeChatId,
  activeProjectId,
  onDeleteChat,
  onMoveChat,
  onNewProject,
  onRenameChat,
  onSelectChat,
  onSelectProject,
  onToggleArchiveChat,
  onTogglePinChat,
  project,
  projects,
  sessions
}: {
  activeChatId: string | null;
  activeProjectId: string | null;
  onDeleteChat: (chatId: string) => void;
  onMoveChat: (chatId: string, newProjectId: string | null) => void;
  onNewProject: () => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onSelectChat: (sessionId: string) => void;
  onSelectProject: (projectId: string) => void;
  onToggleArchiveChat: (chatId: string) => void;
  onTogglePinChat: (chatId: string) => void;
  project: StoredProject;
  projects: StoredProject[];
  sessions: StoredChatSession[];
}) {
  const isOpen = activeProjectId === project.id;

  return (
    <div>
      <button
        onClick={() => onSelectProject(project.id)}
        className={cn(
          "group flex h-9 w-full items-center gap-2 rounded-xl px-3 text-[14px] transition-colors",
          isOpen ? "bg-white/[0.08] text-white" : "text-zinc-200 hover:bg-white/[0.06] hover:text-white"
        )}
        type="button"
      >
        <Folder className="h-[18px] w-[18px] shrink-0 opacity-90 group-hover:opacity-100" />
        <span className="truncate">{project.name}</span>
      </button>

      {isOpen ? (
        <div className="mt-0.5 space-y-0.5 pl-7">
          {sessions.length > 0 ? (
            <ChatSessionRows
              activeChatId={activeChatId}
              emptyLabel="No chats yet."
              onDeleteChat={onDeleteChat}
              onMoveChat={onMoveChat}
              onNewProject={onNewProject}
              onRenameChat={onRenameChat}
              onSelectChat={onSelectChat}
              onToggleArchiveChat={onToggleArchiveChat}
              onTogglePinChat={onTogglePinChat}
              projects={projects}
              sessions={sessions}
              variant="nested"
            />
          ) : (
            <p className="px-2 py-1.5 text-[12px] text-zinc-600">No chats yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ChatSessionList({
  title,
  activeChatId,
  sessions,
  projects,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onMoveChat,
  onNewProject,
  onTogglePinChat,
  onToggleArchiveChat
}: {
  title: string;
  activeChatId: string | null;
  sessions: StoredChatSession[];
  projects: StoredProject[];
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onMoveChat: (chatId: string, newProjectId: string | null) => void;
  onNewProject: () => void;
  onTogglePinChat: (chatId: string) => void;
  onToggleArchiveChat: (chatId: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      <p className="mb-1 px-3 text-[13px] font-semibold text-white">{title}</p>
      <ChatSessionRows
        activeChatId={activeChatId}
        emptyLabel="No chats yet."
        onDeleteChat={onDeleteChat}
        onMoveChat={onMoveChat}
        onNewProject={onNewProject}
        onRenameChat={onRenameChat}
        onSelectChat={onSelectChat}
        onToggleArchiveChat={onToggleArchiveChat}
        onTogglePinChat={onTogglePinChat}
        projects={projects}
        sessions={sessions}
      />
    </div>
  );
}

function ChatSessionRows({
  activeChatId,
  emptyLabel,
  sessions,
  projects,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onMoveChat,
  onNewProject,
  onTogglePinChat,
  onToggleArchiveChat,
  variant = "default"
}: {
  activeChatId: string | null;
  emptyLabel: string;
  sessions: StoredChatSession[];
  projects: StoredProject[];
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onMoveChat: (chatId: string, newProjectId: string | null) => void;
  onNewProject: () => void;
  onTogglePinChat: (chatId: string) => void;
  onToggleArchiveChat: (chatId: string) => void;
  variant?: "default" | "nested";
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [showProjectSubmenu, setShowProjectSubmenu] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setShowProjectSubmenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (sessions.length === 0) {
    return (
      <p className="px-3 py-2 text-[13px] text-zinc-600">{emptyLabel}</p>
    );
  }

  const handleRenameSubmit = (id: string) => {
    if (editValue.trim()) {
      onRenameChat(id, editValue.trim());
    }
    setEditingId(null);
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-0.5">
      {sortedSessions.map((session) => (
        <div
          key={session.id}
          className={cn(
            "group flex h-8 w-full items-center justify-between rounded-lg text-left text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-100",
            variant === "nested" ? "px-2 text-[12px]" : "px-3",
            activeChatId === session.id && "bg-white/[0.08] text-white font-medium hover:bg-white/[0.1]"
          )}
        >
          {editingId === session.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleRenameSubmit(session.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit(session.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-full flex-1 border-none bg-transparent text-[13px] text-white outline-none"
            />
          ) : (
            <button
              type="button"
              className="flex-1 truncate pr-2 text-left"
              onClick={() => onSelectChat(session.id)}
              title={session.title}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {session.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 rotate-45 text-zinc-300" />}
                <span className="truncate">{session.title}</span>
              </span>
            </button>
          )}

          {!editingId && (
            <div className={cn("flex items-center shrink-0", openMenuId === session.id ? "flex" : "hidden group-hover:flex")}>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (openMenuId === session.id) {
                      setOpenMenuId(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      // Drop down, but align the *left* edge of the menu with the *right* edge of the button (or just slightly offset)
                      // so it opens outside the sidebar.
                      setMenuPosition({ 
                        top: rect.bottom + 4, 
                        left: rect.left - 4 
                      });
                      setOpenMenuId(session.id);
                    }
                    setShowProjectSubmenu(null);
                  }}
                  className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                  title="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                
                {openMenuId === session.id && menuPosition && typeof document !== "undefined" && createPortal(
                  <div 
                    ref={menuRef}
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    className="fixed z-[100] w-56 rounded-xl border border-white/[0.1] bg-[#1c1c1c] py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white">
                      <Share className="w-4 h-4" /> Share
                    </button>
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white">
                      <UserPlus className="w-4 h-4" /> Share workspace access
                    </button>
                    <button 
                      onClick={() => {
                        setEditValue(session.title);
                        setEditingId(session.id);
                        setOpenMenuId(null);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" /> Rename
                    </button>
                    
                    <div 
                      className="relative"
                      onMouseEnter={() => setShowProjectSubmenu(session.id)}
                      onMouseLeave={() => setShowProjectSubmenu(null)}
                    >
                      <button className="flex w-full items-center justify-between px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white">
                        <div className="flex items-center gap-3">
                          <FolderPlus className="w-4 h-4" /> Move to project
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>

                      {/* Projects Submenu */}
                      {showProjectSubmenu === session.id && (
                        <div className="absolute left-full top-0 ml-1 w-56 rounded-xl bg-[#262626] border border-white/[0.1] shadow-2xl py-1 animate-in fade-in slide-in-from-left-2 duration-150">
                          <button 
                            onClick={() => {
                              onNewProject();
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-zinc-200 hover:bg-white/[0.08] transition-colors font-medium border-b border-white/[0.05] mb-1"
                          >
                            <Plus className="w-4 h-4" /> New project
                          </button>
                          
                          <div className="max-h-60 overflow-y-auto">
                            {projects.map(proj => (
                              <button 
                                key={proj.id}
                                onClick={() => {
                                  onMoveChat(session.id, proj.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-zinc-300 hover:bg-white/[0.08] transition-colors"
                              >
                                <Folder className="w-4 h-4 shrink-0 opacity-70" />
                                <span className="truncate">{proj.name}</span>
                              </button>
                            ))}
                            {projects.length === 0 && (
                              <p className="px-3 py-2 text-xs text-zinc-500">No projects yet.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => {
                        onTogglePinChat(session.id);
                        setOpenMenuId(null);
                      }}
                      className="mt-1 flex w-full items-center gap-3 border-t border-white/[0.05] px-3 py-2 pt-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      <Pin className={cn("w-4 h-4", session.isPinned && "fill-current")} /> {session.isPinned ? "Unpin chat" : "Pin chat"}
                    </button>
                    <button 
                      onClick={() => {
                        onToggleArchiveChat(session.id);
                        setOpenMenuId(null);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      <Archive className="w-4 h-4" /> {session.isArchived ? "Unarchive" : "Archive"}
                    </button>
                    <button 
                      onClick={() => {
                        setChatToDelete(session.id);
                        setOpenMenuId(null);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Custom Delete Confirmation Modal */}
      {chatToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setChatToDelete(null)}>
          <div 
            className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#202020] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-white">Delete chat</h3>
            <p className="text-sm text-zinc-400 mb-6">Are you sure you want to delete this chat? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setChatToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteChat(chatToDelete);
                  setChatToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItemGroup({ collapsed, items }: { collapsed: boolean; items: SidebarItem[] }) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <SidebarButton key={item.label} collapsed={collapsed} item={item} />
      ))}
    </div>
  );
}

function SidebarButton({ collapsed, item }: { collapsed: boolean; item: SidebarItem }) {
  const Icon = item.icon;

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={item.onSelect}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white",
          collapsed && "justify-center px-0",
          item.active && "bg-white/[0.09] text-white shadow-sm hover:bg-white/[0.11]"
        )}
        aria-label={collapsed ? `${item.label}, ${item.shortcut.text}` : undefined}
      >
        <Icon className={cn("h-4 w-4 shrink-0", item.active ? "text-white" : "text-zinc-400 group-hover:text-zinc-200")} aria-hidden={true} />
        <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>{item.label}</span>
      </button>

      {collapsed && (
        <div className="pointer-events-none absolute left-[50px] top-1/2 z-50 hidden -translate-y-1/2 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#202020] px-3 py-2 text-[13px] font-medium text-white shadow-xl group-hover:flex backdrop-blur-md">
          <span className="whitespace-nowrap">{item.label}</span>
          <kbd className="whitespace-nowrap text-[10px] font-bold tracking-wider text-zinc-500">{item.shortcut.text}</kbd>
        </div>
      )}
    </div>
  );
}
