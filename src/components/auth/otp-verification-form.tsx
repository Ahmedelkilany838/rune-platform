import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { AuthAlert } from "@/components/auth/auth-alert";

function OtpCodeField({
  busy,
  code,
  onChange
}: {
  busy: boolean;
  code: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="relative">
      <input
        aria-label="Six digit verification code"
        autoComplete="one-time-code"
        className="peer absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        disabled={busy}
        id="code"
        inputMode="numeric"
        maxLength={6}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        onPaste={(event) => {
          event.preventDefault();
          onChange(event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
        }}
        required
        type="text"
        value={code}
      />
      <div
        aria-hidden="true"
        className="grid grid-cols-6 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 transition peer-focus:border-white/25 peer-focus:ring-4 peer-focus:ring-white/10"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className={`flex h-11 items-center justify-center rounded-2xl border text-lg font-semibold transition ${
              code[index]
                ? "border-emerald-200/35 bg-emerald-300/12 text-white shadow-[0_0_24px_rgba(16,163,127,0.12)]"
                : "border-white/[0.07] bg-white/[0.035] text-zinc-600"
            }`}
            key={index}
          >
            {code[index] ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OtpVerificationForm({
  busy,
  code,
  email,
  error,
  loading,
  notice,
  onBack,
  onCodeChange,
  onResend,
  onSubmit
}: {
  busy: boolean;
  code: string;
  email: string;
  error: string | null;
  loading: boolean;
  notice: string | null;
  onBack: () => void;
  onCodeChange: (code: string) => void;
  onResend: () => void;
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
        Change email
      </button>
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-sm font-bold text-white">Enter your verification code</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Sent to {email}</p>
      </div>
      <OtpCodeField busy={busy} code={code} onChange={onCodeChange} />
      {notice ? <AuthAlert tone="success">{notice}</AuthAlert> : null}
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#171717] transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        disabled={busy || code.length !== 6}
        type="submit"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
                          Preparing workspace
          </>
        ) : (
          <>
            Verify code
            <KeyRound className="h-4 w-4" />
          </>
        )}
      </button>
      <button
        className="w-full text-center text-xs font-semibold text-zinc-500 transition hover:text-white"
        disabled={busy}
        onClick={onResend}
        type="button"
      >
        Resend code
      </button>
    </form>
  );
}
