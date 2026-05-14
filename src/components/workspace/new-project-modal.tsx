"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NewProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, instructions: string) => void;
};

export function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), instructions.trim());
      setName("");
      setInstructions("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#202020] shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-semibold text-white">New project</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/[0.05] hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Project name
            </label>
            <input
              id="projectName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#303030] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.22] focus:outline-none focus:ring-1 focus:ring-white/[0.16]"
              placeholder="e.g. Summer Campaign 2026"
              required
            />
          </div>

          <div>
            <label htmlFor="projectInstructions" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Base instructions (optional)
            </label>
            <textarea
              id="projectInstructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full h-24 resize-none rounded-xl border border-white/[0.08] bg-[#303030] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.22] focus:outline-none focus:ring-1 focus:ring-white/[0.16] no-scrollbar"
              placeholder="Enter guidelines, colors, or avoid constraints for this project..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="h-10 px-4">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="h-10 px-6 rounded-xl">
              Create project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
