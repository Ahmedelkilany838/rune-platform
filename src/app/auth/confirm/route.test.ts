import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock
}));

import { GET } from "@/app/auth/confirm/route";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth/get-active-workspace";

function request(path: string) {
  return new NextRequest(new URL(`http://localhost:3000${path}`));
}

function supabaseMock({
  exchangeCodeError = null,
  onboardingData = [{ user_id: "user-id", workspace_id: "workspace-id" }],
  onboardingError = null,
  verifyOtpError = null
}: {
  exchangeCodeError?: { message: string } | null;
  onboardingData?: { user_id: string; workspace_id: string }[] | null;
  onboardingError?: { message: string } | null;
  verifyOtpError?: { message: string } | null;
} = {}) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({ error: exchangeCodeError })),
      verifyOtp: vi.fn(async () => ({ error: verifyOtpError }))
    },
    rpc: vi.fn(async () => ({
      data: onboardingData,
      error: onboardingError
    }))
  };
}

describe("GET /auth/confirm", () => {
  afterEach(() => {
    createClientMock.mockReset();
  });

  it("calls ensure_user_onboarding after successful token hash confirmation", async () => {
    const supabase = supabaseMock();
    createClientMock.mockResolvedValue(supabase);

    const response = await GET(request("/auth/confirm?token_hash=hash&type=email"));

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "hash",
      type: "email"
    });
    expect(supabase.rpc).toHaveBeenCalledWith("ensure_user_onboarding");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/chat");
  });

  it("redirects to login without SQL details when onboarding fails", async () => {
    const supabase = supabaseMock({
      onboardingError: {
        message: "internal SQL detail that must not be exposed"
      }
    });
    createClientMock.mockResolvedValue(supabase);

    const response = await GET(request("/auth/confirm?token_hash=hash&type=email"));

    expect(supabase.rpc).toHaveBeenCalledWith("ensure_user_onboarding");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=onboarding_failed");
    expect(response.headers.get("location")).not.toContain("internal SQL detail");
  });

  it("sets the active workspace cookie after successful OAuth auth code confirmation", async () => {
    const supabase = supabaseMock({
      onboardingData: [
        {
          user_id: "11111111-1111-4111-8111-111111111111",
          workspace_id: "22222222-2222-4222-8222-222222222222"
        }
      ]
    });
    createClientMock.mockResolvedValue(supabase);

    const response = await GET(request("/auth/confirm?code=auth-code"));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("auth-code");
    expect(response.headers.get("location")).toBe("http://localhost:3000/chat");
    expect(setCookie).toContain(`${ACTIVE_WORKSPACE_COOKIE}=22222222-2222-4222-8222-222222222222`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("does not reference service role keys in auth confirmation code", () => {
    const files = [
      "src/app/auth/confirm/route.ts",
      "src/lib/supabase/server.ts"
    ];

    const combined = files.map((file) => readFileSync(join(process.cwd(), file), "utf8")).join("\n");

    expect(combined).not.toMatch(/SERVICE_ROLE/i);
    expect(combined).not.toMatch(/service_role/i);
  });
});
