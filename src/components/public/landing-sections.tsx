"use client";

import { ArrowRight } from "lucide-react";
import { featuredCapabilities } from "@/lib/public/capabilities";
import { useInView } from "@/hooks/use-in-view";

/* ─────────────────────────────────────────────
   Helper – stagger delay via inline style
───────────────────────────────────────────────── */
function staggerDelay(index: number, base = 80) {
  return `${index * base}ms`;
}

/* ─────────────────────────────────────────────
   01 – Editorial proof bar
───────────────────────────────────────────────── */
export function EditorialProofBar() {
  const [ref, inView] = useInView({ threshold: 0.3 });

  const statements = [
    "Direction before generation",
    "Prompts without guesswork",
    "Built for creative control",
    "Runs in any AI tool",
  ] as const;

  return (
    <section className="border-y border-white/[0.06] bg-[#111111]" ref={ref}>
      <div className="mx-auto grid max-w-[1560px] divide-y divide-white/[0.06] px-5 sm:px-8 md:grid-cols-4 md:divide-x md:divide-y-0 lg:px-10">
        {statements.map((statement, i) => (
          <div
            key={statement}
            className="reveal-up py-6 md:px-7"
            style={{
              transitionDelay: inView ? staggerDelay(i, 70) : "0ms",
            }}
            data-in-view={inView ? "true" : undefined}
          >
            <InViewApply inView={inView} className="reveal-up">
              <div className="py-0">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-700">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">
                  {statement}
                </p>
              </div>
            </InViewApply>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Small helper: applies .in-view class when inView=true
───────────────────────────────────────────────── */
function InViewApply({
  inView,
  className,
  children,
  style,
}: {
  inView: boolean;
  className: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={[className, inView ? "in-view" : ""].join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   02 – Manifesto
───────────────────────────────────────────────── */
export function ManifestoSection() {
  const [ref, inView] = useInView({ threshold: 0.12 });

  return (
    <section
      className="mx-auto max-w-[1560px] px-5 py-28 sm:px-8 sm:py-44 lg:px-10"
      ref={ref}
    >
      <div className="grid gap-12 lg:grid-cols-[0.38fr_1fr]">
        {/* Left col */}
        <div
          className={["reveal-up", inView ? "in-view" : ""].join(" ")}
          style={{ transitionDelay: inView ? "0ms" : "0ms" }}
        >
          <div
            className={[
              "mb-10 h-px w-24 bg-gradient-to-r from-brand-500/60 to-transparent reveal-line",
              inView ? "in-view" : "",
            ].join(" ")}
            style={{ transitionDelay: inView ? "200ms" : "0ms" }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.42em] text-zinc-400">
            Not a prompt generator
          </p>
        </div>

        {/* Right col */}
        <div>
          <div
            className={["reveal-up", inView ? "in-view" : ""].join(" ")}
            style={{ transitionDelay: inView ? "100ms" : "0ms" }}
          >
            <h2 className="font-display text-[clamp(3.2rem,8.5vw,10.5rem)] font-semibold leading-[0.88] tracking-[-0.075em] text-white">
              Creative direction comes before generation.
            </h2>
          </div>
          <div
            className={["reveal-up", inView ? "in-view" : ""].join(" ")}
            style={{ transitionDelay: inView ? "260ms" : "0ms" }}
          >
            <p className="mt-12 max-w-3xl text-xl leading-9 text-zinc-400">
              AI tools execute what they are given. Rune helps you shape the
              direction first, so every prompt carries intent, visual clarity,
              and production logic.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   03 – Transformation
───────────────────────────────────────────────── */
const transformItems = [
  {
    title: "Idea",
    text: "Start with a rough visual thought.",
  },
  {
    title: "Direction",
    text: "Shape subject, scene, mood, camera, light, and finish.",
  },
  {
    title: "Prompt",
    text: "Leave with an instruction ready to run anywhere.",
  },
] as const;

export function TransformationSection() {
  const [ref, inView] = useInView({ threshold: 0.1 });

  return (
    <section
      className="mx-auto max-w-[1560px] px-5 pb-28 sm:px-8 sm:pb-40 lg:px-10"
      ref={ref}
    >
      <div
        className={["mb-14 reveal-up", inView ? "in-view" : ""].join(" ")}
        style={{ transitionDelay: inView ? "0ms" : "0ms" }}
      >
        <h2 className="font-display text-[clamp(3rem,7vw,7.5rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-white">
          From idea to executable prompt.
        </h2>
      </div>

      <div className="grid border-y border-white/[0.08] md:grid-cols-3">
        {transformItems.map((item, i) => (
          <div
            key={item.title}
            className={[
              "min-h-[21rem] border-white/[0.08] py-10 md:border-r md:px-8 last:md:border-r-0 reveal-up",
              inView ? "in-view" : "",
            ].join(" ")}
            style={{ transitionDelay: inView ? staggerDelay(i, 100) : "0ms" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-700">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-16 font-display text-[clamp(3.4rem,7vw,7.6rem)] font-semibold leading-none tracking-[-0.085em] text-white">
              {item.title}
            </h3>
            <p className="mt-6 max-w-sm text-base leading-7 text-zinc-400">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   04 – Modules index
───────────────────────────────────────────────── */
const statusTone: Record<string, string> = {
  Available: "text-emerald-200",
  "Phase 1": "text-zinc-300",
  Preview: "text-zinc-300",
  Planned: "text-zinc-500",
};

const statusDot: Record<string, string> = {
  Available: "bg-emerald-400",
  "Phase 1": "bg-zinc-400",
  Preview: "bg-zinc-400",
  Planned: "bg-zinc-600",
};

export function ModulesIndexSection({ onStart }: { onStart: () => void }) {
  const [headerRef, headerInView] = useInView({ threshold: 0.2 });
  const [listRef, listInView] = useInView({ threshold: 0.05 });

  return (
    <section
      className="mx-auto max-w-[1560px] px-5 py-24 sm:px-8 sm:py-36 lg:px-10"
      id="workflows"
    >
      {/* Header */}
      <div
        className="mb-16 grid gap-8 lg:grid-cols-[0.85fr_1fr] lg:items-end"
        ref={headerRef}
      >
        <div
          className={["reveal-up", headerInView ? "in-view" : ""].join(" ")}
          style={{ transitionDelay: headerInView ? "0ms" : "0ms" }}
        >
          <h2 className="font-display text-[clamp(3.2rem,8vw,8.5rem)] font-semibold leading-[0.88] tracking-[-0.075em] text-white">
            Direction modules.
          </h2>
        </div>
        <div
          className={["reveal-up", headerInView ? "in-view" : ""].join(" ")}
          style={{ transitionDelay: headerInView ? "140ms" : "0ms" }}
        >
          <p className="max-w-xl text-lg leading-8 text-zinc-400">
            Choose the kind of creative direction you want to build.
          </p>
        </div>
      </div>

      {/* List */}
      <div className="border-t border-white/[0.08]" ref={listRef}>
        {featuredCapabilities.map((item, i) => {
          const active =
            item.status === "Available" || item.status === "Phase 1";
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className={["reveal-up", listInView ? "in-view" : ""].join(" ")}
              style={{ transitionDelay: listInView ? staggerDelay(i, 60) : "0ms" }}
            >
              <button
                className={[
                  "group relative grid w-full gap-5 overflow-hidden border-b border-white/[0.08] py-7 text-left transition-all duration-300",
                  "sm:grid-cols-[4.5rem_minmax(0,0.95fr)_minmax(260px,1.1fr)_8rem] sm:items-center",
                  active
                    ? "hover:bg-white/[0.04] cursor-pointer"
                    : "cursor-default opacity-40",
                ].join(" ")}
                disabled={!active}
                onClick={active ? onStart : undefined}
                type="button"
              >
                <span className="font-display text-2xl font-semibold tracking-[-0.05em] text-zinc-700">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="flex items-center gap-3 font-display text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                  <Icon className="h-5 w-5 shrink-0 text-zinc-600 transition-colors duration-200 group-hover:text-white" aria-hidden="true" />
                  {item.title}
                </span>

                <span className="max-w-xl text-base leading-7 text-zinc-400">
                  {item.description}
                </span>

                <span className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${statusDot[item.status] ?? "bg-zinc-600"}`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.24em] ${statusTone[item.status] ?? "text-zinc-500"}`}
                    >
                      {item.status}
                    </span>
                  </span>
                  {active && (
                    <span className="hidden items-center gap-1 text-sm font-medium text-zinc-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:text-white md:inline-flex">
                      Start <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   05 – Use-case spreads
───────────────────────────────────────────────── */
const useCases = [
  {
    number: "01",
    title: "Product campaigns",
    text: "Shape product visuals for launches, ads, and campaign assets.",
    texture: "product surface shadow mood light detail finish",
  },
  {
    number: "02",
    title: "Social visuals",
    text: "Keep fast-moving creative clear across formats and placements.",
    texture: "ratio crop frame scale pace format sequence",
  },
  {
    number: "03",
    title: "Reference-led art direction",
    text: "Translate what matters from a reference into direction you can use.",
    texture: "reference read extract translate adapt rebuild",
  },
] as const;

export function UseCaseSpreadsSection() {
  const [headerRef, headerInView] = useInView({ threshold: 0.2 });
  const [listRef, listInView] = useInView({ threshold: 0.05 });

  return (
    <section className="mx-auto max-w-[1560px] px-5 pb-28 sm:px-8 sm:pb-40 lg:px-10">
      {/* Header */}
      <div className="mb-16 max-w-5xl" ref={headerRef}>
        <div
          className={["reveal-up", headerInView ? "in-view" : ""].join(" ")}
          style={{ transitionDelay: headerInView ? "0ms" : "0ms" }}
        >
          <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.42em] text-zinc-500">
            Use cases
          </p>
          <h2 className="font-display text-[clamp(3rem,7vw,7.5rem)] font-semibold leading-[0.92] tracking-[-0.075em] text-white">
            Made for creative work that needs control.
          </h2>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-5" ref={listRef}>
        {useCases.map((item, i) => (
          <article
            key={item.title}
            className={[
              "grid min-h-[26rem] overflow-hidden border border-white/[0.07] bg-[#171717] lg:grid-cols-[0.9fr_1.1fr] reveal-up",
              listInView ? "in-view" : "",
            ].join(" ")}
            style={{ transitionDelay: listInView ? staggerDelay(i, 110) : "0ms" }}
          >
            <div className="flex flex-col justify-between gap-16 p-8 sm:p-12">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-700">
                {item.number}
              </p>
              <div>
                <h3 className="font-display text-[clamp(2.7rem,5vw,5.5rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-white">
                  {item.title}
                </h3>
                <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-400">
                  {item.text}
                </p>
              </div>
            </div>
            <div className="relative min-h-[18rem] overflow-hidden border-t border-white/[0.07] bg-[#0d0d0d] lg:border-l lg:border-t-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_42%,rgba(16,163,127,0.14),transparent_55%)]" />
              <div className="absolute left-8 top-8 h-px w-36 bg-gradient-to-r from-brand-500/70 to-transparent" />
              <p className="absolute bottom-8 right-8 max-w-[34rem] text-right font-display text-[clamp(3rem,6vw,7rem)] font-semibold uppercase leading-[0.8] tracking-[-0.1em] text-white/[0.045]">
                {item.texture}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   06 – Process steps
───────────────────────────────────────────────── */
const processSteps = [
  "Describe the idea",
  "Add references or constraints",
  "Shape the visual direction",
  "Copy the final prompt",
  "Execute anywhere",
] as const;

export function ProcessSection() {
  const [leftRef, leftInView] = useInView({ threshold: 0.2 });
  const [rightRef, rightInView] = useInView({ threshold: 0.08 });

  return (
    <section className="mx-auto max-w-[1560px] px-5 py-24 sm:px-8 sm:py-36 lg:px-10">
      <div className="grid gap-16 lg:grid-cols-[0.78fr_1fr]">
        {/* Left */}
        <div ref={leftRef}>
          <div
            className={["reveal-up", leftInView ? "in-view" : ""].join(" ")}
            style={{ transitionDelay: leftInView ? "0ms" : "0ms" }}
          >
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.42em] text-zinc-500">
              How Rune works
            </p>
            <h2 className="font-display text-[clamp(3rem,6.8vw,7rem)] font-semibold leading-[0.92] tracking-[-0.075em] text-white">
              From brief to executable prompt.
            </h2>
          </div>
        </div>

        {/* Right */}
        <div className="border-t border-white/[0.08]" ref={rightRef}>
          {processSteps.map((step, i) => (
            <div
              key={step}
              className={[
                "grid gap-6 border-b border-white/[0.08] py-8 sm:grid-cols-[4rem_1fr] reveal-up",
                rightInView ? "in-view" : "",
              ].join(" ")}
              style={{ transitionDelay: rightInView ? staggerDelay(i, 70) : "0ms" }}
            >
              <p className="font-display text-2xl font-semibold tracking-[-0.05em] text-zinc-600">
                {String(i + 1).padStart(2, "0")}
              </p>
              <p className="text-2xl font-medium tracking-[-0.04em] text-white sm:text-3xl">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   07 – Tool ecosystem
───────────────────────────────────────────────── */
const tools = [
  "Midjourney",
  "Flux",
  "Firefly",
  "Runway",
  "Kling",
  "Sora",
  "DALL-E",
  "Any visual AI tool",
] as const;

export function ToolEcosystemSection() {
  const [ref, inView] = useInView({ threshold: 0.2 });

  return (
    <section className="relative overflow-hidden px-5 py-28 sm:px-8 sm:py-44 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(16,163,127,0.14),transparent_50%)]" />

      <div className="relative mx-auto max-w-[1560px] text-center" ref={ref}>
        <div
          className={["reveal-up", inView ? "in-view" : ""].join(" ")}
          style={{ transitionDelay: inView ? "0ms" : "0ms" }}
        >
          <h2 className="font-display text-[clamp(4rem,11vw,12rem)] font-semibold leading-[0.86] tracking-[-0.085em] text-white">
            Build here.
            <span className="block text-white/30">Execute anywhere.</span>
          </h2>
        </div>

        <div
          className={["reveal-up", inView ? "in-view" : ""].join(" ")}
          style={{ transitionDelay: inView ? "160ms" : "0ms" }}
        >
          <p className="mx-auto mt-10 max-w-xl text-lg leading-8 text-zinc-400">
            Rune prepares the direction. You choose where to generate.
          </p>
        </div>

        <div
          className={["reveal-up", inView ? "in-view" : ""].join(" ")}
          style={{ transitionDelay: inView ? "280ms" : "0ms" }}
        >
          <div className="mx-auto mt-14 flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-zinc-500">
            {tools.map((tool, i) => (
              <span className="inline-flex items-center gap-5" key={tool}>
                <span className="transition-colors duration-200 hover:text-zinc-300">
                  {tool}
                </span>
                {i < tools.length - 1 ? (
                  <span className="text-zinc-800">/</span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   08 – Final CTA
───────────────────────────────────────────────── */
export function FinalCtaSection({ onStart }: { onStart: () => void }) {
  const [ref, inView] = useInView({ threshold: 0.2 });

  return (
    <section className="mx-auto max-w-[1560px] px-5 py-24 sm:px-8 sm:py-36 lg:px-10">
      <div
        className={[
          "relative overflow-hidden border border-white/[0.07] bg-[#111111] px-8 py-24 text-center sm:px-14 sm:py-32 reveal-up",
          inView ? "in-view" : "",
        ].join(" ")}
        ref={ref}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(16,163,127,0.14),transparent_56%)]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/[0.03]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/[0.02]" />

        <div className="relative">
          <div
            className={["reveal-up", inView ? "in-view" : ""].join(" ")}
            style={{ transitionDelay: inView ? "100ms" : "0ms" }}
          >
            <h2 className="font-display text-[clamp(3.4rem,8.8vw,9.5rem)] font-semibold leading-[0.88] tracking-[-0.08em] text-white">
              Start with an idea.
              <span className="block text-white/30">Leave with a prompt.</span>
            </h2>
          </div>

          <div
            className={["reveal-up", inView ? "in-view" : ""].join(" ")}
            style={{ transitionDelay: inView ? "240ms" : "0ms" }}
          >
            <p className="mt-8 text-lg text-zinc-400">
              Rune is the layer before generation.
            </p>
          </div>

          <div
            className={["reveal-up", inView ? "in-view" : ""].join(" ")}
            style={{ transitionDelay: inView ? "360ms" : "0ms" }}
          >
            <button
              className="group mt-10 inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-8 text-sm font-bold text-[#171717] transition-all duration-300 hover:bg-zinc-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              onClick={onStart}
              type="button"
            >
              Start now
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
