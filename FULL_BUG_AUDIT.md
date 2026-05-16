# Rune — Complete Bug & Problem Audit Report
**Date:** May 16, 2026  
**Scope:** Frontend · Backend API · Database · n8n Automation · Auth · UX  
**Status:** Analysis only — problems catalogued with exact file/line references

---

## PRIORITY LEGEND
- 🔴 **CRITICAL** — System-breaking, blocks core functionality
- 🟠 **HIGH** — Feature-breaking, major UX failure  
- 🟡 **MEDIUM** — Functional gap, degraded experience
- 🟢 **LOW** — Code quality, future risk, minor UX

---

## SECTION 1 — DATABASE BUGS

---

### 🔴 DB-01 — `ensure_user_onboarding()` Fails for All New Users

**File:** Supabase function `public.ensure_user_onboarding()`  
**Impact:** Every NEW user (especially Google OAuth) cannot complete onboarding. They see `/?auth=login&error=onboarding_failed` in an infinite loop.

**Root Cause:**  
The function has `RETURNS TABLE(user_id uuid, workspace_id uuid)`. Inside the function body, PL/pgSQL exposes these return columns as variables. When the function reaches the workspace_members upsert:

```sql
on conflict (workspace_id, user_id) do update
```

PostgreSQL raises: `column reference "workspace_id" is ambiguous` because `workspace_id` refers to both the return column variable AND the table column. Existing users who already have a `workspace_members` row return early and never hit this path, which is why the bug only affects new users.

**Fix Required (SQL Migration):**
```sql
-- Change from:
on conflict (workspace_id, user_id) do update
-- To:
on conflict on constraint workspace_members_unique_user_workspace do update
```

---

### 🟠 DB-02 — `conversation_messages.message_type` Constraint Violated by n8n

**File:** n8n `WF-00A Chat Intake Skeleton` → `Save Incoming User Message` node  
**DB Constraint:** `conversation_messages_message_type_check` only allows:
`text | image | audio | video | file | clarification_question | clarification_answer | system_event`

**Root Cause:**  
WF-00A `Detect Input Types` node can produce runtime values: `mixed`, `voice`, `media`, `link`, `empty`. These are written directly to `conversation_messages.message_type`, causing INSERT to fail with a constraint violation. When this fails, the conversation message is not persisted to Supabase, breaking history sync.

**Fix Required:**  
In WF-00A, before writing to `conversation_messages`, map runtime types:
```
mixed  → text
voice  → audio
media  → image
link   → text
empty  → text
```
Store the original detected type in `metadata.input_flags` for internal use.

---

### 🟠 DB-03 — `output_type` Vocabulary Mismatch Between SW-00C and DB

**Files:** n8n `SW-00C Brief Decision Extractor Agent`, `WF-01 Prompt Request Creator`  
**DB Constraint:** `prompt_requests_output_type_check` only allows:
`image_prompt | video_prompt | frame_by_frame_prompt | product_ad_prompt | social_media_prompt | key_visual_prompt | retouching_prompt | reference_analysis | campaign_concept | prompt_repair | full_creative_direction`

**Root Cause:**  
SW-00C currently outputs these non-DB-compatible values:
- `social_media_visual_prompt` → should be `social_media_prompt`
- `retouching_direction` → should be `retouching_prompt`
- `campaign_prompt` → should be `campaign_concept`
- `prompt_revision` → should be `prompt_repair`
- `other` → no DB equivalent (should fallback to `full_creative_direction`)

WF-01 partially maps some of these but not all. Any unmapped value causes a DB constraint violation on `prompt_requests` INSERT, which means the entire workflow chain fails silently.

---

### 🟡 DB-04 — `prompt_assembly_rules` Loaded Without `active=true` Filter

**File:** n8n `WF-10 Prompt Generation Engine` → `Load Active Prompt Assembly Rules` node  
**Root Cause:**  
The node name says "Active" but the query only filters `output_type`. The `active=true` filter is missing. This means inactive/draft assembly rules are loaded and sent to the prompt writer, potentially causing incorrect prompt structure.

---

### 🟡 DB-05 — n8n Doesn't Use Available pgvector RPCs for Knowledge Retrieval

**Files:** n8n `WF-10`, Supabase functions  
Available but unused RPCs:
- `get_prompt_build_context(uuid, text, vector, integer, float)`
- `generate_prompt_build_plan(uuid, text, vector, integer, float)`
- `get_prompt_agent_packet(uuid, int, int, int, int, int)`

**Root Cause:**  
WF-10 loads `creative_knowledge_blocks` with a fixed limit (40) and performs code-level filtering. It does NOT use vector similarity search. This means the most semantically relevant knowledge blocks may be excluded while irrelevant ones are included, degrading prompt quality.

---

## SECTION 2 — AUTH & MIDDLEWARE BUGS

---

### 🔴 AUTH-01 — Next.js Middleware File Does Not Exist

**File:** `src/proxy.ts` (exists) vs `src/middleware.ts` (MISSING)  
**Impact:** No route protection middleware runs. Protected paths (`/chat`, `/conversations`, `/outputs`) are only protected by individual `page.tsx` server-side checks. This is architecturally fragile.

**Root Cause:**  
Next.js only reads middleware from `src/middleware.ts` (or `middleware.ts` at project root). The file `src/proxy.ts` exports a `proxy()` function and `config` matcher — it is clearly intended to be the middleware — but because it's named `proxy.ts`, Next.js never executes it. The `src/middleware.test.ts` file tests `proxy.ts`, confirming this was the intended middleware.

**Fix Required:**  
Rename `src/proxy.ts` → `src/middleware.ts` and update the default export:
```typescript
// src/middleware.ts
export { proxy as default } from "@/proxy";  // or inline the function directly
export { config } from "@/proxy";
```

Or copy the entire content of `proxy.ts` into a new `middleware.ts`.

---

### 🟠 AUTH-02 — `/auth/confirm` Redirects to Non-Existent `/login` Page

**File:** `src/app/auth/confirm/route.ts` line:
```typescript
url.pathname = "/login";
```
**Impact:** On auth confirmation failure (bad token, expired link, OAuth failure), users are redirected to `/login` which returns a 404 because the app has no `/login` page — the login interface is at `/?auth=login`.

**Fix Required:**
```typescript
// Change:
url.pathname = "/login";
url.search = "";
url.searchParams.set("error", error);
// To:
url.pathname = "/";
url.search = "";
url.searchParams.set("auth", "login");
url.searchParams.set("error", error);
```

---

### 🟡 AUTH-03 — Middleware Doesn't Enforce Workspace Membership

**File:** `src/proxy.ts` (the middleware that's not running)  
**Root Cause:**  
Even if the middleware file were correctly named, it only checks `supabase.auth.getUser()`. It does NOT verify:
- `public.user_profiles` exists for the user
- `public.workspace_members` row exists
- `acd_active_workspace_id` cookie is valid

An authenticated-but-not-onboarded user can reach `/chat` and see the shell render, but every API call (`/api/chat/intake`, `/api/conversations`, etc.) will fail with `profile_not_found` or `workspace_membership_not_found`.

---

## SECTION 3 — FRONTEND CRITICAL BUGS

---

### 🔴 FE-01 — Projects NEVER Saved to Supabase (localStorage Only)

**File:** `src/components/app-shell.tsx` → `handleCreateProject()`

```typescript
// Current code creates a LOCAL project only:
const newProject: StoredProject = {
  id: createClientId("proj"),  // ← client-side fake ID like "proj_abc123"
  name,
  instructions,
  createdAt: now,
  updatedAt: now
};
const nextProjects = [newProject, ...projects];
setProjects(nextProjects);
saveStoredProjects(nextProjects);  // ← writes to localStorage only
```

**Impact:**  
- Projects disappear on logout or different browser/device
- The project ID `proj_abc123` is sent to `/api/chat/intake` → n8n as `project_id`
- `getValidatedProjectContext()` in `intake/route.ts` queries Supabase with this fake ID → returns `project_not_found` → 404 error
- Every chat inside a "project" fails with project context errors
- **The `/api/projects` POST and GET endpoints exist and are production-ready but are NEVER called**

**Fix Required:**
1. `handleCreateProject` must call `POST /api/projects` 
2. After success, use the returned Supabase UUID as the real project ID
3. On app load, call `GET /api/projects` instead of `loadStoredProjects()`

---

### 🔴 FE-02 — Projects NEVER Loaded from Supabase on App Start

**File:** `src/components/app-shell.tsx` → `useEffect` initial load:
```typescript
setProjects(loadStoredProjects());  // ← localStorage only, never Supabase
```

**Impact:**  
If a user logs in on a new device/browser, all their projects are gone. The `/api/projects` GET endpoint is production-ready but never called. Real projects created in Supabase (e.g., the 1 project row in the live database) never appear in the sidebar.

---

### 🔴 FE-03 — `handleCreateProject` Signature Mismatch with `NewProjectModal`

**File:** `src/components/app-shell.tsx` vs `src/components/workspace/new-project-modal.tsx`

```typescript
// NewProjectModal expects:
onSubmit: (name: string, description: string, instructions: string) => Promise<void> | void

// But AppShell provides:
function handleCreateProject(name: string, instructions: string) { ... }
// ← description parameter is MISSING
```

**Impact:**  
TypeScript doesn't catch this because the modal internally passes args positionally. At runtime, what `NewProjectModal` passes as `description` (2nd arg) is received by `handleCreateProject` as `instructions` (2nd arg). What the user types in "Instructions" is silently dropped. Description and instructions are transposed.

---

### 🔴 FE-04 — `ProjectDashboard` Rendered with Wrong Props from AppShell

**File:** `src/components/app-shell.tsx` renders:
```jsx
<ProjectDashboard 
  project={activeProject!}
  chats={chatSessions.filter(c => c.projectId === activeProjectId && !c.isArchived)}
  onSelectChat={selectChatSession}
  onNewChat={startNewChat}   // ← NOT a valid prop
/>
```

**But `ProjectDashboard` requires:**
```typescript
{
  project: StoredProject;
  chats: StoredChatSession[];
  composerValue: string;      // ← MISSING from AppShell call
  loading: boolean;           // ← MISSING from AppShell call
  onComposerChange: (v) => void; // ← MISSING from AppShell call
  onSelectChat: (id) => void;
  onSubmit: (msg) => Promise<void>; // ← MISSING from AppShell call
}
```

**Impact:**  
`composerValue` is `undefined` → composer shows nothing typed. `loading` is `undefined` → submit button state incorrect. `onSubmit` is `undefined` → submitting a message from the project page THROWS a runtime TypeError. The project dashboard is completely non-functional for chatting.

---

### 🔴 FE-05 — Local Project IDs Sent to n8n Cause Silent 404 Failures

**File:** `src/app/api/chat/intake/route.ts`
```typescript
const projectResolution = await getValidatedProjectContext(
  activeWorkspace.workspace.id, 
  body.project_id ?? null  // ← receives "proj_abc123" from frontend
);

if (!projectResolution.ok) {
  return errorResponse(
    projectResolution.error === "project_not_found" ? 404 : 500, 
    [projectResolution.error]
  );
}
```

**Impact:**  
When user sends a chat from inside a "project", the local project ID `proj_abc123` is sent. Supabase can't find it → `project_not_found` → `errorResponse(404, [...])` → the frontend receives a 404 → shows "The frontend could not reach the intake API route." This makes ALL project chats fail immediately.

---

## SECTION 4 — FRONTEND NON-CRITICAL BUGS

---

### 🟠 FE-06 — Rename, Pin, Archive Actions Not Persisted to Supabase

**Files:** `src/components/app-shell.tsx` handlers:
- `handleRenameChat()` → writes to localStorage only
- `handleTogglePinChat()` → writes to localStorage only
- `handleToggleArchiveChat()` → writes to localStorage only

**The `/api/conversations/[sessionId]` PATCH endpoint EXISTS and handles all three** (title, isPinned, isArchived) but is never called.

**Impact:**  
After page reload, renames revert to n8n-generated titles. Pinned items unpin. Archived chats return. All session management state is lost between sessions.

---

### 🟠 FE-07 — Move Chat to Project Not Persisted to Supabase

**File:** `src/components/app-shell.tsx` → `handleMoveChat()`  
Same issue as FE-06. The `PATCH /api/conversations/[sessionId]` endpoint accepts `projectId` but is never called. Move is localStorage-only and lost on reload.

---

### 🟠 FE-08 — Duplicate Chat Sessions in Sidebar After Supabase Sync

**File:** `src/components/app-shell.tsx` → `upsertChatSession()` + `loadConversationSessionsFromApi()`

**Root Cause:**  
When app loads, Supabase sessions are fetched with UUID IDs. When user sends a message, a local session is created with `createClientId("chat")` ID. `sessionsMatch()` tries to reconcile by checking multiple ID combinations, but if the conversation_session_id from n8n doesn't exactly match the local ID AND isn't found in the loaded sessions, a NEW entry is created. Result: same conversation appears twice in sidebar.

---

### 🟠 FE-09 — `MoreHorizontal` Button in ProjectDashboard Chat List Does Nothing

**File:** `src/components/workspace/project-dashboard.tsx`
```typescript
onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  // The portal/menu needs to be passed in or handled natively...
}}
```
The comment explains it's incomplete. Clicking the `...` button in project chat list does nothing. No menu appears.

---

### 🟡 FE-10 — ProjectDashboard Settings Sidebar is Read-Only

**File:** `src/components/workspace/project-dashboard.tsx`  
The settings panel (right drawer) shows project name, description, and instructions, but provides no way to edit them. No save/edit button exists. Users can see but not change project settings.

---

### 🟡 FE-11 — TypewriterText Has Unbounded Memory Leak

**File:** `src/components/chat/typewriter-text.tsx`
```typescript
const playedAnimationKeys = new Set<string>();  // module-level, never cleared
```
**Impact:**  
Every animated message adds a key to this Set. After hundreds of messages, the Set grows unboundedly. It is never garbage-collected because it's module-level (singleton). In long sessions, this degrades performance. Additionally, after a page reload the Set is reset (because it's in-memory), which could cause animations to re-play unexpectedly on messages that were already animated in the current session.

---

### 🟡 FE-12 — Chat Auto-Scroll Ignores User's Scroll Position

**File:** `src/components/chat/chat-panel.tsx`
```typescript
useEffect(() => {
  scrollToBottom("smooth");
}, [messages, loading]);
```
**Impact:**  
When new messages arrive or loading state changes, `scrollToBottom()` is called unconditionally. If a user scrolled up to read earlier messages, they are forced back to bottom. The `showScrollButton` state is SHOWN correctly but not USED to prevent the auto-scroll.

---

### 🟡 FE-13 — `loadStoredProjects()` Does Not Validate `description` Field

**File:** `src/lib/chat-storage.ts`
```typescript
function isStoredProject(value: unknown): value is StoredProject {
  // checks: id, name, instructions, createdAt, updatedAt
  // does NOT check: description  ← missing validation
}
```
The `StoredProject` type includes `description: string` but `isStoredProject()` doesn't validate it. When `.map()` adds `description: project.description ?? ""`, TypeScript accepts it. If stored data has a null/undefined description for any reason, the guard passes but the field is wrong.

---

### 🟡 FE-14 — ChatComposer `disabled` Prop Unused in AppShell Call

**File:** `src/components/chat/chat-panel.tsx`
```typescript
<ChatComposer disabled={false} loading={loading} ... />
```
The `disabled` prop is hardcoded to `false` always. Even when `loading=true`, the user can submit another message, creating concurrent requests. Should be `disabled={loading}`.

---

### 🟡 FE-15 — `reconcileAssistantMessageWithCanonicalOutput` Has Race Condition

**File:** `src/components/app-shell.tsx`  
**Root Cause:**  
The function is called async after the initial response. During the 29.5-second retry window (6 retries), the user could:
1. Switch to a different chat
2. The active session reference changes
3. When the output resolves, the stale session reference causes the update to land in the wrong session or be silently dropped

---

## SECTION 5 — NON-FUNCTIONAL UI ELEMENTS (Disabled/Placeholder Buttons)

---

### 🟡 UI-01 — Sidebar "Search Prompts" Button is Non-Functional
**File:** `src/components/workspace/sidebar.tsx`  
`onSelect: onExpand` — just expands the sidebar. No search UI exists.

### 🟡 UI-02 — Sidebar "More" Button is Non-Functional
**File:** `src/components/workspace/sidebar.tsx`  
`onSelect: onExpand` — same as above. No "More" panel exists.

### 🟡 UI-03 — Sidebar "Settings" Button is Non-Functional
**File:** `src/components/workspace/sidebar.tsx`  
`onSelect: onExpand` — no settings page or panel exists.

### 🟡 UI-04 — ChatComposer "Plus" (Attach) Button Always Disabled
**File:** `src/components/chat/chat-composer.tsx`  
```typescript
<button type="button" disabled ...>  // hardcoded disabled
```
Attachment functionality doesn't exist.

### 🟡 UI-05 — ChatComposer "Instant" Model Selector Always Disabled
**File:** `src/components/chat/chat-composer.tsx`  
```typescript
<button type="button" disabled ...>  // hardcoded disabled
```
Model selection UI doesn't work.

### 🟡 UI-06 — ChatComposer "Mic" (Voice) Button Always Disabled
**File:** `src/components/chat/chat-composer.tsx`  
```typescript
<button type="button" disabled ...>  // hardcoded disabled
```
Voice input doesn't exist.

### 🟡 UI-07 — Chat Context Menu "Share" and "Share Workspace Access" Are Empty No-ops
**File:** `src/components/workspace/sidebar.tsx`  
Both buttons have no `onClick` handler. Clicking does nothing.

### 🟡 UI-08 — ProjectDashboard "Sources" Tab is Fully Placeholder
**File:** `src/components/workspace/project-dashboard.tsx`  
Shows `Upload` icon and static text. No file upload or source management exists.

### 🟡 UI-09 — Public Navbar Nav Items (Image, Video, Campaigns, etc.) Do Nothing
**File:** `src/components/public/public-navbar.tsx`  
Only "Explore" has an action. All other nav items (`Image`, `Video`, `Campaigns`, `References`, `Products`) are non-functional buttons with no routes.

---

## SECTION 6 — n8n / AUTOMATION BUGS

---

### 🔴 N8N-01 — Primary Error: "Workflow Did Not Return Usable Output"

**Root Cause Chain:**  
1. User sends message → frontend POSTs to `/api/chat/intake`
2. API sends to n8n `WF-00A`
3. WF-00A → SW-00A (normalize) → SW-00B (route) → SW-00C (brief extract) → SW-00D (response)
4. WF-00A → WF-01 (create prompt request) → WF-10 (generate prompt)
5. **WF-10 is a layer-1 draft only** — it calls OpenAI but doesn't have full domain knowledge
6. The response returns to frontend as `message_to_user` with error text OR with no content at all
7. Frontend `normalizeWorkflowResponse()` finds both `message_to_user` and `generated_prompt` null
8. `getAssistantMessageContent()` returns null
9. Error message displayed to user

**Sub-causes within WF-10:**
- Only `advertising_concepts` loaded as domain-specific knowledge (8 other domain tables missing)
- No `prompt_validation_rules` applied
- No `repair_strategies` applied
- No product/character lock context loaded
- No reference analysis context loaded
- `WF-11 Prompt Validation And Improvement Engine` referenced but doesn't exist

---

### 🔴 N8N-02 — WF-00A Has Hardcoded Supabase JWT/API Key

**File:** n8n `WF-00A Chat Intake Skeleton` → `HTTP Request` node  
**Impact:** Security vulnerability. Hardcoded credentials in workflow JSON. If workflow is exported/shared, credentials are exposed. Credential must be rotated and moved to n8n credentials/environment variables.

---

### 🟠 N8N-03 — WF-10 Sets Status to "validating" But WF-11 Doesn't Exist

**File:** n8n `WF-10` → `Update Prompt Request To Validating`  
WF-10 sets `prompt_requests.status = 'validating'` then returns `next_workflow = "WF-11 Prompt Validation And Improvement Engine"`. WF-11 does not exist. Prompt requests stay in `validating` status permanently. Validation, quality scoring, and repair never happen.

---

### 🟠 N8N-04 — Campaign and Revision Routes Fail at WF-01 Gate

**File:** n8n `WF-01`, `SW-00B`  
SW-00B can set `route = "campaign_request"` or `route = "revise_existing_prompt"` with `needs_prompt_request = true`. But WF-01 only accepts `router_route === "create_prompt_request"`. Campaign and revision requests are silently dropped at WF-01's validation gate.

---

### 🟠 N8N-05 — Knowledge Retrieval Is Broad and Shallow

**File:** n8n `WF-10` → `Load Relevant Creative Knowledge Blocks`  
Loads ALL active knowledge blocks up to limit=40, then filters in JavaScript code. This:
1. Misses semantic relevance (no vector search)
2. May hit the limit before domain-relevant blocks
3. Missing entire domain tables: `lighting_profiles`, `lens_profiles`, `composition_patterns`, `camera_angle_profiles`, `shot_type_profiles`, `material_profiles`, `retouching_profiles`, `social_media_formats`, `video_motion_profiles`

---

### 🟡 N8N-06 — WF-10 `Load Relevant Domain Rows` Only Loads `advertising_concepts`

**File:** n8n `WF-10`  
This node is named "Load Relevant Domain Rows" but only queries `advertising_concepts`. For non-product-ad prompts (image direction, video, campaign, etc.), this domain data is irrelevant, yet domain data specific to those output types is absent.

---

## SECTION 7 — PERFORMANCE & ARCHITECTURE ISSUES

---

### 🟡 PERF-01 — `buildPromptContextPack` Makes 20+ Parallel DB Queries on Every Request

**File:** `src/lib/prompt-context-pack.ts`  
On every `/api/chat/intake` call, 14 domain tables + 6 rule tables = **20 parallel Supabase queries** are executed. ALL domain data is retrieved regardless of what the user is asking. This:
1. Adds ~200-500ms latency to every request
2. Fetches irrelevant data (e.g., `video_motion_profiles` for an image prompt)
3. Creates unnecessary read pressure on Supabase
4. Silently returns empty arrays on failure (error swallowed)

---

### 🟡 PERF-02 — 120-Second Webhook Timeout Creates Long Error Waits

**File:** `src/lib/app-config.ts`
```typescript
webhookTimeoutMs: 120000  // 2 minutes
```
If n8n is slow or unresponsive, users wait up to 2 minutes before seeing a timeout error. No progress indicator or intermediate feedback is shown during this wait.

---

### 🟡 PERF-03 — 6-Retry Output Resolution Takes Up to 29.5 Seconds

**File:** `src/components/app-shell.tsx` → `CANONICAL_OUTPUT_RETRY_DELAYS`
```typescript
const CANONICAL_OUTPUT_RETRY_DELAYS = [0, 1500, 3000, 5000, 8000, 12000]
// Total potential wait: 29,500ms
```
After n8n responds, the frontend polls for the canonical generated output 6 times over 29.5 seconds. If n8n is fast, the output is available immediately (retry 0 succeeds). If n8n is slow, users may see the intermediate `message_to_user` for up to 30 seconds before the full prompt appears.

---

### 🟡 PERF-04 — `promptContextPack` Build Errors Silently Return Empty Data

**File:** `src/lib/prompt-context-pack.ts` → `fetchDomainRows()`
```typescript
} catch {
  return { domain: config.domain, rows: [] };
}
```
If Supabase is unreachable or a table query fails, an empty array is returned silently. n8n receives a context pack with no domain knowledge and attempts to generate a prompt anyway, producing low-quality output with no error feedback.

---

## SECTION 8 — LANDING PAGE BUGS (From Current Code)

---

### 🟡 LP-01 — `EditorialProofBar` InViewApply Pattern Has Nested Reveal Bug

**File:** `src/components/public/landing-sections.tsx`  
The `EditorialProofBar` renders:
```jsx
<div className="reveal-up py-6 md:px-7" ...>  // outer div has reveal-up but no in-view applied
  <InViewApply inView={inView} className="reveal-up">  // adds another reveal-up inside
    <div className="py-0">
```
The outer div has `reveal-up` permanently without `in-view` being toggled. The `InViewApply` adds `in-view` to an inner div. Result: the outer div never animates (stays invisible), inner div animates inside an invisible parent. Content never appears correctly.

---

### 🟡 LP-02 — `PromptPreviewCard` Uses `window.setTimeout` Instead of `setTimeout`

**File:** `src/components/public/hero-showcase.tsx`
```typescript
window.setTimeout(() => setStep(i + 1), delay)
```
In SSR context or test environments, `window` may not exist. Should use `setTimeout` directly or wrap in `useEffect` with cleanup. (Currently inside `useEffect` so SSR is not an issue, but `window.setTimeout` is still non-idiomatic and could cause issues in certain environments.)

---

### 🟡 LP-03 — Stats Numbers in Hero Are Hard-Coded and Not Verified

**File:** `src/components/public/hero-showcase.tsx`
```typescript
{ value: "8+", label: "Direction modules" },
{ value: "12+", label: "AI tools supported" },
{ value: "100%", label: "Prompt control" },
```
"12+ AI tools supported" — the code shows 8 tools listed in `ToolEcosystemSection`. The number is inconsistent.

---

## SECTION 9 — MISSING API INTEGRATIONS (APIs Exist, Frontend Ignores Them)

This is a summary of backend endpoints that are production-ready but never called by the frontend:

| Endpoint | Status | Frontend Usage |
|---|---|---|
| `GET /api/projects` | ✅ Complete | ❌ Never called |
| `POST /api/projects` | ✅ Complete | ❌ Never called |
| `PATCH /api/conversations/[sessionId]` | ✅ Complete (title, pin, archive, projectId) | ❌ Never called |
| `GET /api/conversations/[sessionId]/messages` | ✅ Complete | ✅ Called on session select |
| `GET /api/conversations` | ✅ Complete | ✅ Called on load |
| `POST /api/generated-outputs/resolve` | ✅ Complete | ✅ Called on output resolve |
| `GET /api/generated-outputs/[outputId]` | ✅ Complete | ❌ Never called |
| `GET /api/generated-outputs/by-prompt-request/[id]` | ✅ Complete | ❌ Never called |

---

## SECTION 10 — SQL FIX REQUIRED IN SUPABASE

The only database-side fix that cannot be done in code:

```sql
-- Migration: fix_ensure_user_onboarding_ambiguous_column
CREATE OR REPLACE FUNCTION public.ensure_user_onboarding()
 RETURNS TABLE(user_id uuid, workspace_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_full_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication required for onboarding'
      using errcode = '28000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));

  select coalesce(
    nullif(au.raw_user_meta_data ->> 'full_name', ''),
    nullif(au.email, ''),
    'New User'
  )
    into v_full_name
  from auth.users as au
  where au.id = v_user_id;

  v_full_name := coalesce(v_full_name, 'New User');

  insert into public.user_profiles (
    id, full_name, default_language, timezone, role, status
  )
  values (
    v_user_id, v_full_name, 'en', 'Africa/Cairo', 'user', 'active'
  )
  on conflict (id) do nothing;

  select wm.workspace_id
    into v_workspace_id
  from public.workspace_members as wm
  where wm.user_id = v_user_id
  order by wm.created_at asc
  limit 1;

  if v_workspace_id is not null then
    return query select v_user_id as user_id, v_workspace_id as workspace_id;
    return;
  end if;

  insert into public.workspaces (name, owner_id, plan, billing_status, settings)
  values ('My Workspace', v_user_id, 'free', 'active', '{}'::jsonb)
  returning id into v_workspace_id;

  -- FIX: use named constraint instead of ambiguous column list
  insert into public.workspace_members (workspace_id, user_id, role, permissions)
  values (v_workspace_id, v_user_id, 'owner', '{"all": true}'::jsonb)
  on conflict on constraint workspace_members_unique_user_workspace do update
    set
      role = excluded.role,
      permissions = excluded.permissions,
      updated_at = timezone('utc', now());

  return query select v_user_id as user_id, v_workspace_id as workspace_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.ensure_user_onboarding() TO authenticated;
```

---

## FULL BUG COUNT SUMMARY

| Severity | Count | Category |
|---|---|---|
| 🔴 Critical | 8 | DB-01, AUTH-01, FE-01, FE-02, FE-03, FE-04, FE-05, N8N-01 |
| 🟠 High | 10 | AUTH-02, FE-06, FE-07, FE-08, FE-09, DB-02, DB-03, N8N-02, N8N-03, N8N-04 |
| 🟡 Medium | 20 | FE-10 through FE-15, UI-01 through UI-09, DB-04, DB-05, N8N-05, N8N-06, PERF-01 through PERF-04, LP-01 through LP-03 |

**Total: 38 documented problems**

---

## RECOMMENDED FIX SEQUENCE

### Phase 1 — Unblock Core Functionality (Fix These First)
1. **SQL:** Run `ensure_user_onboarding` migration fix (DB-01) → New users can sign in
2. **Code:** Rename `src/proxy.ts` → `src/middleware.ts` (AUTH-01) → Route protection works
3. **Code:** Fix `/auth/confirm` redirect to `/login` (AUTH-02) → Auth errors don't 404
4. **Code:** Fix `handleCreateProject` to call `POST /api/projects` (FE-01, FE-05) → Project chats work
5. **Code:** Fix app load to call `GET /api/projects` (FE-02) → Projects appear after reload
6. **Code:** Fix `handleCreateProject` signature to include description (FE-03) → Description saves
7. **Code:** Fix `ProjectDashboard` props in AppShell call (FE-04) → Project dashboard works

### Phase 2 — Wire Existing APIs
8. **Code:** Call `PATCH /api/conversations/[sessionId]` on rename/pin/archive/move (FE-06, FE-07)
9. **n8n:** Fix `message_type` mapping before conversation_messages insert (DB-02)
10. **n8n:** Fix `output_type` vocabulary in SW-00C and WF-01 (DB-03)
11. **n8n:** Add `active=true` filter to prompt_assembly_rules query (DB-04)

### Phase 3 — Improve Automation Quality
12. **n8n:** Load missing domain knowledge tables in WF-10 (N8N-05, N8N-06)
13. **n8n:** Build WF-11 Validation Engine (N8N-03)
14. **n8n:** Implement campaign and revision routes (N8N-04)
15. **n8n:** Move hardcoded JWT to credentials (N8N-02)

### Phase 4 — Polish
16. Fix `ChatComposer disabled={false}` → `disabled={loading}` (FE-14)
17. Fix auto-scroll behavior (FE-12)
18. Fix LP-01 InViewApply pattern in landing sections
19. Clear `playedAnimationKeys` on session change (FE-11)
20. Reduce webhook timeout or add streaming progress (PERF-02)
