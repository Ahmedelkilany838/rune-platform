"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-white text-[#171717] hover:bg-zinc-200",
  secondary:
    "border-white/8 bg-white/[0.065] text-zinc-100 hover:bg-white/[0.10]",
  ghost:
    "border-transparent bg-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white",
  danger:
    "border-rose-300/15 bg-rose-400/10 text-rose-100 hover:bg-rose-400/15"
};

export function Button({ className, variant = "secondary", icon, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
