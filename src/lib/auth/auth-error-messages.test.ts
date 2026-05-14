import { describe, expect, it } from "vitest";
import { getFriendlyAuthErrorMessage } from "@/lib/auth/auth-error-messages";

describe("getFriendlyAuthErrorMessage", () => {
  it("maps rate limit errors to a friendly message", () => {
    expect(getFriendlyAuthErrorMessage("over_email_send_rate_limit")).toBe(
      "Too many requests. Try again in a few minutes."
    );
  });

  it("maps token failures to an OTP message", () => {
    expect(getFriendlyAuthErrorMessage("Token has expired or is invalid")).toBe(
      "Invalid or expired verification code."
    );
  });

  it("maps provider errors to a Google message", () => {
    expect(getFriendlyAuthErrorMessage("OAuth provider is disabled")).toBe("Google sign-in could not be completed.");
  });
});
