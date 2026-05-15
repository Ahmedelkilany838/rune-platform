import { Suspense } from "react";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth/get-active-workspace";
import { getAppUser } from "@/lib/auth/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/?auth=login");
  }

  const { data, error } = await supabase.rpc("ensure_user_onboarding");
  const workspaceId = data?.[0]?.workspace_id ?? null;

  if (error || !workspaceId) {
    redirect("/?auth=login&error=onboarding_failed");
  }

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (activeWorkspaceId !== workspaceId) {
    redirect("/auth/onboard" as Route);
  }

  return (
    <Suspense fallback={<div className="h-screen w-screen bg-black" />}>
      <AppShell user={getAppUser(user)} />
    </Suspense>
  );
}
