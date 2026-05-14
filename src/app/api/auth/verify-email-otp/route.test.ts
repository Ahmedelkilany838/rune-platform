import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock
}));

import { POST } from "@/app/api/auth/verify-email-otp/route";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth/get-active-workspace";

function request(body: object) {
  return new NextRequest("http://localhost:3000/api/auth/verify-email-otp", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
}

function supabaseMock({
  onboardingData = [{ user_id: "user-id", workspace_id: "workspace-id" }],
  onboardingError = null,
  verifyOtpError = null
}: {
  onboardingData?: { user_id: string; workspace_id: string }[] | null;
  onboardingError?: { message: string } | null;
  verifyOtpError?: { message: string } | null;
} = {}) {
  return {
    auth: {
      verifyOtp: vi.fn(async () => ({ error: verifyOtpError }))
    },
    rpc: vi.fn(async () => ({
      data: onboardingData,
      error: onboardingError
    }))
  };
}

describe("POST /api/auth/verify-email-otp", () => {
  afterEach(() => {
    createClientMock.mockReset();
  });

  it("verifies the six-digit email code and runs onboarding", async () => {
    const supabase = supabaseMock({
      onboardingData: [
        {
          user_id: "11111111-1111-4111-8111-111111111111",
          workspace_id: "22222222-2222-4222-8222-222222222222"
        }
      ]
    });
    createClientMock.mockResolvedValue(supabase);

    const response = await POST(
      request({
        email: "User@Example.com",
        token: "123456"
      })
    );
    const payload = (await response.json()) as { ok: boolean; redirectTo: string };
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      token: "123456",
      type: "email"
    });
    expect(supabase.rpc).toHaveBeenCalledWith("ensure_user_onboarding");
    expect(payload).toEqual({
      ok: true,
      redirectTo: "/chat"
    });
    expect(setCookie).toContain(`${ACTIVE_WORKSPACE_COOKIE}=22222222-2222-4222-8222-222222222222`);
  });

  it("rejects invalid code shape before calling Supabase", async () => {
    const supabase = supabaseMock();
    createClientMock.mockResolvedValue(supabase);

    const response = await POST(
      request({
        email: "user@example.com",
        token: "12"
      })
    );
    const payload = (await response.json()) as { error: string; ok: boolean };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("does not expose Supabase verification details when the code fails", async () => {
    const supabase = supabaseMock({
      verifyOtpError: {
        message: "internal auth detail"
      }
    });
    createClientMock.mockResolvedValue(supabase);

    const response = await POST(
      request({
        email: "user@example.com",
        token: "123456"
      })
    );
    const payload = (await response.json()) as { error: string; ok: boolean };

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Invalid or expired verification code.");
    expect(payload.error).not.toContain("internal auth detail");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("does not reference service role keys in the verification route", () => {
    const combined = readFileSync(join(process.cwd(), "src/app/api/auth/verify-email-otp/route.ts"), "utf8");

    expect(combined).not.toMatch(/SERVICE_ROLE/i);
    expect(combined).not.toMatch(/service_role/i);
  });
});
