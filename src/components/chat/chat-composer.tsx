"use client";

import { AudioLines, ChevronDown, Mic, Plus, SendHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { APP_CONFIG } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

type ChatComposerProps = {
  disabled: boolean;
  loading?: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string) => Promise<void>;
  elevated?: boolean;
};

export function ChatComposer({ disabled, loading = false, value, onChange, onSubmit, elevated = false }: ChatComposerProps) {
  const remaining = APP_CONFIG.maxMessageCharacters - value.length;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const maxHeight = 156;
    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${Math.max(32, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  async function submit() {
    const nextValue = value.trim();
    if (!nextValue || disabled) return;
    onChange("");
    await onSubmit(nextValue);
  }

  return (
    <form
      className={cn(
        "rounded-[26px] border border-white/[0.08] bg-[#2f2f2f] px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.18)] transition-all focus-within:border-white/[0.18] focus-within:bg-[#333333]",
        elevated && "shadow-[0_18px_70px_rgba(0,0,0,0.28)] border-white/[0.12]"
      )}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex min-h-[40px] items-center gap-2.5">
        <button
          type="button"
          disabled
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-all hover:bg-white/[0.1] hover:text-white disabled:opacity-70"
          aria-label="Attach Reference"
          title="Attach Reference"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>

        <label htmlFor="creative-brief" className="sr-only">
          Message Rune
        </label>
        <Textarea
          ref={textareaRef}
          id="creative-brief"
          rows={1}
          value={value}
          maxLength={APP_CONFIG.maxMessageCharacters}
          disabled={disabled}
          placeholder="Message Rune"
          className="no-scrollbar !min-h-8 max-h-[156px] flex-1 rounded-none !border-0 bg-transparent px-1 py-1 text-[15px] leading-6 shadow-none !outline-none !ring-0 focus:!border-transparent focus:!outline-none focus:!ring-0 focus-visible:!outline-none placeholder:text-zinc-500 text-zinc-100"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
        />

        <div className="flex shrink-0 items-center gap-1.5">
          {loading ? <span className="hidden px-2 text-xs font-medium text-zinc-400 animate-pulse sm:inline">Thinking.</span> : null}
          <button
            type="button"
            disabled
            className="hidden h-8 items-center gap-1 rounded-full px-2 text-sm text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-75 sm:inline-flex"
            aria-label="Model"
            title="Model"
          >
            Instant
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-70"
            aria-label="Voice input"
            title="Voice input"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 disabled:shadow-none disabled:transform-none",
              value.trim()
                ? "bg-white text-[#171717] hover:bg-zinc-200"
                : "bg-[#0b84ff] text-white hover:bg-[#0a78e6]"
            )}
            aria-label="Send"
            title="Send"
          >
            {value.trim() ? (
              <SendHorizontal className="h-[17px] w-[17px] -ml-0.5" aria-hidden="true" />
            ) : (
              <AudioLines className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <p className="sr-only">Supports Arabic, English, mixed messages, and professional visual prompt requests. {remaining} characters remaining.</p>
    </form>
  );
}
