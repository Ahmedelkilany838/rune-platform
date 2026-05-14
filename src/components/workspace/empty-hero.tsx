"use client";

import { ChatComposer } from "@/components/chat/chat-composer";
import { QuickActionChips } from "@/components/workspace/quick-action-chips";

type EmptyHeroProps = {
  disabled: boolean;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSubmit: (message: string) => Promise<void>;
};

export function EmptyHero({ disabled, composerValue, onComposerChange, onSubmit }: EmptyHeroProps) {
  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[980px] flex-col items-center justify-center px-4 pb-[11vh] text-center sm:px-8">
      <div className="relative z-10 mb-8 max-w-3xl">
        <h2 className="text-balance text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-[2rem]">
          What are we making today?
        </h2>
      </div>
      <div className="relative z-10 w-full max-w-[760px]">
        <ChatComposer disabled={disabled} value={composerValue} onChange={onComposerChange} onSubmit={onSubmit} elevated />
      </div>
      <div className="relative z-10 mt-6">
        <QuickActionChips onSelect={onComposerChange} />
      </div>
    </section>
  );
}
