import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: getUserMock
    }
  }))
}));

import { middleware } from "@/middleware";

function request(pathname: string) {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`));
}

describe("middleware", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    getUserMock.mockReset();
  });

  it("redirects unauthenticated protected routes to login", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    getUserMock.mockResolvedValue({
      data: {
        user: null
      }
    });

    const response = await middleware(request("/create"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/?auth=login");
  });

  it("allows public login route without checking Supabase", async () => {
    const response = await middleware(request("/login"));

    expect(response.status).toBe(200);
    expect(getUserMock).not.toHaveBeenCalled();
  });
});
