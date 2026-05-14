# Rune Persistence Audit Report

## 1. Executive Summary

Rune already has a substantial Supabase persistence model for workspaces, conversations, messages, prompt requests, generated outputs, versions, retrieval logs, quality scores, feedback, and audit logs.

The backend database is not empty. The audited production project contains:

| Object | Current row count |
| --- | ---: |
| `auth.users` | 2 |
| `public.user_profiles` | 1 |
| `public.workspaces` | 1 |
| `public.workspace_members` | 1 |
| `public.projects` | 1 |
| `public.conversation_sessions` | 63 |
| `public.conversation_messages` | 176 |
| `public.prompt_requests` | 40 |
| `public.generated_outputs` | 24 |
| `public.prompt_versions` | 3 |
| `public.brief_decisions` | 38 |
| `public.retrieval_logs` | 12 |
| `public.quality_scores` | 3 |
| `public.user_feedback` | 0 |
| `public.audit_logs` | 65 |

The current frontend, however, does not treat Supabase as the source of truth for the app shell. Chats and projects shown in the sidebar are stored in `localStorage` through `src/lib/chat-storage.ts`. The chat UI sends user input to `/api/chat/intake`, which sends authenticated workspace/user context to n8n. The n8n pipeline appears to persist canonical database rows, but the frontend does not fetch those canonical rows back from Supabase after receiving IDs.

The biggest risk is onboarding consistency. The remote Supabase project has 2 `auth.users` records, but only 1 matching `user_profiles` row and 1 matching `workspace_members` row. One authenticated user currently has no profile and no workspace membership. That explains the observed issue where a Google-created Auth user can exist but not appear in `public.user_profiles`.

## 2. Auth User Onboarding

### auth.users status

`auth.users` contains 2 users in the active Supabase project `kssvwogxvjdzbapmlgjr`.

Audit result:

- 1 auth user has a matching `public.user_profiles` row.
- 1 auth user does not have a matching `public.user_profiles` row.
- 1 auth user has a matching `public.workspace_members` row.
- 1 auth user does not have a matching `public.workspace_members` row.

I did not include emails in this report. The important persistence finding is the mismatch between `auth.users` and the public workspace model.

### user_profiles status

`public.user_profiles` exists, has RLS enabled, and has exactly 1 row.

Columns:

- `id uuid` primary key, foreign key to `auth.users.id`
- `full_name text`
- `avatar_url text`
- `default_language text`
- `timezone text`
- `role text`
- `status text`
- `created_at timestamptz`
- `updated_at timestamptz`

RLS policies:

- `user_profiles_select_own`
- `user_profiles_insert_own`
- `user_profiles_update_own`

### workspaces status

`public.workspaces` exists, has RLS enabled, and has exactly 1 row.

Columns:

- `id uuid`
- `name text`
- `owner_id uuid`
- `plan text`
- `billing_status text`
- `settings jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

RLS policies are workspace membership/role based:

- select requires `is_workspace_member(id)`
- insert requires `owner_id = auth.uid()`
- update requires owner/admin role
- delete requires owner role

### workspace_members status

`public.workspace_members` exists, has RLS enabled, and has exactly 1 row.

Columns:

- `id uuid`
- `workspace_id uuid`
- `user_id uuid`
- `role text`
- `permissions jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Important constraint:

- `workspace_members_unique_user_workspace` on `(workspace_id, user_id)`

RLS policies:

- select requires workspace membership
- insert/update require owner/admin role
- delete requires owner role

### Onboarding RPC status

`public.ensure_user_onboarding()` exists in the remote Supabase project.

Verified properties:

- returns `TABLE(user_id uuid, workspace_id uuid)`
- takes no arguments
- uses `auth.uid()` as identity
- `SECURITY DEFINER = true`
- `SET search_path = ''`
- execute granted to `authenticated`
- no execute grant for `anon` or `public`

Function behavior:

- raises when `auth.uid()` is null
- derives `full_name` from `auth.users.raw_user_meta_data->>'full_name'`, fallback email, fallback `New User`
- inserts `public.user_profiles` if missing
- checks first existing `workspace_members` row
- if none exists, inserts `public.workspaces`
- inserts owner row in `public.workspace_members`
- returns `user_id` and `workspace_id`

### Current failure point

The RPC exists and has the right high-level shape. The likely product failure is not absence of the RPC. The current failure is that `/chat` can render for any authenticated Supabase user even if onboarding did not complete.

Relevant files:

- `src/app/auth/confirm/route.ts`
- `src/app/api/auth/verify-email-otp/route.ts`
- `src/middleware.ts`
- `src/lib/auth/get-current-user.ts`
- `src/lib/auth/get-active-workspace.ts`
- `src/components/app-shell.tsx`

`src/app/auth/confirm/route.ts` calls `supabase.rpc("ensure_user_onboarding")` after token hash or OAuth code confirmation, sets `acd_active_workspace_id`, and redirects to `/chat`.

`src/app/api/auth/verify-email-otp/route.ts` verifies the 6-digit OTP, calls `ensure_user_onboarding`, sets `acd_active_workspace_id`, and returns `redirectTo: "/chat"`.

`src/middleware.ts` only checks `supabase.auth.getUser()` for protected paths. It does not verify that the authenticated user has:

- `public.user_profiles`
- `public.workspace_members`
- active workspace cookie
- readable workspace

Therefore an Auth-only user can reach `/chat`, but later database-aware app operations can fail with `profile_not_found` or `workspace_membership_not_found`.

## 3. Chat Persistence

### Where chat sessions are created

Frontend chat sessions are created in `src/components/app-shell.tsx`.

Relevant functions:

- `startNewChat()`
- `upsertChatSession()`
- `submitMessage()`
- `selectChatSession()`
- `handleDeleteChat()`
- `handleRenameChat()`
- `handleMoveChat()`
- `handleTogglePinChat()`
- `handleToggleArchiveChat()`

### Whether they are saved to Supabase

Frontend-created sidebar chat sessions are not saved directly to Supabase.

They are stored in `localStorage` by `src/lib/chat-storage.ts`:

- `CHAT_HISTORY_STORAGE_KEY = "rune_prompt_sessions_v1"`
- legacy key: `acd_os_chat_sessions_v1`

### Existing Supabase table

`public.conversation_sessions` exists and contains 63 rows.

Columns:

- `id uuid`
- `user_id uuid`
- `workspace_id uuid`
- `project_id uuid`
- `prompt_request_id uuid`
- `session_type text`
- `status text`
- `summary text`
- `metadata jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

RLS:

- select requires `is_workspace_member(workspace_id)`
- insert requires `is_workspace_member(workspace_id)`
- update requires owner/admin/editor
- delete requires owner/admin

### Table mapping recommendation

The frontend should stop treating `localStorage` as the canonical chat session store. Recommended mapping:

- local `StoredChatSession.id` should become a UI cache key only.
- canonical session ID should be `conversation_sessions.id`.
- sidebar recent conversations should be fetched from `conversation_sessions`.
- session title should come from `summary` or `metadata.title` if the current schema intentionally stores title in metadata.
- `projectId` should map to `conversation_sessions.project_id`.
- pin/archive currently have no explicit columns in `conversation_sessions`; either keep as UI-only until schema support exists, or use a controlled `metadata` shape if accepted.

## 4. Message Persistence

### Where messages are created

Frontend messages are created in `src/components/app-shell.tsx`:

- user message is appended before calling `/api/chat/intake`
- assistant message is appended when `message_to_user` returns
- error message is appended when the workflow returns errors or the frontend request fails

### Whether user/assistant messages are saved

The frontend stores messages in `localStorage` as part of `StoredChatSession.messages`.

The frontend does not directly insert into `public.conversation_messages`.

### Existing Supabase table

`public.conversation_messages` exists and contains 176 rows.

Columns:

- `id uuid`
- `conversation_session_id uuid`
- `sender text`
- `sender_role text`
- `message_text text`
- `message_type text`
- `metadata jsonb`
- `created_at timestamptz`

RLS:

- select requires membership through the parent `conversation_sessions.workspace_id`
- insert requires membership through the parent session
- delete requires owner/admin through the parent session

### Table mapping recommendation

After each `/api/chat/intake` response, the frontend should fetch canonical messages from Supabase using returned `conversation_session_id`, not rely on the optimistic local message array as the final source of truth.

Recommended read path:

1. User submits message.
2. Frontend adds optimistic message locally.
3. `/api/chat/intake` calls n8n.
4. n8n persists conversation/message rows.
5. API returns `conversation_session_id`.
6. Frontend fetches `conversation_messages` for that session.
7. UI reconciles optimistic messages with canonical rows.

## 5. Project Persistence

### Whether projects are real Supabase records

`public.projects` exists and contains 1 row.

Columns:

- `id uuid`
- `workspace_id uuid`
- `brand_id uuid`
- `project_name text`
- `project_type text`
- `status text`
- `description text`
- `objective text`
- `platforms text[]`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

RLS:

- select requires workspace membership
- insert/update require owner/admin/editor
- delete requires owner/admin

### Where project creation happens in the frontend

Frontend project creation currently happens in `src/components/app-shell.tsx`, function `handleCreateProject(name, instructions)`.

It creates a local `StoredProject`:

- `id` is `createClientId("proj")`
- `name`
- `instructions`
- timestamps

Then it writes to `localStorage` through `saveStoredProjects()`.

Storage keys:

- `PROJECT_STORAGE_KEY = "rune_projects_v1"`
- legacy key: `acd_os_projects_v1`

### Current issue

Frontend projects are not Supabase projects. They are browser-local records only.

The local `StoredProject.instructions` field also does not map directly to a first-class `projects` column. It could map to `description`, `objective`, or a future/project metadata field, but that should be decided deliberately before implementation.

## 6. Prompt Request / Output Persistence

### prompt_requests status

`public.prompt_requests` exists and contains 40 rows.

Important columns:

- `id`
- `user_id`
- `workspace_id`
- `project_id`
- `raw_input`
- `normalized_brief`
- `detected_language`
- `output_type`
- `platform`
- `status`
- `missing_fields`
- `clarification_needed`
- `priority`
- `request_context`
- `constraints`
- timestamps

The frontend does not insert prompt requests directly. It calls `/api/chat/intake`; n8n is expected to create/update these rows.

### generated_outputs status

`public.generated_outputs` exists and contains 24 rows.

Important columns:

- `id`
- `prompt_request_id`
- `output_type`
- `final_prompt`
- `avoid_constraints`
- `structured_output`
- `platform_parameters`
- `used_knowledge_blocks`
- `used_prompt_rules`
- `used_platform_rules`
- `generation_metadata`
- `quality_score`
- `validation_status`
- `status`
- timestamps

The frontend displays `generated_prompt` from normalized n8n response, not from a Supabase read of `generated_outputs`.

### prompt_versions status

`public.prompt_versions` exists and contains 3 rows.

Important columns:

- `id`
- `generated_output_id`
- `version_number`
- `prompt_text`
- `avoid_constraints`
- `structured_output`
- `platform_parameters`
- `change_reason`
- `changed_by`
- `created_at`

The frontend does not fetch prompt versions.

### brief_decisions status

`public.brief_decisions` exists and contains 38 rows.

Important columns:

- `id`
- `prompt_request_id`
- `decision_key`
- `decision_value`
- `source`
- `confidence_score`
- `notes`
- `created_at`

The frontend does not fetch brief decisions.

### retrieval log status

`public.retrieval_logs` exists and contains 12 rows.

Important columns:

- `id`
- `prompt_request_id`
- `query_text`
- `query_embedding`
- `filters`
- `retrieved_block_ids`
- `similarity_scores`
- `retrieved_domains`
- `retrieval_strategy`
- `result_count`
- `retrieval_metadata`
- `created_at`

The frontend does not fetch retrieval logs.

### validation/quality status

`public.quality_scores` exists and contains 3 rows.

Important columns:

- `id`
- `generated_output_id`
- `score`
- `checklist_results`
- `failed_checks`
- `repair_needed`
- `validation_summary`
- `validator_version`
- `validated_by`
- `created_at`

There is also `public.prompt_output_validations`, which is not part of the minimum frontend types but exists in the schema and is likely the newer validation surface.

The frontend currently displays `validation_status` from the normalized workflow response only.

### user feedback status

`public.user_feedback` exists but contains 0 rows.

Important columns:

- `id`
- `generated_output_id`
- `user_id`
- `rating`
- `comment`
- `failure_tags`
- `feedback_type`
- `feedback_metadata`
- `created_at`

No frontend feedback write path is implemented.

## 7. Supabase Schema Findings

### Workspace model

Workspace scoping is present and mature:

- `workspaces`
- `workspace_members`
- `projects`
- `conversation_sessions`
- `prompt_requests`
- `audit_logs`
- several reference/product/campaign tables visible through foreign keys

RLS is enabled on the core tables.

Most user data access policies depend on:

- `is_workspace_member(workspace_id)`
- `has_workspace_role(workspace_id, roles)`
- `is_workspace_owner(workspace_id)`

These functions exist and are `SECURITY DEFINER`.

### Core relationship chain

The canonical persistence chain appears to be:

```text
auth.users
  -> public.user_profiles
  -> public.workspace_members
  -> public.workspaces
  -> public.projects
  -> public.conversation_sessions
  -> public.conversation_messages
  -> public.prompt_requests
  -> public.generated_outputs
  -> public.prompt_versions / quality_scores / user_feedback
```

Some relationships are parallel rather than strictly nested:

- `conversation_sessions.prompt_request_id` can link a conversation to a prompt request.
- `prompt_requests.project_id` can link a prompt request to a project.
- `generated_outputs.prompt_request_id` links output to request.
- `brief_decisions`, `retrieval_logs`, and `prompt_build_plans` link to `prompt_requests`.

### Important RLS notes

The current schema is designed for authenticated users, not anonymous browsing.

An authenticated user without `workspace_members` cannot read workspace-scoped rows because RLS checks `is_workspace_member(...)`.

This makes onboarding mandatory before `/chat` becomes useful.

### RPC findings

Relevant RPCs/functions found:

- `ensure_user_onboarding()`
- `is_workspace_member(uuid)`
- `has_workspace_role(uuid, text[])`
- `is_workspace_owner(uuid)`
- `generate_prompt_build_plan(...)`
- `get_prompt_build_context(...)`
- `get_prompt_agent_packet(...)`
- `get_model_candidates_for_prompt(...)`
- `get_prompt_adaptation_rules_for_model(...)`
- `validate_prompt_system_integrity()`
- `validate_output_mode_relationship_links_integrity()`

The frontend currently calls only:

- `ensure_user_onboarding()`

The n8n/backend pipeline likely uses the prompt/context RPCs, but the frontend does not call them.

## 8. Code Findings

### `src/app/auth/confirm/route.ts`

Handles:

- magic link token hash verification
- OAuth code exchange
- onboarding RPC call
- active workspace cookie
- redirect to `/chat`

Gap:

- if this route is bypassed or onboarding fails, `/chat` can still render for an Auth-only session because middleware does not enforce onboarding.

### `src/app/api/auth/verify-email-otp/route.ts`

Handles:

- server-side OTP verification
- onboarding RPC call
- active workspace cookie
- JSON success response with `redirectTo: "/chat"`

This path is the strongest onboarding path in the current app.

### `src/middleware.ts`

Handles:

- protects `/create`, `/chat`, `/conversations`, `/outputs`
- redirects unauthenticated protected access to `/?auth=login`
- refreshes Supabase session cookies

Gap:

- checks only `auth.getUser()`
- does not require `user_profiles`
- does not require `workspace_members`
- does not require `acd_active_workspace_id`

### `src/lib/auth/get-current-user.ts`

Fetches:

- Supabase auth user
- `public.user_profiles` where `id = user.id`

Can return:

- `not_authenticated`
- `profile_not_found`
- `profile_query_failed`

### `src/lib/auth/get-active-workspace.ts`

Fetches:

- current user/profile
- workspace membership from `acd_active_workspace_id` cookie when present
- first workspace membership as fallback
- workspace row

Can return:

- `workspace_membership_not_found`
- `workspace_membership_query_failed`
- `workspace_not_found`
- `workspace_query_failed`

This helper is used by `/api/chat/intake`, but not by `/chat` before rendering.

### `src/app/api/chat/intake/route.ts`

Handles:

- request validation
- n8n webhook timeout
- authenticated active workspace resolution through `getActiveWorkspace()`
- sends `workspace_id`, `user_id`, `project_id: null`, `conversation_session_id`, and `message_text` to n8n
- normalizes n8n response

It does not directly write conversation/message/prompt rows. It depends on n8n to persist.

### `src/components/app-shell.tsx`

Handles most app runtime state:

- messages
- loading chat IDs
- latest response
- conversation session ID
- connection status
- composer value
- sidebar collapsed state
- chat sessions
- projects
- active chat/project

It loads and saves chat/project data through `src/lib/chat-storage.ts`.

### `src/lib/chat-storage.ts`

Persists:

- chat sessions to `localStorage`
- projects to `localStorage`

This is currently the main frontend persistence layer for the app shell.

### `src/lib/db/types.ts`

Contains minimal typed rows for:

- user profiles
- workspaces
- workspace members
- conversations
- prompt requests
- generated outputs
- prompt versions
- brief decisions
- quality scores
- feedback

Gap:

- types exist, but there are no query helper modules wired into the app shell yet.

## 9. Gaps

1. Auth onboarding is not enforced before `/chat` renders.
2. One real `auth.users` row is missing `user_profiles` and `workspace_members`.
3. The frontend sidebar does not read `conversation_sessions` from Supabase.
4. The frontend message list does not read `conversation_messages` from Supabase.
5. The frontend project list does not read/write `projects` in Supabase.
6. `localStorage` is currently the canonical visible store for app shell chats/projects.
7. `/api/chat/intake` does not return a canonical follow-up read payload from Supabase; it returns normalized n8n response only.
8. The frontend displays `generated_prompt` from the response, not from `generated_outputs`.
9. The frontend does not fetch `prompt_versions`.
10. The frontend does not fetch `brief_decisions`.
11. The frontend does not fetch `retrieval_logs`.
12. The frontend does not fetch `quality_scores` or `prompt_output_validations`.
13. The frontend does not write `user_feedback`.
14. Frontend local project IDs do not map to Supabase project UUIDs.
15. `APP_CONFIG` still contains development `workspaceId` and `userId`, though `/api/chat/intake` no longer uses those IDs for authenticated runtime payloads.
16. `acd_active_workspace_id` still uses the old ACD naming; this is not a functional bug, but it should be renamed later only through a careful compatibility plan.

## 10. Recommended Fix Plan

### Step A: enforce onboarding

Goal:

- every authenticated user that enters `/chat` must have `user_profiles`, `workspaces`, and `workspace_members`.

Recommended implementation:

1. Add a server-side app entry guard for `/chat`.
2. Resolve auth user.
3. Call `getActiveWorkspace()`.
4. If `profile_not_found` or `workspace_membership_not_found`, call `ensure_user_onboarding()` server-side and set `acd_active_workspace_id`.
5. If onboarding still fails, redirect to `/?auth=login&error=onboarding_failed`.
6. Keep middleware as auth-only to avoid heavy DB/RPC work on every request, unless a later middleware/proxy rewrite is planned.

Also run a one-time repair for existing Auth-only users, either by:

- asking each user to re-enter through `/auth/confirm` or OTP verification, or
- a controlled admin SQL repair after review.

Do not use service role in browser.

### Step B: persist/fetch conversation sessions

Goal:

- sidebar chats come from `conversation_sessions`.

Recommended implementation:

1. Add `src/lib/db/queries/conversations.ts`.
2. Add server query for workspace-scoped conversation sessions.
3. Add route or server component data load for `/chat`.
4. Keep `localStorage` as temporary cache only.
5. Map returned `conversation_session_id` from `/api/chat/intake` to canonical selected session.

### Step C: persist/fetch messages

Goal:

- user and assistant messages shown from `conversation_messages`.

Recommended implementation:

1. Fetch messages by `conversation_session_id`.
2. Use optimistic UI while n8n runs.
3. Reconcile with Supabase after `/api/chat/intake` returns.
4. Do not permanently store raw workflow responses in `localStorage`.

### Step D: persist/fetch prompt requests

Goal:

- prompt request metadata comes from `prompt_requests`.

Recommended implementation:

1. After `/api/chat/intake` returns `prompt_request_id`, fetch `prompt_requests`.
2. Display canonical `output_type`, `platform`, `status`, `missing_fields`, and `clarification_needed` from Supabase where relevant.
3. Keep prompt creation itself inside n8n unless the architecture is intentionally changed.

### Step E: persist/fetch generated outputs

Goal:

- generated prompt display comes from `generated_outputs`.

Recommended implementation:

1. After `/api/chat/intake` returns `generated_output_id`, fetch `generated_outputs`.
2. Render `final_prompt`, `avoid_constraints`, `structured_output`, `validation_status`, and `quality_score` from the database.
3. Fetch `prompt_versions` for version history when needed.
4. Fetch `quality_scores` or `prompt_output_validations` for validation panels.

### Step F: persist projects

Goal:

- project creation and sidebar project list use `public.projects`.

Recommended implementation:

1. Add `src/lib/db/queries/projects.ts`.
2. Create server-backed project creation route/action.
3. Map current local fields:
   - `name` -> `project_name`
   - `instructions` -> likely `description` or `objective` after product decision
4. Store `workspace_id` from `getActiveWorkspace()`.
5. Store `created_by` from `currentUser.profile.id`.
6. Replace local project IDs with Supabase UUIDs.

### Step G: add audit/analytics hooks

Goal:

- important user actions can be tracked without relying on browser storage.

Recommended implementation:

1. Add controlled insert paths for `audit_logs`.
2. Add feedback write path into `user_feedback`.
3. Add usage analytics only after core persistence is stable.
4. Avoid logging raw prompt content into generic audit fields unless the data retention policy is clear.

## Exact Next Step

Implement onboarding enforcement before `/chat` renders.

The app currently has the right onboarding RPC, but `/chat` is only auth-protected. It should become workspace-protected. This is the smallest high-impact fix because it closes the current Google/Auth mismatch and prevents an Auth-only user from entering an app shell that cannot reliably persist or read workspace data.

After that, wire Supabase read paths for `conversation_sessions` and `conversation_messages`, then replace localStorage as the visible source of truth.
