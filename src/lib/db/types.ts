import type { JsonObject, JsonValue } from "@/lib/chat-types";

export type UserProfileRow = {
  avatar_url: string | null;
  created_at: string;
  default_language: string;
  full_name: string | null;
  id: string;
  role: string;
  status: string;
  timezone: string;
  updated_at: string;
};

export type WorkspaceRow = {
  billing_status: string | null;
  created_at: string;
  id: string;
  name: string;
  owner_id: string | null;
  plan: string;
  settings: JsonObject;
  updated_at: string;
};

export type WorkspaceMemberRow = {
  created_at: string;
  id: string;
  permissions: JsonObject;
  role: string;
  updated_at: string;
  user_id: string;
  workspace_id: string;
};

export type ConversationSessionRow = {
  created_at: string;
  id: string;
  metadata: JsonObject;
  project_id: string | null;
  prompt_request_id: string | null;
  session_type: string;
  status: string;
  summary: string | null;
  updated_at: string;
  user_id: string | null;
  workspace_id: string;
};

export type ConversationMessageRow = {
  conversation_session_id: string;
  created_at: string;
  id: string;
  message_text: string | null;
  message_type: string;
  metadata: JsonObject;
  sender: string;
  sender_role: string | null;
};

export type PromptRequestRow = {
  clarification_needed: boolean;
  constraints: JsonObject;
  created_at: string;
  detected_language: string | null;
  id: string;
  missing_fields: JsonValue[];
  normalized_brief: JsonObject;
  output_type: string;
  platform: string | null;
  priority: string;
  project_id: string | null;
  raw_input: string;
  request_context: JsonObject;
  status: string;
  updated_at: string;
  user_id: string | null;
  workspace_id: string;
};

export type GeneratedOutputRow = {
  avoid_constraints: string | null;
  created_at: string;
  final_prompt: string;
  generation_metadata: JsonObject;
  id: string;
  output_type: string;
  platform_parameters: JsonObject;
  prompt_request_id: string;
  quality_score: number | null;
  status: string;
  structured_output: JsonObject;
  updated_at: string;
  used_knowledge_blocks: JsonValue[];
  used_platform_rules: JsonObject;
  used_prompt_rules: JsonValue[];
  validation_status: string;
};

export type PromptVersionRow = {
  avoid_constraints: string | null;
  change_reason: string | null;
  changed_by: string | null;
  created_at: string;
  generated_output_id: string;
  id: string;
  platform_parameters: JsonObject;
  prompt_text: string;
  structured_output: JsonObject;
  version_number: number;
};

export type BriefDecisionRow = {
  confidence_score: number;
  created_at: string;
  decision_key: string;
  decision_value: JsonObject;
  id: string;
  notes: string | null;
  prompt_request_id: string;
  source: string;
};

export type QualityScoreRow = {
  checklist_results: JsonObject;
  created_at: string;
  failed_checks: JsonValue[];
  generated_output_id: string;
  id: string;
  repair_needed: boolean;
  score: number;
  validated_by: string;
  validation_summary: string | null;
  validator_version: string | null;
};

export type UserFeedbackRow = {
  comment: string | null;
  created_at: string;
  failure_tags: string[];
  feedback_metadata: JsonObject;
  feedback_type: string;
  generated_output_id: string;
  id: string;
  rating: number | null;
  user_id: string | null;
};

export type EnsureUserOnboardingRow = {
  user_id: string;
  workspace_id: string;
};

type TableDefinition<Row> = {
  Insert: Partial<Row>;
  Relationships: [];
  Row: Row;
  Update: Partial<Row>;
};

export type Database = {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: Record<string, never>;
    Functions: {
      ensure_user_onboarding: {
        Args: Record<string, never>;
        Returns: EnsureUserOnboardingRow[];
      };
    };
    Tables: {
      brief_decisions: TableDefinition<BriefDecisionRow>;
      conversation_messages: TableDefinition<ConversationMessageRow>;
      conversation_sessions: TableDefinition<ConversationSessionRow>;
      generated_outputs: TableDefinition<GeneratedOutputRow>;
      prompt_requests: TableDefinition<PromptRequestRow>;
      prompt_versions: TableDefinition<PromptVersionRow>;
      quality_scores: TableDefinition<QualityScoreRow>;
      user_profiles: TableDefinition<UserProfileRow>;
      user_feedback: TableDefinition<UserFeedbackRow>;
      workspace_members: TableDefinition<WorkspaceMemberRow>;
      workspaces: TableDefinition<WorkspaceRow>;
    };
    Views: Record<string, never>;
  };
};
