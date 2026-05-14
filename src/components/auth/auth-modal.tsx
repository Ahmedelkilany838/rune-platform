"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Mail, ShieldCheck, Sparkles, X } from "lucide-react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthVisualPanel } from "@/components/auth/auth-visual-panel";
import { EmailOtpForm } from "@/components/auth/email-otp-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { OtpVerificationForm } from "@/components/auth/otp-verification-form";
import { signInWithEmailOtp } from "@/lib/auth/sign-in-with-email-otp";
import { signInWithGoogleOAuth } from "@/lib/auth/sign-in-with-google-oauth";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnvStatus } from "@/lib/supabase/env";

export type AuthMode = "login" | "signup";
type AuthPanel = "choices" | "email" | "code";
type AuthAction = "google" | "send-code" | "verify-code" | null;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("aria-hidden"));
}

export function AuthModal({
  initialError,
  mode,
  onClose,
  open
}: {
  initialError: string | null;
  mode: AuthMode;
  onClose: () => void;
  open: boolean;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [panel, setPanel] = useState<AuthPanel>("choices");
  const [action, setAction] = useState<AuthAction>(null);
  const modalRef = useRef<HTMLElement | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const busy = action !== null;

  useEffect(() => {
    if (!open) return;

    setPanel("choices");
    setCode("");
    setNotice(null);
    setError(initialError);

    window.setTimeout(() => {
      const modal = modalRef.current;
      const firstFocusable = modal ? getFocusableElements(modal)[0] : null;
      firstFocusable?.focus();
    }, 0);
  }, [initialError, mode, open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = getFocusableElements(modal);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  if (!open) return null;

  function validateSupabaseEnv() {
    const envStatus = getSupabaseEnvStatus();

    if (!envStatus.ok) {
      setError(`Missing Supabase configuration: ${envStatus.missing.join(", ")}. Restart the dev server after updating .env.local.`);
      return false;
    }

    return true;
  }

  async function sendCode() {
    setError(null);
    setNotice(null);

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      setPanel("email");
      return;
    }

    if (!validateSupabaseEnv()) return;

    setAction("send-code");

    try {
      const result = await signInWithEmailOtp({
        email,
        origin: window.location.origin,
        supabase: createClient()
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setCode("");
      setPanel("code");
      setNotice("Verification code sent. Your workspace will be prepared after confirmation.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setAction(null);
    }
  }

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendCode();
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (code.length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setAction("verify-code");

    try {
      const response = await fetch("/api/auth/verify-email-otp", {
        body: JSON.stringify({
          email: normalizedEmail,
          token: code
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = (await response.json()) as {
        error?: string;
        ok: boolean;
        redirectTo?: string;
      };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Invalid or expired verification code.");
        return;
      }

      setNotice("Preparing workspace.");
      window.location.assign(result.redirectTo ?? "/chat");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setAction(null);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setNotice(null);

    if (!validateSupabaseEnv()) return;

    setAction("google");

    try {
      const result = await signInWithGoogleOAuth({
        origin: window.location.origin,
        supabase: createClient()
      });

      if (!result.ok) {
        setError(result.error);
      }
    } catch {
      setError("Google sign-in could not be completed.");
    } finally {
      setAction(null);
    }
  }

  return (
    <div
      aria-labelledby="auth-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/76 px-4 py-6 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div
        aria-hidden="true"
        className="auth-modal-backdrop absolute inset-0"
        onMouseDown={() => {
          if (!busy) {
            onClose();
          }
        }}
      />
      <section
        className="auth-sheet relative z-10 grid max-h-[calc(100dvh-32px)] w-full max-w-[940px] overflow-hidden rounded-[30px] border border-white/10 bg-[#171717] shadow-[0_34px_140px_rgba(0,0,0,0.7)] sm:grid-cols-[0.92fr_1fr]"
        ref={modalRef}
      >
        <button
          aria-label="Close"
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="max-h-[calc(100dvh-32px)] overflow-y-auto p-7 sm:p-10">
          <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#202020] text-zinc-100">
            <Sparkles className="h-4 w-4" />
          </div>
          <h1 className="text-center text-3xl font-black tracking-tight text-white" id="auth-modal-title">
            {mode === "signup" ? "Enter Rune" : "Continue to Rune"}
          </h1>
          <p className="mt-2 text-center text-sm leading-6 text-zinc-500">
            Use email verification or Google. Rune prepares your workspace after verification.
          </p>

          <div className="mt-8 space-y-3">
            {panel === "choices" ? (
              <>
                <GoogleAuthButton busy={busy} loading={action === "google"} onClick={() => void handleGoogleSignIn()} />

                <div className="relative py-2 text-center">
                  <div className="absolute left-0 top-1/2 h-px w-full bg-white/10" />
                  <span className="relative bg-[#171717] px-3 text-xs text-zinc-500">OR</span>
                </div>

                <button
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white/[0.035] px-4 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/[0.065]"
                  onClick={() => {
                    setError(null);
                    setNotice(null);
                    setPanel("email");
                  }}
                  type="button"
                >
                  <Mail className="h-4 w-4" />
                  Continue with Email
                </button>

                {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
              </>
            ) : null}

            {panel === "email" ? (
              <EmailOtpForm
                busy={busy}
                email={email}
                error={error}
                loading={action === "send-code"}
                notice={notice}
                onBack={() => setPanel("choices")}
                onEmailChange={setEmail}
                onSubmit={handleSendCode}
              />
            ) : null}

            {panel === "code" ? (
              <OtpVerificationForm
                busy={busy}
                code={code}
                email={normalizedEmail}
                error={error}
                loading={action === "verify-code"}
                notice={notice}
                onBack={() => setPanel("email")}
                onCodeChange={setCode}
                onResend={() => void sendCode()}
                onSubmit={handleVerifyCode}
              />
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-center text-xs leading-5 text-zinc-500">
            <ShieldCheck className="h-4 w-4 text-zinc-400" />
            Email OTP and Google are secured by Supabase Auth.
          </div>
        </div>

        <AuthVisualPanel />
      </section>
    </div>
  );
}
