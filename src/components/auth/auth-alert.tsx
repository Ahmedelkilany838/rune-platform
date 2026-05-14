import { CheckCircle2 } from "lucide-react";

export function AuthAlert({ children, tone }: { children: React.ReactNode; tone: "error" | "success" }) {
  const styles =
    tone === "error"
      ? "border-red-400/18 bg-red-500/[0.08] text-red-100"
      : "border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100";

  return (
    <div className={`flex items-start gap-2 rounded-2xl border px-3.5 py-3 text-sm leading-5 ${styles}`}>
      {tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
      <span>{children}</span>
    </div>
  );
}
