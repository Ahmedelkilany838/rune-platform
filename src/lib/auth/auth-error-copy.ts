import { getFriendlyAuthErrorMessage } from "@/lib/auth/auth-error-messages";

export function getReadableAuthError(error: string | null) {
  if (!error) return null;

  if (error === "auth_confirmation_failed") {
    return "Authentication could not be confirmed. Request a fresh code and try again.";
  }

  if (error === "onboarding_failed") {
    return "Your account was verified, but workspace setup could not be completed.";
  }

  if (error === "supabase_env_missing") {
    return "Supabase environment variables are missing. Add them to .env.local before signing in.";
  }

  return getFriendlyAuthErrorMessage(error);
}
