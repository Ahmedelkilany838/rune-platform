import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { AuthAlert } from "@/components/auth/auth-alert";

export function EmailOtpForm({
  busy,
  email,
  error,
  loading,
  notice,
  onBack,
  onEmailChange,
  onSubmit
}: {
  busy: boolean;
  email: string;
  error: string | null;
  loading: boolean;
  notice: string | null;
  onBack: () => void;
  onEmailChange: (email: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <button
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 transition hover:text-white"
        disabled={busy}
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All sign-in options
      </button>
      <label className="block text-sm font-medium text-zinc-300" htmlFor="email">
        Email address
      </label>
      <input
        autoComplete="email"
        className={`h-12 w-full rounded-2xl border bg-black/22 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:ring-4 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "border-red-300/35 focus:border-red-300/60" : "border-white/12 focus:border-white/25"
        }`}
        disabled={busy}
        id="email"
        inputMode="email"
        onChange={(event) => onEmailChange(event.target.value)}
        placeholder="name@company.com"
        required
        type="email"
        value={email}
      />
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
      {notice ? <AuthAlert tone="success">{notice}</AuthAlert> : null}
      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#171717] transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        disabled={busy}
        type="submit"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending code...
          </>
        ) : (
          <>
            Send code
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
