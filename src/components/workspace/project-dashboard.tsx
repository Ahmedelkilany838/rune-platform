import { Folder, MessageSquare, MoreHorizontal, Plus, Search } from "lucide-react";
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
    <div className="flex-1 flex flex-col h-full bg-[#212121]">
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 pt-20 pb-24 overflow-y-auto">
        <div className="mb-12 text-center">
          <h1 className="inline-flex items-center justify-center gap-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {project.name}
            <Folder className="h-8 w-8 text-zinc-300" />
          </h1>
        </div>
        
        {/* New chat button / search bar style */}
        <button 
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-[#303030] hover:bg-[#363636] border border-white/[0.07] rounded-2xl text-zinc-400 hover:text-zinc-200 transition-all text-left group"
        >
          <Plus className="w-5 h-5 group-hover:text-white transition-colors" />
          <span className="flex-1 text-[15px]">New chat in {project.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium bg-white/[0.05] px-2 py-1 rounded text-zinc-500">Structured</span>
            <Search className="w-4 h-4 text-zinc-500" />
          </div>
        </button>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-10 mb-6 border-b border-white/[0.05]">
          <button 
            onClick={() => setActiveTab("chats")}
            className={cn(
              "pb-3 text-[14px] font-medium transition-colors relative",
              activeTab === "chats" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Chats
            {activeTab === "chats" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab("sources")}
            className={cn(
              "pb-3 text-[14px] font-medium transition-colors relative",
              activeTab === "sources" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Sources
            {activeTab === "sources" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full" />
            )}
          </button>
        </div>

        {/* Chat sessions list */}
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
                  className="group flex items-start gap-4 p-3 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-colors border border-transparent hover:border-white/[0.05]"
                >
                  <div className="w-8 h-8 rounded-full bg-[#303030] text-zinc-200 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold">
                    {project.name.substring(0, 2).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-medium text-zinc-200 truncate">{chat.title}</h3>
                    <p className="text-[13px] text-zinc-500 truncate mt-0.5">
                      {preview}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-[12px] text-zinc-500">{formattedDate}</span>
                    <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/[0.1] rounded-md text-zinc-400 transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {chats.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <h3 className="text-zinc-300 font-medium mb-1">No chats yet</h3>
                <p className="text-zinc-500 text-sm">Start a new chat to begin directing this project.</p>
              </div>
            )}
          </div>
        )}

        {/* Sources Tab Placeholder */}
        {activeTab === "sources" && (
          <div className="text-center py-12">
            <h3 className="text-zinc-300 font-medium mb-1">Sources</h3>
            <p className="text-zinc-500 text-sm">Connect files and documents to this project.</p>
          </div>
        )}

      </div>
    </div>
  );
}
