import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { UserProfileRow, WorkspaceMemberRow, WorkspaceRow } from "@/lib/db/types";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_WORKSPACE_COOKIE = "acd_active_workspace_id";

export type ActiveWorkspaceResult =
  | {
      membership: WorkspaceMemberRow;
      ok: true;
      profile: UserProfileRow;
      user: User;
      workspace: WorkspaceRow;
    }
  | {
      error:
        | "not_authenticated"
        | "profile_not_found"
        | "profile_query_failed"
        | "workspace_membership_not_found"
        | "workspace_membership_query_failed"
        | "workspace_not_found"
        | "workspace_query_failed";
      ok: false;
      profile?: UserProfileRow;
      user?: User;
    };

async function getMembershipForWorkspace(userId: string, workspaceId: string) {
  const supabase = await createClient();

  return supabase
    .from("workspace_members")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
}

async function getFirstMembership(userId: string) {
  const supabase = await createClient();

  return supabase
    .from("workspace_members")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
}

export async function getActiveWorkspace(): Promise<ActiveWorkspaceResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser.ok) {
    return currentUser;
  }

  const cookieStore = await cookies();
  const requestedWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  let membership: WorkspaceMemberRow | null = null;

  if (requestedWorkspaceId) {
    const { data, error } = await getMembershipForWorkspace(currentUser.profile.id, requestedWorkspaceId);

    if (error) {
      return {
        error: "workspace_membership_query_failed",
        ok: false,
        profile: currentUser.profile,
        user: currentUser.user
      };
    }

    membership = data;
  }

  if (!membership) {
    const { data, error } = await getFirstMembership(currentUser.profile.id);

    if (error) {
      return {
        error: "workspace_membership_query_failed",
        ok: false,
        profile: currentUser.profile,
        user: currentUser.user
      };
    }

    membership = data;
  }

  if (!membership) {
    return {
      error: "workspace_membership_not_found",
      ok: false,
      profile: currentUser.profile,
      user: currentUser.user
    };
  }

  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", membership.workspace_id)
    .maybeSingle();

  if (workspaceError) {
    return {
      error: "workspace_query_failed",
      ok: false,
      profile: currentUser.profile,
      user: currentUser.user
    };
  }

  if (!workspace) {
    return {
      error: "workspace_not_found",
      ok: false,
      profile: currentUser.profile,
      user: currentUser.user
    };
  }

  return {
    membership,
    ok: true,
    profile: currentUser.profile,
    user: currentUser.user,
    workspace
  };
}
