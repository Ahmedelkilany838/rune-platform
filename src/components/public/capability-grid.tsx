import { featuredCapabilities } from "@/lib/public/capabilities";
import { CapabilityCard } from "@/components/public/capability-card";

export function CapabilityGrid({ onOpenAuth }: { onOpenAuth: () => void }) {
  return (
    <section className="mx-auto w-full max-w-[1560px] px-5 py-24 sm:px-8 sm:py-32 lg:px-10" id="workflows">
      <div className="mb-16 grid gap-6 lg:grid-cols-[0.95fr_1fr] lg:items-end">
        <h2 className="font-display text-[clamp(3rem,8vw,8.5rem)] font-semibold leading-[0.88] tracking-[-0.07em] text-white">
          Direction modules.
        </h2>
        <p className="max-w-xl text-lg leading-8 text-zinc-400">
          Choose the kind of creative direction you want to build.
        </p>
      </div>
      <div className="border-b border-white/[0.08]">
        {featuredCapabilities.map((capability, index) => (
          <CapabilityCard capability={capability} index={index} key={capability.title} onOpenAuth={onOpenAuth} />
        ))}
      </div>
    </section>
  );
}
