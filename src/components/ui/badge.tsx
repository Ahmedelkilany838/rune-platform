import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

const tones: Record<BadgeTone, string> = {
  neutral: "border-white/8 bg-white/[0.055] text-zinc-300",
  success: "border-emerald-300/14 bg-emerald-300/8 text-emerald-200/90",
  warning: "border-amber-200/18 bg-amber-200/8 text-amber-100",
  danger: "border-rose-300/18 bg-rose-300/10 text-rose-100",
  info: "border-emerald-200/18 bg-emerald-200/10 text-emerald-100/90"
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
