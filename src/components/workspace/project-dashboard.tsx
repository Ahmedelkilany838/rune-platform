import { Folder, MessageSquare, MoreHorizontal, Settings, Upload, X } from "lucide-react";
import type { StoredChatSession, StoredProject } from "@/lib/chat-storage";
import { ChatComposer } from "@/components/chat/chat-composer";
import { cn } from "@/lib/utils";
import { useState } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function ProjectDashboard({
  project,
  chats,
  composerValue,
  loading,
  onComposerChange,
  onSelectChat,
  onSubmit
}: {
  project: StoredProject;
  chats: StoredChatSession[];
  composerValue: string;
  loading: boolean;
  onComposerChange: (value: string) => void;
  onSelectChat: (chatId: string) => void;
  onSubmit: (message: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"chats" | "sources">("chats");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="flex h-full flex-1 flex-col bg-[#212121]">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-y-auto px-4 pb-24 pt-14 sm:px-6 md:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex max-w-full items-center justify-center gap-3">
            <h1 className="truncate text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {project.name}
            </h1>
            <Folder className="h-7 w-7 shrink-0 text-zinc-300" />
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] p-2 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Open project settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          {project.description ? (
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              {project.description}
            </p>
          ) : null}
        </div>
        
        <div className="mx-auto w-full max-w-[760px]">
          <ChatComposer
            disabled={loading}
            elevated
            loading={loading}
            value={composerValue}
            onChange={onComposerChange}
            onSubmit={onSubmit}
          />
          <p className="mt-2 text-center text-xs leading-5 text-zinc-600">
            Start a project-scoped chat. Project context, instructions, and future sources will be sent with the request.
          </p>
        </div>

        <div className="mt-10 mb-6 flex items-center gap-6 border-b border-white/[0.05]">
          <button 
            onClick={() => setActiveTab("chats")}
            className={cn(
              "relative pb-3 text-[14px] font-medium transition-colors",
              activeTab === "chats" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Chats
            {activeTab === "chats" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-white" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab("sources")}
            className={cn(
              "relative pb-3 text-[14px] font-medium transition-colors",
              activeTab === "sources" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Sources
            {activeTab === "sources" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-white" />
            )}
          </button>
        </div>

        {activeTab === "chats" && (
          <div className="space-y-1">
            {chats.map(chat => {
              const formattedDate = formatDate(chat.updatedAt);
              const preview = chat.messages.length > 0 
                ? chat.messages[chat.messages.length - 1].content 
                : "Empty chat";

              return (
                <div 
                  key={chat.id}
                  className="group flex items-start gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-white/[0.05] hover:bg-white/[0.04]"
                >
                  <button onClick={() => onSelectChat(chat.id)} className="cursor-pointer mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#303030] text-[11px] font-bold text-zinc-200">
                    {project.name.substring(0, 2).toUpperCase()}
                  </button>
                  
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelectChat(chat.id)}>
                    <h3 className="truncate text-[14px] font-medium text-zinc-200">{chat.title}</h3>
                    <p className="mt-0.5 truncate text-[13px] text-zinc-500">
                      {preview}
                    </p>
                  </div>

                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span className="text-[12px] text-zinc-500 cursor-pointer" onClick={() => onSelectChat(chat.id)}>{formattedDate}</span>
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // The portal/menu needs to be passed in or handled natively, 
                          // but for now, we just enforce no-op or actual dropdown if we migrate ProjectDashboard to use ChatSessionRows.
                        }}
                        className="rounded-md p-1.5 text-zinc-400 opacity-0 transition-all hover:bg-white/[0.1] group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {chats.length === 0 && (
              <div className="py-12 text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-zinc-800" />
                <h3 className="mb-1 font-medium text-zinc-300">No chats yet</h3>
                <p className="text-sm text-zinc-500">Write in the project composer above to create the first chat.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "sources" && (
          <div className="rounded-3xl border border-dashed border-white/[0.1] bg-black/10 p-8 text-center">
            <Upload className="mx-auto mb-4 h-10 w-10 text-zinc-700" />
            <h3 className="mb-1 font-medium text-zinc-300">Sources</h3>
            <p className="mx-auto max-w-md text-sm leading-6 text-zinc-500">
              Project source files will live here. This area is reserved for references, documents, and project assets that should influence future chats.
            </p>
          </div>
        )}
      </div>

      {isSettingsOpen ? (
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/40 backdrop-blur-sm">
          <aside className="h-full w-full max-w-md border-l border-white/[0.08] bg-[#202020] p-5 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Project settings</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{project.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Close project settings"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Description</p>
                <p className="text-sm leading-6 text-zinc-300">{project.description || "No description added yet."}</p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Instructions</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                  {project.instructions || "No project instructions added yet."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Sources</p>
                <p className="text-sm leading-6 text-zinc-400">
                  Source management will connect project references, files, and assets without exposing backend details on the main dashboard.
                </p>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}