import type { User } from "@supabase/supabase-js";

export type AppUser = {
  avatarUrl: string | null;
  email: string | null;
  name: string | null;
  planLabel: "Free" | "Plus" | "Premium" | string;
};

export function getAppUser(user: User): AppUser {
  const rawPlan =
    typeof user.app_metadata?.plan === "string"
      ? user.app_metadata.plan
      : typeof user.user_metadata?.plan === "string"
        ? user.user_metadata.plan
        : "free";
  const planLabel = rawPlan.trim()
    ? rawPlan.trim().charAt(0).toUpperCase() + rawPlan.trim().slice(1).toLowerCase()
    : "Free";

  return {
    avatarUrl: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    email: user.email ?? null,
    name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : null,
    planLabel
  };
}
