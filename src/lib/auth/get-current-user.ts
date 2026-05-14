import type { User } from "@supabase/supabase-js";
import type { UserProfileRow } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export type CurrentUserResult =
  | {
      ok: true;
      profile: UserProfileRow;
      user: User;
    }
  | {
      error: "not_authenticated" | "profile_not_found" | "profile_query_failed";
      ok: false;
      user?: User;
    };

export async function getCurrentUser(): Promise<CurrentUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "not_authenticated",
      ok: false
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      error: "profile_query_failed",
      ok: false,
      user
    };
  }

  if (!profile) {
    return {
      error: "profile_not_found",
      ok: false,
      user
    };
  }

  return {
    ok: true,
    profile,
    user
  };
}
