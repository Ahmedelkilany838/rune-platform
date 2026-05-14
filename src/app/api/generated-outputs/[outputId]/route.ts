import { NextResponse } from "next/server";
import { getActiveWorkspace } from "@/lib/auth/get-active-workspace";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    outputId?: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { outputId } = await context.params;

  if (!outputId) {
    return NextResponse.json({ ok: false, error: "missing_output_id" }, { status: 400 });
  }

  const activeWorkspace = await getActiveWorkspace();

  if (!activeWorkspace.ok) {
    const status = activeWorkspace.error === "not_authenticated" ? 401 : 403;
    return NextResponse.json({ ok: false, error: activeWorkspace.error }, { status });
  }

  const supabase = await createClient();
  const { data: output, error: outputError } = await supabase
    .from("generated_outputs")
    .select(
      "id, prompt_request_id, output_type, final_prompt, avoid_constraints, structured_output, platform_parameters, used_knowledge_blocks, used_prompt_rules, used_platform_rules, generation_metadata, quality_score, validation_status, status, created_at, updated_at"
    )
    .eq("id", outputId)
    .maybeSingle();

  if (outputError) {
    return NextResponse.json({ ok: false, error: "generated_output_query_failed" }, { status: 500 });
  }

  if (!output) {
    return NextResponse.json({ ok: false, error: "generated_output_not_found" }, { status: 404 });
  }

  const { data: promptRequest, error: promptRequestError } = await supabase
    .from("prompt_requests")
    .select("id, workspace_id, user_id, raw_input, output_type, status")
    .eq("id", output.prompt_request_id)
    .maybeSingle();

  if (promptRequestError) {
    return NextResponse.json({ ok: false, error: "prompt_request_query_failed" }, { status: 500 });
  }

  if (!promptRequest || promptRequest.workspace_id !== activeWorkspace.workspace.id) {
    return NextResponse.json({ ok: false, error: "generated_output_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    output
  });
}
