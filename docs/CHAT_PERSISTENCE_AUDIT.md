# Chat Persistence Audit

## Status

This audit was run after merging database-backed projects and single-final-response rendering.

## Current database state

### Conversation sessions

Live Supabase counts:

- total sessions: 76
- sessions with `project_id`: 3
- sessions without `project_id`: 73
- sessions with `metadata.title`: 0
- sessions with `metadata.isPinned`: 0
- sessions with `metadata.isArchived`: 0
- sessions with `metadata.isTemporary`: 0

### Conversation messages

Live Supabase counts:

- total messages: 221
- user messages: 119
- assistant messages: 102
- messages with `metadata.response`: 0

### Prompt requests

Live Supabase counts:

- total prompt requests: 54
- prompt requests with `project_id`: 1
- prompt requests with `request_context.project_context`: 0

### Generated outputs

Live Supabase counts:

- total outputs: 37
- roughly 300 words or more by length heuristic: 30
- likely under 300 words by length heuristic: 7

## What is already working

### 1. Conversation list loads from Supabase

`GET /api/conversations` reads `conversation_sessions` and then loads matching `conversation_messages`.

### 2. Opening an old chat loads messages from Supabase

`GET /api/conversations/[sessionId]/messages` validates workspace ownership and reads messages for the selected session.

### 3. Canonical generated output enrichment exists

Assistant messages can be enriched from `prompt_requests` + `generated_outputs` using the previous user message as lookup context.

### 4. RLS is present

The live policies protect conversation sessions/messages through workspace membership checks.

## Gaps found

### 1. Chat title, pin, archive, and move are still local-first

The UI updates these values in local state/localStorage only:

- rename chat
- move chat to project
- pin chat
- archive chat
- delete/remove chat from sidebar

The database already supports this through:

- `conversation_sessions.metadata`
- `conversation_sessions.project_id`
- `conversation_sessions.status`

But the frontend does not persist these actions to Supabase yet.

### 2. `metadata.response` is not persisted on assistant messages

There are 102 assistant messages and 0 messages with `metadata.response`.

The app currently compensates by enriching assistant messages from `prompt_requests` and `generated_outputs`.

This works as a recovery pattern, but the stronger path is for workflow output messages to persist a response snapshot when possible.

### 3. Project context is now sent by frontend, but historical prompt requests do not contain it

The new frontend sends `metadata.project_context` and `metadata.prompt_output_contract` to the intake webhook.

Existing historical prompt requests do not contain `request_context.project_context`.

This is expected for old data, but new workflow runs should persist that context into `prompt_requests.request_context`.

### 4. Some generated prompts are likely under the minimum length target

7 of 37 generated outputs look under the 300-word target by length heuristic.

The frontend now sends `prompt_output_contract.minimumPromptWords = 300`, but final enforcement must happen in the workflow/validation layer.

## Required implementation order

### Step 1 — Database-backed conversation metadata

Add a secure route for updating conversation session metadata:

```text
PATCH /api/conversations/[sessionId]
```

It should support:

- title
- isPinned
- isArchived
- project_id
- status

It must validate:

- authenticated user
- active workspace
- session belongs to workspace
- target project belongs to workspace if provided

### Step 2 — Wire sidebar actions to the route

Update AppShell handlers:

- `handleRenameChat`
- `handleMoveChat`
- `handleTogglePinChat`
- `handleToggleArchiveChat`
- `handleDeleteChat`

The UI can update optimistically, but the database must be the source of truth.

### Step 3 — Filter deleted sessions in conversation list

`GET /api/conversations` should not return sessions with `status = deleted`.

### Step 4 — Workflow persistence enforcement

The n8n workflow must persist:

- project context snapshot into `prompt_requests.request_context`
- prompt output contract snapshot into `prompt_requests.request_context`
- final response metadata into assistant message metadata where possible
- output validation result into `generated_outputs.validation_status`

### Step 5 — Minimum prompt length validation

Generated outputs must be validated against:

- `minimumPromptWords >= 300`
- detailed visual specificity
- avoid constraints
- platform parameters

If validation fails, repair and revalidate.

## Decision

Do not start campaign or art direction agents yet.

Close database-backed chat metadata first, then enforce workflow persistence and output validation.
