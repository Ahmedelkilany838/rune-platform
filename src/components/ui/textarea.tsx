"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full resize-none rounded-[1.1rem] border border-white/[0.065] bg-[#303030] px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-white/[0.22] focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});
