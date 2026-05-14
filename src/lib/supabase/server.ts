import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db/types";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function createClient() {
  const { anonKey, url } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies directly. Auth middleware/proxy owns refresh behavior.
        }
      }
    }
  });
}
