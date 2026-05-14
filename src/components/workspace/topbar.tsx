"use client";

import { Folder, Menu, MoreHorizontal, Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type TopbarProps = {
  onNewPrompt: () => void;
  activeProjectName?: string;
  showProjectCrumb?: boolean;
};

export function Topbar({ onNewPrompt, activeProjectName, showProjectCrumb = false }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 bg-[#212121]/95 px-3 backdrop-blur sm:px-4">
      <div className="flex items-center gap-3 lg:hidden">
        <span className="sr-only">Workspace actions</span>
      </div>
      {showProjectCrumb && activeProjectName ? (
        <button
          className="hidden min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white lg:flex"
          type="button"
        >
          <Folder className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="max-w-[260px] truncate">{activeProjectName}</span>
        </button>
      ) : (
        <div className="hidden lg:block" />
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          className="lg:hidden text-zinc-300 hover:text-white hover:bg-white/[0.05]"
          icon={<Menu className="h-5 w-5" aria-hidden="true" />}
          onClick={onNewPrompt}
          aria-label="Start a new chat"
        >
          New
        </Button>
        <button
          className="hidden h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white lg:flex"
          onClick={onNewPrompt}
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </button>
        <button
          className="hidden h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white sm:flex"
          type="button"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
        <button
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white sm:flex"
          type="button"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
