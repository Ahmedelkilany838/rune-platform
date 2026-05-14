"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Copy, Check } from "lucide-react";
import { publicHeroCopy } from "@/lib/public/public-copy";

/* ─────────────────────────────────────────────
   Animated headline: each line slides up from below
───────────────────────────────────────────────── */
function HeroHeadline() {
  return (
    <h1 className="font-display text-[clamp(3.6rem,7.8vw,9.5rem)] font-bold leading-[0.9] tracking-[-0.038em]">
      <div style={{ overflow: "hidden" }}>
        <span className="hero-line-1 block text-white">Build here.</span>
      </div>
      <div style={{ overflow: "hidden" }}>
        <span className="hero-line-2 block text-white">Execute anywhere.</span>
      </div>
    </h1>
  );
}

/* ─────────────────────────────────────────────
   Live prompt preview card
───────────────────────────────────────────────── */
const PROMPT_STEPS = [
  { key: "Camera",   color: "text-brand-300",   val: "85mm f/1.4 · low angle · natural backlight" },
  { key: "Lighting", color: "text-brand-300",   val: "Soft diffused rim · warm key · deep cast shadow" },
  { key: "Finish",   color: "text-brand-300",   val: "Commercial clean · matte skin · product-sharp" },
] as const;

function PromptPreviewCard() {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const delays = [900, 1800, 2700];
    const timers = delays.map((d, i) =>
      window.setTimeout(() => setStep(i + 1), d)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  function handleCopy() {
    void navigator.clipboard.writeText(
      "Commercial beauty photography, 85mm f/1.4, low angle, natural backlight, soft diffused rim lighting, warm key, deep cast shadow, matte skin finish, product-sharp detail — cinematic grade."
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="hero-card relative mx-auto mt-20 w-full max-w-[780px]">
      {/* Glow layer */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.07] to-transparent" />
      <div className="pointer-events-none absolute -bottom-12 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-brand-700/16 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171717] shadow-[0_40px_100px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]">
        {/* Title bar */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] bg-[#111111] px-5 py-3.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-zinc-800" />
            <span className="h-3 w-3 rounded-full bg-zinc-800" />
            <span className="h-3 w-3 rounded-full bg-zinc-800" />
          </div>
          <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Rune — Image Direction
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(16,163,127,0.6)]" />
            Building direction
          </span>
        </div>

        {/* Body */}
        <div className="space-y-1 px-6 py-5 font-mono text-[13px] leading-7">
          {/* Incoming brief */}
          <div className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3.5 mb-4">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mt-0.5">
              Brief
            </span>
            <p className="text-zinc-300 text-sm leading-6">
              Beauty product launch · aspirational · high-end studio · skin texture priority
            </p>
          </div>

          {/* Agent line */}
          <div className="text-zinc-600 text-[12px]">
            <span className="text-brand-400/90">→</span> Analyzing brief · retrieving direction knowledge
          </div>

          {/* Step reveals */}
          {PROMPT_STEPS.map((s, i) => {
            const visible = step > i;
            return (
              <div
                key={s.key}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(10px)",
                  transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
                  transitionDelay: visible ? "0ms" : "0ms",
                }}
              >
                <span className={s.color + " font-semibold"}>{s.key}: </span>
                <span className="text-zinc-200">{s.val}</span>
              </div>
            );
          })}

          {/* Blinking cursor or final line */}
          {step < PROMPT_STEPS.length ? (
            <span className="cursor-blink inline-block h-4 w-2 bg-brand-400" />
          ) : null}
        </div>

        {/* Prompt output bar */}
        <div
          style={{
            opacity: step >= 3 ? 1 : 0,
            transform: step >= 3 ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
          className="border-t border-white/[0.06] bg-[#111111] px-6 py-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-300 mb-1">
                Prompt ready
              </p>
              <p className="truncate text-[12px] text-zinc-400">
                Commercial beauty photography, 85mm f/1.4, low angle, natural backlight…
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {["Midjourney", "Flux", "Firefly"].map((t) => (
                <span
                  key={t}
                  className="hidden rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-[10px] font-medium text-zinc-500 sm:block"
                >
                  {t}
                </span>
              ))}
              <button
                onClick={handleCopy}
                title="Copy prompt"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-zinc-400 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main HeroShowcase
───────────────────────────────────────────────── */
export function HeroShowcase({
  onExplore,
  onStart,
}: {
  onExplore: () => void;
  onStart: () => void;
}) {
  return (
    <section className="relative min-h-dvh overflow-hidden bg-[#0d0d0d]">
      {/* Animated perspective grid */}
      <div className="hero-grid-bg pointer-events-none absolute inset-0" />

      {/* Radial vignette / gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_32%,rgba(16,163,127,0.11),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0d0d0d] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-[#0d0d0d] to-transparent" />

      {/* Floating glow orbs */}
      <div className="glow-orb pointer-events-none absolute -left-32 top-1/4 h-[50rem] w-[50rem] rounded-full bg-brand-600/[0.045] blur-[130px]" />
      <div className="glow-orb-alt pointer-events-none absolute -right-32 bottom-1/3 h-[60rem] w-[60rem] rounded-full bg-zinc-500/[0.055] blur-[150px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-900/[0.12] blur-[100px]" />

      {/* Content */}
      <div className="relative mx-auto flex min-h-dvh max-w-[1560px] flex-col items-center justify-center px-5 pb-16 pt-28 text-center sm:px-8 lg:px-10">
        {/* Eyebrow badge */}
        <div className="hero-eyebrow mb-8 inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_8px_rgba(16,163,127,0.6)]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-300">
            Creative Direction System
          </span>
        </div>

        {/* Headline */}
        <HeroHeadline />

        {/* Support text */}
        <p className="hero-support mx-auto mt-8 max-w-[52rem] text-lg leading-8 text-zinc-400 sm:text-xl">
          {publicHeroCopy.support}
        </p>

        {/* CTAs */}
        <div className="hero-cta mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            className="group relative inline-flex h-12 items-center gap-2.5 overflow-hidden rounded-full bg-white px-8 text-sm font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.18)] transition-all duration-300 hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.99]"
            onClick={onStart}
            type="button"
          >
            <span className="relative z-10">{publicHeroCopy.primaryCta}</span>
            <ArrowRight
              className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>

          <button
            className="group inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-8 text-sm font-medium text-zinc-300 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.2] hover:bg-white/[0.06] hover:text-white active:scale-[0.99]"
            onClick={onExplore}
            type="button"
          >
            {publicHeroCopy.secondaryCta}
          </button>
        </div>

        {/* Stats strip */}
        <div className="hero-stats mt-14 flex flex-wrap items-center justify-center gap-10">
          {[
            { value: "8+", label: "Direction modules" },
            { value: "12+", label: "AI tools supported" },
            { value: "100%", label: "Prompt control" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-bold text-white tracking-tight">
                {s.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Prompt preview card */}
        <PromptPreviewCard />

        {/* Scroll indicator */}
        <button
          aria-label="Scroll to explore"
          className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-700 transition-colors duration-200 hover:text-zinc-400"
          onClick={onExplore}
          type="button"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.28em]">Explore</span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
