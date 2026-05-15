"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NewProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string, instructions: string) => void;
};

export function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    onSubmit(trimmedName, description.trim(), instructions.trim());
    setName("");
    setDescription("");
    setInstructions("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#202020] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">New project</h2>
            <p className="mt-1 text-sm text-zinc-500">Project details are saved to Supabase and sent with every project chat.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="projectName" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Project name
            </label>
            <input
              id="projectName"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#303030] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.22] focus:outline-none focus:ring-1 focus:ring-white/[0.16]"
              placeholder="e.g. Summer Campaign 2026"
              required
            />
          </div>

          <div>
            <label htmlFor="projectDescription" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Description
            </label>
            <textarea
              id="projectDescription"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="no-scrollbar h-24 w-full resize-none rounded-xl border border-white/[0.08] bg-[#303030] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.22] focus:outline-none focus:ring-1 focus:ring-white/[0.16]"
              placeholder="What is this project about? Product, brand, audience, goal, platform, campaign context..."
            />
          </div>

          <div>
            <label htmlFor="projectInstructions" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Project instructions
            </label>
            <textarea
              id="projectInstructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              className="no-scrollbar h-28 w-full resize-none rounded-xl border border-white/[0.08] bg-[#303030] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.22] focus:outline-none focus:ring-1 focus:ring-white/[0.16]"
              placeholder="Rules the AI must follow in this project. Example: do not agree too quickly, ask when unclear, avoid luxury clichés, keep output unbiased..."
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              These instructions are persisted and included in the workflow context for every chat inside this project.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="h-10 px-4">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="h-10 rounded-xl px-6">
              Create project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
