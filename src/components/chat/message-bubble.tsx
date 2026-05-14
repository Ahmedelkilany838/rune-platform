import type { ChatMessage } from "@/lib/chat-types";
import { cn } from "@/lib/utils";
import { TypewriterText } from "@/components/chat/typewriter-text";
import { Sparkles } from "lucide-react";

type MessageBubbleProps = {
  message: ChatMessage;
  compact?: boolean;
};

export function MessageBubble({ message, compact = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.role === "error";

  return (
    <article className={cn("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <AssistantMark tone={isError ? "error" : "normal"} />}
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[76%] rounded-[20px] px-5 py-3.5 text-[15px] leading-relaxed",
          compact && "px-4 py-3 text-sm leading-6",
          isUser && "bg-[#303030] text-white",
          !isUser && !isError && "max-w-[92%] rounded-none bg-transparent px-0 text-zinc-100 sm:max-w-[84%]",
          isError && "border border-rose-500/30 bg-rose-500/10 text-rose-200"
        )}
        dir="auto"
      >
        <p className="whitespace-pre-wrap break-words">
          {!isUser && !isError ? (
            <TypewriterText animate={message.animate} animationKey={`message:${message.id}`} text={message.content} />
          ) : (
            message.content
          )}
        </p>
      </div>
    </article>
  );
}

export function AssistantMark({ tone = "normal" }: { tone?: "normal" | "error" }) {
  return (
    <div
      className={cn(
        "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08]",
        tone === "error" ? "bg-rose-500/20 text-rose-300" : "bg-[#303030] text-zinc-100"
      )}
      aria-hidden="true"
    >
      {tone === "error" ? <span className="font-bold text-[12px]">!</span> : <Sparkles className="h-4 w-4" />}
    </div>
  );
}
