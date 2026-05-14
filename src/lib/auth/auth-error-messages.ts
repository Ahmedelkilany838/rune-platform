export function getFriendlyAuthErrorMessage(message: string | null | undefined) {
  const normalized = message?.toLowerCase() ?? "";

  if (!normalized) {
    return "Authentication could not be completed. Try again.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many") ||
    normalized.includes("over_email_send_rate_limit")
  ) {
    return "Too many requests. Try again in a few minutes.";
  }

  if (
    normalized.includes("otp") ||
    normalized.includes("token") ||
    normalized.includes("expired") ||
    normalized.includes("invalid")
  ) {
    return "Invalid or expired verification code.";
  }

  if (normalized.includes("oauth") || normalized.includes("provider") || normalized.includes("google")) {
    return "Google sign-in could not be completed.";
  }

  if (normalized.includes("email")) {
    return "Enter a valid email address.";
  }

  return "Authentication could not be completed. Try again.";
}
