"use client";

import { Clapperboard, Image, Megaphone, PenTool, Sparkles, Wand2 } from "lucide-react";

type QuickActionChipsProps = {
  onSelect: (value: string) => void;
};

const chips = [
  { label: "Image", icon: Image, value: "Build an image prompt for " },
  { label: "Product ad", icon: Megaphone, value: "Build a product advertising prompt for " },
  { label: "Key Visual", icon: Sparkles, value: "Define key visual direction for " },
  { label: "Retouching", icon: Wand2, value: "Build retouching direction for " },
  { label: "Campaign", icon: PenTool, value: "Structure campaign visual direction for " },
  { label: "Video", icon: Clapperboard, value: "Build a video prompt for " }
];

export function QuickActionChips({ onSelect }: QuickActionChipsProps) {
  return (
    <div className="flex max-w-4xl flex-wrap justify-center gap-3">
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.label}
            type="button"
            className="inline-flex h-10 items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-5 text-[14px] font-medium text-zinc-300 transition-all hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-white backdrop-blur-sm"
            onClick={() => onSelect(chip.value)}
          >
            <Icon className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
