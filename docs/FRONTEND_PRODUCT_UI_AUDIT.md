# Frontend Product/UI Audit

## Status

This audit starts the product-facing implementation phase after repo hygiene, Next.js cleanup, Supabase live schema audit, and CI setup.

## Current product surface

### Public landing page

`src/app/page.tsx` is a client landing page with:

- `PublicNavbar`
- `HeroShowcase`
- auth modal handling
- multiple editorial landing sections
- Supabase auth session awareness

This page is already visually strong and should not be rebuilt from scratch.

### Authenticated app shell

`src/app/chat/page.tsx` protects access through Supabase Auth, runs `ensure_user_onboarding()`, checks the active workspace cookie, and renders `AppShell`.

This is the correct protection pattern.

### Create route

`src/app/create/page.tsx` currently redirects to `/chat`.

That means there is no dedicated create experience yet.

### App shell

`src/components/app-shell.tsx` currently owns a large amount of responsibility:

- URL state
- chat selection
- project selection
- local project persistence
- local chat persistence fallback
- Supabase conversation loading
- generated output reconciliation
- temporary chats
- project modal state
- sign out
- sidebar/topbar/chat panel composition

This works, but it is becoming a product architecture bottleneck.

## Key findings

### 1. Landing is stronger than authenticated product UI

The public site communicates the Rune brand well, but the authenticated workspace is still mostly a chat shell. The product vision needs structured creative direction surfaces, not only a chat composer.

### 2. `/create` is not implemented as a real page

The route currently redirects to `/chat`. This blocks a proper brief-building flow and makes the navigation label less meaningful.

### 3. Project state is still local-first

`handleCreateProject()` creates a local `StoredProject` instead of persisting to the Supabase `projects` table.

This is acceptable as a fallback, but not as the primary production path because live Supabase already has `projects`, `brands`, `campaign_projects`, `reference_assets`, product tables, and character tables.

### 4. AppShell needs decomposition before heavy features

Adding reference upload, product locks, character locks, campaigns, and validation UI directly into `AppShell` would make the file fragile.

Before adding major UI features, extract product concerns into smaller modules.

### 5. First UI improvement should not touch database writes

The live database is already connected and has real data. The safest first product UI step is a non-destructive shell enhancement that improves navigation and creates clear surfaces for future database-backed modules.

## Product UI gaps

### Missing now

- dedicated `/create` brief builder surface
- reference upload and reference role selection UI
- product profile / product lock UI
- character profile / character lock UI
- campaign builder UI
- output validation/repair status UI
- generated output detail view
- workspace/project database-backed creation flow
- brand library UI
- knowledge/retrieval inspector UI

### Present now

- public landing
- auth modal
- protected chat route
- chat shell
- conversation history loading
- generated output reconciliation
- local project fallback
- temporary chat support

## Recommended implementation order

### Step 1 — Create experience shell

Create a real `/create` route that renders the existing app shell in create mode instead of redirecting blindly.

Goal:

- make navigation honest
- add a structured entry point for briefs
- avoid changing database writes yet
- preserve current chat flow

### Step 2 — AppShell mode separation

Introduce a lightweight route mode concept:

```ts
chat | create | outputs | conversations
```

This allows UI panels to adapt without duplicating the whole shell.

### Step 3 — Brief builder panel

Add a structured brief panel beside/above the chat composer:

- output type
- platform
- product/reference toggles
- campaign intent
- constraints
- visual direction notes

Initially this can submit into the same chat intake route so the n8n/Supabase connection remains intact.

### Step 4 — Database-backed project creation

Replace local-only project creation with a server route that writes to `projects`, while keeping local fallback only for failure mode.

### Step 5 — Reference upload UI

Add Supabase Storage upload through a server route or signed upload pattern, then insert metadata into `reference_assets`.

## First implementation decision

Do not redesign the landing page first.

The highest-value next implementation is `/create` becoming a real authenticated product surface while preserving the current `/chat` flow.

## Stop condition

Before implementing product features, confirm the next branch should be:

```text
feature/create-experience-shell
```

This branch should only introduce the create shell and route-mode foundation. It should not change production database schema.
