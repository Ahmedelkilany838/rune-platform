import { describe, expect, it, vi } from "vitest";
import { signInWithGoogleOAuth, type GoogleOAuthSignInClient } from "@/lib/auth/sign-in-with-google-oauth";

describe("signInWithGoogleOAuth", () => {
  it("starts Google OAuth with the auth confirmation redirect", async () => {
    const signInWithOAuth = vi.fn(async () => ({ error: null }));

    const result = await signInWithGoogleOAuth({
      origin: "http://localhost:3000",
      supabase: {
        auth: {
          signInWithOAuth
        }
      } as unknown as GoogleOAuthSignInClient
    });

    expect(result).toEqual({ ok: true });
    expect(signInWithOAuth).toHaveBeenCalledWith({
      options: {
        redirectTo: "http://localhost:3000/auth/confirm"
      },
      provider: "google"
    });
  });

  it("returns a friendly Google OAuth error", async () => {
    const signInWithOAuth = vi.fn(async () => ({
      error: {
        message: "OAuth provider is not enabled"
      }
    }));

    const result = await signInWithGoogleOAuth({
      origin: "http://localhost:3000",
      supabase: {
        auth: {
          signInWithOAuth
        }
      } as unknown as GoogleOAuthSignInClient
    });

    expect(result).toEqual({
      error: "Google sign-in could not be completed.",
      ok: false
    });
  });
});
