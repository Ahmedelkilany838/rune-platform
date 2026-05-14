import { describe, expect, it, vi } from "vitest";
import {
  getAuthConfirmRedirectUrl,
  signInWithEmailOtp,
  type EmailOtpSignInClient
} from "@/lib/auth/sign-in-with-email-otp";

describe("signInWithEmailOtp", () => {
  it("builds the auth confirmation redirect URL", () => {
    expect(getAuthConfirmRedirectUrl("http://localhost:3000/")).toBe("http://localhost:3000/auth/confirm");
  });

  it("sends an email OTP code with user creation enabled", async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }));
    const from = vi.fn();

    const result = await signInWithEmailOtp({
      email: "  User@Example.COM ",
      origin: "http://localhost:3000",
      supabase: {
        auth: {
          signInWithOtp
        },
        from
      } as EmailOtpSignInClient & { from: typeof from }
    });

    expect(result.ok).toBe(true);
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: {
        shouldCreateUser: true
      }
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns a clear local validation error for blank email", async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }));

    const result = await signInWithEmailOtp({
      email: " ",
      origin: "http://localhost:3000",
      supabase: {
        auth: {
          signInWithOtp
        }
      }
    });

    expect(result).toEqual({
      error: "Enter your email address.",
      ok: false
    });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });
});
