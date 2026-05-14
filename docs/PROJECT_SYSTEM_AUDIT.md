# Rune Platform — Project System Audit

## Audit status

Initial system audit created after local `npm install`, `npm run typecheck`, and `npm run build` completed successfully on the developer machine.

## Current baseline

- Framework: Next.js App Router
- Language: TypeScript with `strict: true`
- UI: Tailwind CSS
- Auth: Supabase Auth
- Backend bridge: server-side n8n workflow proxy through `/api/chat/intake`
- Database target: Supabase PostgreSQL
- Storage target: Supabase Storage

## Confirmed source files reviewed

- `package.json`
- `README.md`
- `.env.example`
- `next.config.ts`
- `tsconfig.json`
- `src/middleware.ts`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/api/chat/intake/route.ts`
- `src/lib/app-config.ts`

## High-level findings

### 1. Build baseline is healthy

The project currently installs and builds locally. This means the next work should not be random debugging. It should be controlled cleanup and architecture alignment.

### 2. Repo structure needs cleanup before deployment

The repository appears to include generated reports and at least one compressed source archive in the root. These should not stay in the deployable root because they can confuse maintainers, increase repository size, and make deployment context noisy.

Recommended cleanup target:

- move useful reports into `docs/reports/`
- delete committed ZIP archives from Git history going forward
- keep only source, migrations, config, and documentation needed for development/deployment

### 3. Environment handling is mostly safe

`.env.example` exposes only public placeholders and the n8n webhook variable. No service role key should ever be added to frontend or public GitHub.

Required production variables:

```bash
N8N_CHAT_INTAKE_WEBHOOK_URL=
NEXT_PUBLIC_APP_NAME=Rune
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 4. Auth flow is present but database contract must be verified

The frontend expects Supabase onboarding through `ensure_user_onboarding()` and an active workspace cookie. Before expanding UI features, the Supabase migration must be verified against this frontend contract.

Critical dependency:

- `ensure_user_onboarding()` RPC exists
- workspace membership rows are created correctly
- active workspace cookie maps to a valid workspace
- RLS allows authenticated workspace reads/writes

### 5. n8n proxy design is correct

The browser does not call n8n directly. The server route `/api/chat/intake` forwards requests to `N8N_CHAT_INTAKE_WEBHOOK_URL`, validates input shape, normalizes n8n response, and returns a UI-safe payload.

This is the correct direction.

### 6. Development IDs must be removed from runtime config

`src/lib/app-config.ts` still contains hardcoded development IDs. Even if they are not currently the active data path everywhere, they should be removed before production deployment.

Current risky fields:

```ts
workspaceId
userId
projectId
```

Correct direction:

- workspace ID comes from authenticated active workspace
- user ID comes from Supabase auth/session profile
- project ID comes from selected project or created project record

### 7. Product architecture is still Phase 1 frontend

The README explicitly lists missing product layers:

- reference upload
- product locking UI
- character locking UI
- campaign builder UI
- full validation and repair workflows
- canonical Supabase conversation/output persistence

These are expected gaps, but they must be built against the database plan, not hardcoded UI state.

## First safe implementation step

### Step name

Repository hygiene and runtime config cleanup.

### Goal

Make the repo safe and clean before deeper product work.

### Why this comes now

The project builds. The next risk is not TypeScript. The next risk is messy deployment context and hardcoded development configuration.

### What should change

1. Move report `.txt` files into `docs/reports/` if they are useful.
2. Remove committed `.zip` archives from the repo.
3. Update `.gitignore` to block future archives and generated reports if needed.
4. Remove unused hardcoded development IDs from `src/lib/app-config.ts` or isolate them as explicit test-only constants.

### Verification

After cleanup:

```bash
npm run typecheck
npm run build
```

Both must pass.

## Stop condition

Do not implement new product features until repository hygiene and runtime config cleanup are done.
