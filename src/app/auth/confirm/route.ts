import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth/get-active-workspace";
import { createClient } from "@/lib/supabase/server";

function redirectWithError(request: NextRequest, error: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("auth", "login");
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

function redirectToChatWithWorkspace(request: NextRequest, workspaceId: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/chat";
  url.search = "";

  const response = NextResponse.redirect(url);
  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}

async function finishAuthenticatedConfirmation(request: NextRequest, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc("ensure_user_onboarding");
  const workspaceId = data?.[0]?.workspace_id ?? null;

  if (error || !workspaceId) {
    return redirectWithError(request, "onboarding_failed");
  }

  return redirectToChatWithWorkspace(request, workspaceId);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type
    });

    if (!error) {
      return finishAuthenticatedConfirmation(request, supabase);
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return finishAuthenticatedConfirmation(request, supabase);
    }
  }

  return redirectWithError(request, "auth_confirmation_failed");
}
