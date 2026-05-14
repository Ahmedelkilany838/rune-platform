import { Loader2 } from "lucide-react";

function GoogleMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#1a73e8]"
    >
      G
    </span>
  );
}

export function GoogleAuthButton({
  busy,
  loading,
  onClick
}: {
  busy: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white/[0.035] px-4 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/[0.065] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
      Continue with Google
    </button>
  );
}
