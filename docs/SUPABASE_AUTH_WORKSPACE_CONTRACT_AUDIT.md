# Supabase Auth + Workspace Contract Audit

## Status

Baseline verified on `main` after Next.js cleanup:

```bash
npm run typecheck
npm run build
```

Both passed locally.

## Current frontend contract

The app expects this authenticated flow:

```text
Supabase Auth session
  ↓
ensure_user_onboarding()
  ↓
user_profiles row
  ↓
workspace_members row
  ↓
workspaces row
  ↓
acd_active_workspace_id cookie
  ↓
protected /chat and /create access
```

## Files reviewed

- `supabase/migrations/20260512210500_create_ensure_user_onboarding_rpc.sql`
- `src/lib/auth/get-current-user.ts`
- `src/lib/auth/get-active-workspace.ts`
- `src/app/auth/confirm/route.ts`
- `src/app/api/auth/verify-email-otp/route.ts`
- `src/app/auth/onboard/route.ts`
- `src/lib/db/types.ts`

## Findings

### 1. Onboarding RPC contract is correct in direction

`ensure_user_onboarding()` is idempotent and does the right sequence:

- reads `auth.uid()`
- creates `user_profiles`
- finds an existing workspace membership
- creates a default workspace if none exists
- creates/updates owner membership
- returns `user_id` and `workspace_id`

This matches the frontend expectation.

### 2. Frontend depends on tables not shown in migrations

The migration present only creates the onboarding RPC. The frontend type contract expects these public tables:

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

If these tables already exist in the Supabase project, the repo still needs schema migrations to represent them. If they do not exist, auth/onboarding will fail at runtime.

### 3. Active workspace resolution is clean

`getActiveWorkspace()` correctly:

- checks authenticated user
- reads `acd_active_workspace_id`
- validates membership for that workspace
- falls back to first membership
- loads the workspace row

This is the correct pattern for workspace-scoped SaaS behavior.

### 4. Auth confirmation routes are aligned

The following routes call `ensure_user_onboarding()` and set the active workspace cookie:

- `/auth/confirm`
- `/api/auth/verify-email-otp`
- `/auth/onboard`

They redirect to `/chat`, which matches the current product shell direction.

### 5. Missing verification target

The repo needs a canonical foundation schema migration before deeper product features continue.

Required next migration group:

```text
user_profiles
workspaces
workspace_members
projects
brands
conversation_sessions
conversation_messages
prompt_requests
generated_outputs
prompt_versions
brief_decisions
quality_scores
user_feedback
```

## Risk

The current frontend can build successfully while still failing at runtime if Supabase does not contain the required tables, constraints, indexes, functions, and RLS policies.

## Next safe implementation step

Create a Supabase foundation schema migration that defines the core account, workspace, conversation, prompt request, output, versioning, validation, and feedback tables expected by the frontend.

## Stop condition

Do not add new UI features until the Supabase schema contract exists in versioned migrations and can be applied cleanly.
