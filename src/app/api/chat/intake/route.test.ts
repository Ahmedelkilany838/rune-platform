import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const getActiveWorkspaceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/get-active-workspace", () => ({
  getActiveWorkspace: getActiveWorkspaceMock
}));

import { POST } from "@/app/api/chat/intake/route";

function request(body: unknown) {
  return new Request("http://localhost/api/chat/intake", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function json(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function authenticatedWorkspace({
  userId = "99999999-9999-4999-8999-999999999999",
  workspaceId = "88888888-8888-4888-8888-888888888888"
} = {}) {
  return {
    membership: {
      created_at: "2026-01-01T00:00:00.000Z",
      id: "membership-id",
      permissions: { all: true },
      role: "owner",
      updated_at: "2026-01-01T00:00:00.000Z",
      user_id: userId,
      workspace_id: workspaceId
    },
    ok: true,
    profile: {
      avatar_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
      default_language: "en",
      full_name: "Phase Test User",
      id: userId,
      role: "admin",
      status: "active",
      timezone: "Africa/Cairo",
      updated_at: "2026-01-01T00:00:00.000Z"
    },
    user: {
      id: userId
    },
    workspace: {
      billing_status: null,
      created_at: "2026-01-01T00:00:00.000Z",
      id: workspaceId,
      name: "Test Workspace",
      owner_id: userId,
      plan: "team",
      settings: {},
      updated_at: "2026-01-01T00:00:00.000Z"
    }
  };
}

describe("POST /api/chat/intake", () => {
  afterEach(() => {
    delete process.env.N8N_CHAT_INTAKE_WEBHOOK_URL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    getActiveWorkspaceMock.mockReset();
  });

  it("returns 400 for empty message_text", async () => {
    const response = await POST(request({ message_text: " ", conversation_session_id: null }));
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body.errors).toEqual(["message_text_required"]);
  });

  it("returns 400 for over-limit message_text", async () => {
    const response = await POST(request({ message_text: "x".repeat(12001), conversation_session_id: null }));
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body.errors).toEqual(["message_text_too_long"]);
  });

  it("returns 500 without exposing the webhook when env is missing", async () => {
    const response = await POST(request({ message_text: "Create an image prompt", conversation_session_id: null }));
    const body = await json(response);

    expect(response.status).toBe(500);
    expect(body.errors).toEqual(["n8n_chat_intake_webhook_url_missing"]);
    expect(JSON.stringify(body)).not.toContain("https://");
    expect(JSON.stringify(body)).not.toContain("N8N_CHAT_INTAKE_WEBHOOK_URL=");
  });

  it("returns 401 when the request has no authenticated Supabase user", async () => {
    process.env.N8N_CHAT_INTAKE_WEBHOOK_URL = "https://n8n.example.test/webhook/wf-00a";
    getActiveWorkspaceMock.mockResolvedValue({
      error: "not_authenticated",
      ok: false
    });

    const response = await POST(request({ message_text: "Create an image prompt", conversation_session_id: null }));
    const body = await json(response);

    expect(response.status).toBe(401);
    expect(body.errors).toEqual(["authentication_required"]);
  });

  it("returns 403 when the authenticated user has no workspace membership", async () => {
    process.env.N8N_CHAT_INTAKE_WEBHOOK_URL = "https://n8n.example.test/webhook/wf-00a";
    getActiveWorkspaceMock.mockResolvedValue({
      error: "workspace_membership_not_found",
      ok: false
    });

    const response = await POST(request({ message_text: "Create an image prompt", conversation_session_id: null }));
    const body = await json(response);

    expect(response.status).toBe(403);
    expect(body.errors).toEqual(["workspace_membership_not_found"]);
  });

  it("calls n8n server-side with authenticated workspace identity and normalizes the response", async () => {
    process.env.N8N_CHAT_INTAKE_WEBHOOK_URL = "https://n8n.example.test/webhook/wf-00a";
    getActiveWorkspaceMock.mockResolvedValue(
      authenticatedWorkspace({
        userId: "99999999-9999-4999-8999-999999999999",
        workspaceId: "88888888-8888-4888-8888-888888888888"
      })
    );

    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe("https://n8n.example.test/webhook/wf-00a");
      const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;

      expect(payload.workspace_id).toBe("88888888-8888-4888-8888-888888888888");
      expect(payload.user_id).toBe("99999999-9999-4999-8999-999999999999");
      expect(payload.project_id).toBeNull();
      expect(payload.channel).toBe("frontend_chat");
      expect(payload.message_text).toBe("Create a luxury product ad");

      return new Response(
        JSON.stringify({
          message_to_user: "Generated.",
          conversation_session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          wf10_result: {
            wf10_status: "generated",
            prompt_request_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            generated_output_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            output_type: "product_ad_prompt",
            generation_layer: "layer_1_draft",
            debug: {
              create_generated_output_raw: {
                final_prompt: "A luxury product ad prompt.",
                avoid_constraints: "No generic studio lighting."
              }
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ message_text: "Create a luxury product ad", conversation_session_id: null }));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.generated_prompt).toBe("A luxury product ad prompt.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not reference service role keys in the frontend auth foundation", () => {
    const files = [
      "src/lib/supabase/client.ts",
      "src/lib/supabase/server.ts",
      "src/lib/auth/get-current-user.ts",
      "src/lib/auth/get-active-workspace.ts",
      "src/app/api/chat/intake/route.ts"
    ];

    const combined = files.map((file) => readFileSync(join(process.cwd(), file), "utf8")).join("\n");

    expect(combined).not.toMatch(/SERVICE_ROLE/i);
    expect(combined).not.toMatch(/service_role/i);
  });
});
