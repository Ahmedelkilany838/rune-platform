# Rune Platform — Project System Audit

## Status

Local verification is currently healthy:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

The app opened successfully at the local dev server.

## Current architecture baseline

- Next.js App Router frontend
- TypeScript strict mode
- Tailwind CSS
- Supabase Auth
- Supabase database dependency
- n8n server-side proxy through `POST /api/chat/intake`
- Workspace-aware auth flow through `ensure_user_onboarding()`

## Findings

### 1. Build baseline is good

The current source compiles and builds. This gives us a safe foundation for controlled cleanup and architecture hardening.

### 2. Repo hygiene needed cleanup

The root contained generated diagnostic reports and a compressed source archive. These do not belong in the deployable root. Generated artifacts make deployment context noisy and can confuse future implementation work.

Action in this branch:

- Harden `.gitignore`
- Add this system audit under `docs/`
- Remove hardcoded development IDs from runtime config
- Remove generated root reports from tracked source

### 3. Runtime config had development IDs

`src/lib/app-config.ts` contained fixed development UUIDs. Runtime identity should come from authenticated Supabase workspace/user state, not app config.

Action in this branch:

- removed `workspaceId`
- removed `userId`
- removed `projectId`

### 4. Auth and workspace contract must stay central

The frontend expects:

- Supabase Auth session
- `ensure_user_onboarding()` RPC
- active workspace cookie
- workspace-scoped database reads/writes

Do not bypass this with local-only identity state.

### 5. n8n proxy direction is correct

The browser should not call n8n directly. The current server route pattern is correct:

```text
browser → /api/chat/intake → n8n webhook → normalized UI response
```

## Next safe step

After this branch is merged locally:

```bash
git pull origin main
npm install
npm run typecheck
npm run build
```

Then we continue with the first real product architecture pass:

```text
Supabase contract audit → chat persistence → generated output persistence → reference upload plan
```
