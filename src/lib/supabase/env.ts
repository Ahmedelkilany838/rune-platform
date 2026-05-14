const SUPABASE_PUBLIC_ENV_KEYS = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  anonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY"
} as const;

type SupabasePublicEnvKey = (typeof SUPABASE_PUBLIC_ENV_KEYS)[keyof typeof SUPABASE_PUBLIC_ENV_KEYS];

export type SupabasePublicEnv = {
  anonKey: string;
  url: string;
};

export type SupabaseEnvStatus =
  | {
      env: SupabasePublicEnv;
      ok: true;
    }
  | {
      missing: SupabasePublicEnvKey[];
      ok: false;
    };

export function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function getSupabaseEnvStatus(): SupabaseEnvStatus {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const url = normalizeSupabaseUrl(rawUrl);
  const anonKey = rawAnonKey.trim();

  const missing: SupabasePublicEnvKey[] = [];

  if (!url) missing.push(SUPABASE_PUBLIC_ENV_KEYS.url);
  if (!anonKey) missing.push(SUPABASE_PUBLIC_ENV_KEYS.anonKey);

  if (missing.length > 0) {
    return {
      missing,
      ok: false
    };
  }

  return {
    env: {
      anonKey,
      url
    },
    ok: true
  };
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const status = getSupabaseEnvStatus();

  if (!status.ok) {
    throw new Error(`Missing Supabase public environment variables: ${status.missing.join(", ")}`);
  }

  return status.env;
}
