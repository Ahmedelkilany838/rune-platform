import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseEnvStatus, normalizeSupabaseUrl } from "@/lib/supabase/env";

describe("Supabase public env", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("normalizes accidental REST API suffixes and trailing slashes", () => {
    expect(normalizeSupabaseUrl("https://example.supabase.co/rest/v1/")).toBe("https://example.supabase.co");
    expect(normalizeSupabaseUrl("https://example.supabase.co/")).toBe("https://example.supabase.co");
  });

  it("reads only the public Supabase environment values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/rest/v1/";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = " local-anon-key ";

    const status = getSupabaseEnvStatus();

    expect(status).toEqual({
      env: {
        anonKey: "local-anon-key",
        url: "https://example.supabase.co"
      },
      ok: true
    });
  });

  it("reports missing variable names without exposing key values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = " ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = " ";

    const status = getSupabaseEnvStatus();

    expect(status).toEqual({
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      ok: false
    });
  });
});
