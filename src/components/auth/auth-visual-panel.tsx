import { CheckCircle2 } from "lucide-react";

export function AuthVisualPanel() {
  return (
    <div className="relative hidden min-h-[560px] overflow-hidden bg-[#111111] sm:block">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,163,127,0.24),transparent_44%),radial-gradient(circle_at_88%_18%,rgba(255,255,255,0.08),transparent_24%)]" />
      <div className="absolute left-[12%] top-[26%] h-20 w-[78%] -rotate-6 rounded-full bg-gradient-to-r from-transparent via-emerald-300/15 to-transparent blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/18 to-transparent" />
      <div className="absolute left-8 right-8 top-8 rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Workflow preview</p>
        <div className="mt-5 space-y-3">
          {["Brief intake", "Knowledge retrieval", "Prompt direction", "Validation & repair"].map((item) => (
            <div className="flex items-center gap-3 rounded-2xl bg-black/24 p-3" key={item}>
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span className="text-sm font-semibold text-white">{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-10 left-8 right-8">
        <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          Rune
        </span>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-tight text-white">
          Build here. Execute anywhere.
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/72">
          Turn ideas, briefs, and creative direction into AI-executable prompts.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <span className="h-1 rounded-full bg-emerald-500" />
          <span className="h-1 rounded-full bg-white/35" />
          <span className="h-1 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}
