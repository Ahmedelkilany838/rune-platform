import { FileText, Folder, MessageSquare, MoreHorizontal, Plus, Search, Upload } from "lucide-react";
import type { StoredChatSession, StoredProject } from "@/lib/chat-storage";
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
  onSelectChat,
  onNewChat
}: {
  project: StoredProject;
  chats: StoredChatSession[];
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"chats" | "sources">("chats");

  return (
    <div className="flex h-full flex-1 flex-col bg-[#212121]">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-y-auto px-4 pb-24 pt-14 sm:px-6 md:px-8">
        <div className="mb-8 text-center">
          <h1 className="inline-flex items-center justify-center gap-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {project.name}
            <Folder className="h-8 w-8 text-zinc-300" />
          </h1>
          {project.description ? (
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
              {project.description}
            </p>
          ) : null}
        </div>

        <div className="mb-5 rounded-3xl border border-white/[0.07] bg-[#2b2b2b] p-4 shadow-lg shadow-black/10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Project context</p>
              <h2 className="mt-1 text-base font-semibold text-zinc-100">Instructions used in every project chat</h2>
            </div>
            <div className="rounded-full border border-white/[0.08] px-3 py-1 text-xs text-zinc-400">Saved</div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-black/15 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
                <FileText className="h-3.5 w-3.5" />
                Description
              </div>
              <p className="min-h-10 text-sm leading-6 text-zinc-300">
                {project.description || "No description added yet."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-black/15 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
                <FileText className="h-3.5 w-3.5" />
                Instructions
              </div>
              <p className="min-h-10 text-sm leading-6 text-zinc-300">
                {project.instructions || "No project instructions added yet."}
              </p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onNewChat}
          className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#303030] px-4 py-3.5 text-left text-zinc-400 transition-all hover:bg-[#363636] hover:text-zinc-200"
        >
          <Plus className="h-5 w-5 transition-colors group-hover:text-white" />
          <span className="flex-1 text-[15px]">New chat in {project.name}</span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-zinc-500">Project scoped</span>
            <Search className="h-4 w-4 text-zinc-500" />
          </div>
        </button>

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
                  onClick={() => onSelectChat(chat.id)}
                  className="group flex cursor-pointer items-start gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-white/[0.05] hover:bg-white/[0.04]"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#303030] text-[11px] font-bold text-zinc-200">
                    {project.name.substring(0, 2).toUpperCase()}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[14px] font-medium text-zinc-200">{chat.title}</h3>
                    <p className="mt-0.5 truncate text-[13px] text-zinc-500">
                      {preview}
                    </p>
                  </div>

                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span className="text-[12px] text-zinc-500">{formattedDate}</span>
                    <button className="rounded-md p-1.5 text-zinc-400 opacity-0 transition-all hover:bg-white/[0.1] group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {chats.length === 0 && (
              <div className="py-12 text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-zinc-800" />
                <h3 className="mb-1 font-medium text-zinc-300">No chats yet</h3>
                <p className="text-sm text-zinc-500">Start a new chat to begin directing this project.</p>
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
    </div>
  );
}