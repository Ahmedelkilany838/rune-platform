import type { Capability, CapabilityStatus } from "@/lib/public/capabilities";

function getStatusClass(status: CapabilityStatus) {
  switch (status) {
    case "Available":
      return "text-emerald-200";
    case "Phase 1":
      return "text-zinc-300";
    case "Preview":
      return "text-zinc-300";
    case "Planned":
      return "text-zinc-500";
  }
}

export function CapabilityCard({
  capability,
  index,
  onOpenAuth
}: {
  capability: Capability;
  index: number;
  onOpenAuth: () => void;
}) {
  const Icon = capability.icon;
  const canStart = capability.status === "Available" || capability.status === "Phase 1";

  return (
    <article className="group border-t border-white/[0.08] py-7 transition-colors hover:border-white/20">
      <div className="grid gap-5 md:grid-cols-[5rem_minmax(0,0.95fr)_minmax(280px,1.1fr)_8rem] md:items-center">
        <div className="font-display text-2xl font-semibold tracking-[-0.05em] text-zinc-600">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] text-zinc-400 transition-colors group-hover:border-white/20 group-hover:text-white">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <h3 className="font-display text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            {capability.title}
          </h3>
        </div>
        <p className="max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">{capability.description}</p>
        <div className="flex items-center justify-between gap-4 md:justify-end">
          <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${getStatusClass(capability.status)}`}>
            {capability.status}
          </span>
          {canStart ? (
            <button
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              onClick={onOpenAuth}
              type="button"
            >
              Start
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-6 hidden h-px w-full origin-left scale-x-0 bg-gradient-to-r from-brand-400/40 via-white/10 to-transparent transition-transform duration-500 group-hover:scale-x-100 md:block" />
    </article>
  );
}
