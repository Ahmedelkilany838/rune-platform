import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/[0.075] bg-[#111116]/78 shadow-xl backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}
