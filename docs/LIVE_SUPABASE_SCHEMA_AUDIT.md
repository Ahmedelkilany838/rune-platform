# Live Supabase Schema Sync Audit

## Status

This audit was created from a read-only inspection of the live Supabase project:

```text
Project: ai-creative-direction-os
Ref: kssvwogxvjdzbapmlgjr
Status: ACTIVE_HEALTHY
```

No DDL or data mutation was applied during this inspection.

## Decision

Do not create a new foundation schema migration from scratch.

The live database already contains the core Rune platform schema, live rows, RLS-enabled tables, pgvector, prompt system tables, visual domain tables, reference tables, product and character locking tables, campaign tables, validation tables, repair tables, analytics tables, and audit logs.

The correct next step is schema synchronization, not schema replacement.

## Confirmed live capabilities

### Core workspace and auth tables

- `user_profiles`
- `workspaces`
- `workspace_members`

All are present and RLS-enabled.

### Project and brand layer

- `projects`
- `brands`

Both are present and linked to `workspaces`.

### Prompt operation layer

- `prompt_requests`
- `generated_outputs`
- `prompt_versions`
- `brief_decisions`
- `quality_scores`
- `retrieval_logs`
- `prompt_build_plans`
- `prompt_output_validations`

These tables exist and several already contain live rows:

```text
prompt_requests: live rows present
generated_outputs: live rows present
conversation_sessions: live rows present
conversation_messages: live rows present
brief_decisions: live rows present
retrieval_logs: live rows present
prompt_build_plans: live rows present
```

### Conversation layer

- `conversation_sessions`
- `conversation_messages`

Both are present and RLS-enabled.

### Knowledge core

- `creative_knowledge_blocks`
- `knowledge_sources`
- `knowledge_block_sources`
- `knowledge_block_taxonomy`
- `taxonomy_terms`

`creative_knowledge_blocks` exists with `embedding_vector` using pgvector.

### Prompt system tables

- `prompt_templates`
- `prompt_writing_rules`
- `prompt_assembly_rules`
- `prompt_validation_rules`
- `platform_rules`
- `platform_prompt_rules`
- `output_modes`
- `failure_patterns`
- `repair_strategies`
- `model_prompt_adaptation_rules`
- `ai_generation_models`

These confirm the database is not just a basic app schema. It already supports prompt assembly, validation, repair, platform/model adaptation, and model catalog behavior.

### Visual domain tables

Confirmed examples include:

- `lighting_profiles`
- `shadow_profiles`
- `color_palettes`
- `color_grading_profiles`
- `material_profiles`
- `sensor_profiles`
- `camera_bodies`
- `lens_profiles`
- `camera_angle_profiles`
- `shot_type_profiles`
- `framing_profiles`
- `composition_patterns`
- `scene_archetypes`
- `environment_profiles`
- `surface_profiles`
- `set_element_profiles`
- `prop_profiles`
- `styling_profiles`
- `photography_genres`
- `retouching_profiles`
- `advertising_concepts`
- `social_media_formats`
- `video_motion_profiles`
- `video_shot_sequences`

This matches the required dual architecture: specialized domain tables plus `creative_knowledge_blocks` as the unified retrieval layer.

### Reference system

- `reference_assets`
- `reference_analyses`
- `reference_annotations`

These support file metadata, analysis payloads, roles, and annotations.

### Product and character locking

- `product_profiles`
- `product_locks`
- `character_profiles`
- `character_locks`

These are present and linked into prompts/workspaces.

### Campaign layer

- `campaign_projects`
- `campaign_concepts`
- `campaign_deliverables`
- `campaign_strategy_sessions`

These are present, so campaign expansion should not be modeled as frontend-only state.

### Analytics and audit

- `usage_analytics`
- `audit_logs`
- `phase_readiness_notes`

These are present.

### Research / ingestion layer

- `research_source_documents`
- `research_source_document_chunks`
- `research_source_document_raw_parts`
- `research_extraction_records`
- `embedding_jobs`

This confirms ingestion and embedding preparation already exist at the database level.

## Extensions

Confirmed installed:

```text
vector 0.8.0
pgcrypto
uuid-ossp
pg_stat_statements
supabase_vault
plpgsql
```

The `vector` extension is installed in `public`, which supports current vector columns.

## Live migration status

Supabase reports migrations applied through:

```text
20260512013909_create_generate_chunks_from_research_raw_v1
```

The repo must be checked to ensure the same migrations are committed and ordered correctly. Missing migration files in Git would create deployment drift.

## Important mismatch risk

The frontend TypeScript database types are much smaller than the live database.

The current frontend types cover core app tables such as:

- `user_profiles`
- `workspaces`
- `workspace_members`
- `conversation_sessions`
- `conversation_messages`
- `prompt_requests`
- `generated_outputs`
- `prompt_versions`
- `brief_decisions`
- `quality_scores`
- `user_feedback`

But the live database contains many more tables used by the full architecture.

This is not immediately breaking because the current frontend may not query all tables yet. But it is a product risk because future features may be typed manually or incorrectly unless types are regenerated from Supabase.

## Safe next action

Generate fresh Supabase TypeScript types from the live project and compare them against `src/lib/db/types.ts`.

Do not blindly replace the current file until the diff is reviewed because the current app may rely on hand-written simplified row types.

## Recommended next branch

```text
chore/supabase-types-sync
```

## What should happen next

1. Generate live Supabase TypeScript types.
2. Save them as a separate generated file first:

```text
src/lib/db/database.generated.ts
```

3. Keep `src/lib/db/types.ts` stable until imports are reviewed.
4. Run:

```bash
npm run typecheck
npm run build
```

5. Only then decide whether to migrate the app from manual types to generated types.

## Stop condition

Do not apply production database migrations from the repo until migration drift is checked. The live schema is ahead and contains real data.
