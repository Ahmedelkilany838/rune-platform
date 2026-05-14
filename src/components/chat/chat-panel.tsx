"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/chat-types";
import { AssistantMark, MessageBubble } from "@/components/chat/message-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import { EmptyHero } from "@/components/workspace/empty-hero";

type ChatPanelProps = {
  messages: ChatMessage[];
  loading: boolean;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSubmit: (message: string) => Promise<void>;
};

export function ChatPanel({ messages, loading, composerValue, onComposerChange, onSubmit }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  function updateScrollState() {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    const distanceFromBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
    setShowScrollButton(distanceFromBottom > 180);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior });
    setShowScrollButton(false);
  }

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, loading]);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7" onScroll={updateScrollState}>
        {messages.length === 0 ? (
          <EmptyHero disabled={loading} composerValue={composerValue} onComposerChange={onComposerChange} onSubmit={onSubmit} />
        ) : (
          <div className="mx-auto flex w-full max-w-[820px] flex-col gap-7 pb-8 pt-4 sm:pt-8">
            <div className="flex flex-col gap-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-start gap-3">
                <AssistantMark />
                <div className="flex items-center gap-1 px-1 py-2" aria-label="Assistant is typing">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.22s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.11s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
                </div>
              </div>
            ) : null}

          </div>
        )}
      </div>

      {messages.length > 0 ? (
        <div className="relative shrink-0 px-4 pb-3 sm:px-7">
          {showScrollButton ? (
            <button
              type="button"
              className="absolute left-1/2 top-[-46px] flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-[#262626]/95 text-zinc-100 shadow-2xl backdrop-blur transition hover:bg-[#303030]"
              onClick={() => scrollToBottom()}
              aria-label="Scroll to latest message"
            >
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <div className="mx-auto w-full max-w-[760px]">
            <ChatComposer disabled={false} loading={loading} value={composerValue} onChange={onComposerChange} onSubmit={onSubmit} />
            <p className="mt-2 text-center text-xs leading-5 text-zinc-600">
              Rune can make mistakes. Review prompt details before execution.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
