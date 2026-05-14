# Rune Frontend

Rune is a creative prompt direction system that turns ideas, briefs, and creative direction into AI-executable prompts ready to run in any generation tool.

**Tagline:** Built here. Executed anywhere.  
**Value proposition:** From ideas to AI-executable prompts.

Rune is not an image generator, a video generator, or a basic prompt generator. It is the structured layer before execution: brief analysis, prompt assembly, validation, repair, saved history, and feedback.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- n8n server-side workflow proxy

## Install

```bash
npm install
```

## Environment

Create `.env.local` with:

```bash
N8N_CHAT_INTAKE_WEBHOOK_URL=
NEXT_PUBLIC_APP_NAME=Rune
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Never use a Supabase service role key in browser code.

## Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000/login
```

## n8n Connection

The browser never calls n8n directly. Chat intake is sent to:

```text
POST /api/chat/intake
```

The server route forwards the request to `N8N_CHAT_INTAKE_WEBHOOK_URL`, normalizes the workflow response, and returns a UI-safe payload.

## Supabase Auth

Rune uses Supabase Email OTP and Google OAuth where configured. After successful authentication, onboarding runs through the existing `ensure_user_onboarding()` RPC and stores the active workspace in an HTTP-only cookie.

For OTP email templates, use copy aligned to Rune:

```html
<p>Your Rune verification code is:</p>
<p>{{ .Token }}</p>
```

## Test

```bash
npm run typecheck
npm test
npm run build
```

## Known Limitations

- Reference upload is not implemented yet.
- Product locking UI is not implemented yet.
- Character locking UI is not implemented yet.
- Campaign builder UI is not implemented yet.
- Validation and repair are represented in the product language, but full UI workflows are still upcoming.
- Some development IDs remain in server configuration until authenticated workspace context fully replaces them everywhere.

## Next Phase

Connect the interface to canonical Supabase conversation and output records after auth/workspace reads are confirmed under RLS.
