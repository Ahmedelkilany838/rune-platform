import type { AuthError } from "@supabase/supabase-js";
import { getFriendlyAuthErrorMessage } from "@/lib/auth/auth-error-messages";

export type EmailOtpSignInClient = {
  auth: {
    signInWithOtp(input: {
      email: string;
      options: {
        shouldCreateUser: true;
      };
    }): Promise<{
      error: AuthError | null;
    }>;
  };
};

export type EmailOtpSignInResult =
  | {
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

export function getAuthConfirmRedirectUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/auth/confirm`;
}

export async function signInWithEmailOtp({
  email,
  origin,
  supabase
}: {
  email: string;
  origin: string;
  supabase: EmailOtpSignInClient;
}): Promise<EmailOtpSignInResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      error: "Enter your email address.",
      ok: false
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true
    }
  });

  if (error) {
    return {
      error: getFriendlyAuthErrorMessage(error.message),
      ok: false
    };
  }

  return {
    ok: true
  };
}
