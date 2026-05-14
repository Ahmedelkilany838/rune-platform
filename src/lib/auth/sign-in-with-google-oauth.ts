import type { AuthError } from "@supabase/supabase-js";
import { getFriendlyAuthErrorMessage } from "@/lib/auth/auth-error-messages";
import { getAuthConfirmRedirectUrl } from "@/lib/auth/sign-in-with-email-otp";

export type GoogleOAuthSignInClient = {
  auth: {
    signInWithOAuth(input: {
      options: {
        redirectTo: string;
      };
      provider: "google";
    }): Promise<{
      error: AuthError | null;
    }>;
  };
};

export type GoogleOAuthSignInResult =
  | {
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

export async function signInWithGoogleOAuth({
  origin,
  supabase
}: {
  origin: string;
  supabase: GoogleOAuthSignInClient;
}): Promise<GoogleOAuthSignInResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: getAuthConfirmRedirectUrl(origin)
    },
    provider: "google"
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
