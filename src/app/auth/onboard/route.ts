import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth/get-active-workspace";
import { createClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return redirectTo(request, "/?auth=login");
  }

  const { data, error } = await supabase.rpc("ensure_user_onboarding");
  const workspaceId = data?.[0]?.workspace_id ?? null;

  if (error || !workspaceId) {
    return redirectTo(request, "/?auth=login&error=onboarding_failed");
  }

  const response = redirectTo(request, "/chat");
  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
