import { describe, expect, it } from "vitest";
import { normalizeWorkflowResponse } from "@/lib/normalize-workflow-response";

const sessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const promptRequestId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const generatedOutputId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("normalizeWorkflowResponse", () => {
  it("normalizes a WF-00A merged response", () => {
    const response = normalizeWorkflowResponse({
      message_to_user: "Your prompt is ready.",
      conversation_session_id: sessionId,
      wf01_result: {
        prompt_request_id: promptRequestId,
        output_type: "image_prompt",
        platform: "midjourney"
      },
      wf10_result: {
        wf10_status: "generated",
        prompt_request_id: promptRequestId,
        generated_output_id: generatedOutputId,
        output_type: "image_prompt",
        platform: "midjourney",
        generation_layer: "layer_1_draft",
        next_workflow: "WF-11 Prompt Validation And Improvement Engine",
        errors: [],
        debug: {
          create_generated_output_raw: {
            id: generatedOutputId,
            prompt_request_id: promptRequestId,
            output_type: "image_prompt",
            final_prompt: "A cinematic product image.",
            avoid_constraints: "No distorted logos.",
            structured_output: {
              generation_layer: "layer_1_draft",
              status: "draft"
            },
            used_knowledge_blocks: [{ id: "kb_1" }],
            validation_status: "not_validated",
            status: "generated"
          }
        }
      }
    });

    expect(response.ok).toBe(true);
    expect(response.message_to_user).toBe("Your prompt is ready.");
    expect(response.conversation_session_id).toBe(sessionId);
    expect(response.prompt_request_id).toBe(promptRequestId);
    expect(response.generated_output_id).toBe(generatedOutputId);
    expect(response.generated_prompt).toBe("A cinematic product image.");
    expect(response.avoid_constraints).toBe("No distorted logos.");
    expect(response.used_knowledge_blocks).toHaveLength(1);
  });

  it("normalizes a WF-10 direct object", () => {
    const response = normalizeWorkflowResponse({
      wf10_status: "generated",
      prompt_request_id: promptRequestId,
      generated_output_id: generatedOutputId,
      output_type: "video_prompt",
      platform: "runway",
      generation_layer: "layer_1_draft",
      debug: {
        create_generated_output_raw: {
          final_prompt: "A controlled motion prompt.",
          avoid_constraints: "No jump cuts."
        }
      }
    });

    expect(response.wf10_status).toBe("generated");
    expect(response.output_type).toBe("video_prompt");
    expect(response.generated_prompt).toBe("A controlled motion prompt.");
  });

  it("normalizes a WF-10 direct array", () => {
    const response = normalizeWorkflowResponse([
      {
        wf10_status: "generated",
        prompt_request_id: promptRequestId,
        generated_output_id: generatedOutputId,
        debug: {
          create_generated_output_raw: {
            final_prompt: "A frame-by-frame prompt."
          }
        }
      }
    ]);

    expect(response.prompt_request_id).toBe(promptRequestId);
    expect(response.generated_prompt).toBe("A frame-by-frame prompt.");
  });

  it("keeps errors from an error-only response", () => {
    const response = normalizeWorkflowResponse({
      errors: ["missing_raw_input", "route_not_create_prompt_request"]
    });

    expect(response.generated_prompt).toBeNull();
    expect(response.errors).toEqual(["missing_raw_input", "route_not_create_prompt_request"]);
  });

  it("parses JSON-string structured output and used knowledge blocks", () => {
    const response = normalizeWorkflowResponse({
      wf10_status: "generated",
      debug: {
        create_generated_output_raw: {
          final_prompt: "Prompt",
          structured_output: "{\"status\":\"draft\",\"generation_layer\":\"layer_1_draft\"}",
          used_knowledge_blocks: "[{\"id\":\"kb_1\"},{\"id\":\"kb_2\"}]"
        }
      }
    });

    expect(response.structured_output?.status).toBe("draft");
    expect(response.generation_layer).toBe("layer_1_draft");
    expect(response.used_knowledge_blocks).toHaveLength(2);
  });

  it("preserves malformed JSON-string fields safely", () => {
    const response = normalizeWorkflowResponse({
      debug: {
        create_generated_output_raw: {
          final_prompt: "Prompt",
          structured_output: "{bad json",
          used_knowledge_blocks: "{bad json"
        }
      }
    });

    expect(response.structured_output).toEqual({ raw: "{bad json" });
    expect(response.used_knowledge_blocks).toEqual([{ raw: "{bad json" }]);
  });
});
