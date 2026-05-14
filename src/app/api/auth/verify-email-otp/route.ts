import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth/get-active-workspace";
import { getFriendlyAuthErrorMessage } from "@/lib/auth/auth-error-messages";
import { createClient } from "@/lib/supabase/server";

type VerifyEmailOtpBody = {
  email?: unknown;
  token?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      error: message,
      ok: false
    },
    {
      status
    }
  );
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeToken(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, "") : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  let body: VerifyEmailOtpBody;

  try {
    body = (await request.json()) as VerifyEmailOtpBody;
  } catch {
    return jsonError("Invalid verification request.", 400);
  }

  const email = normalizeEmail(body.email);
  const token = normalizeToken(body.token);

  if (!isValidEmail(email)) {
    return jsonError("Enter a valid email address.", 400);
  }

  if (!/^\d{6}$/.test(token)) {
    return jsonError("Enter the 6-digit verification code.", 400);
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email"
  });

  if (verifyError) {
    const friendlyError = getFriendlyAuthErrorMessage(verifyError.message);
    return jsonError(
      friendlyError === "Authentication could not be completed. Try again."
        ? "Invalid or expired verification code."
        : friendlyError,
      401
    );
  }

  const { data, error: onboardingError } = await supabase.rpc("ensure_user_onboarding");
  const workspaceId = data?.[0]?.workspace_id ?? null;

  if (onboardingError || !workspaceId) {
    return jsonError("Your account was verified, but workspace setup could not be completed.", 500);
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: "/chat"
  });

  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
