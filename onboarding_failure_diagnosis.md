# Onboarding Failure Diagnosis

## 1. Confirmed Symptom

The Google-authenticated user exists in `auth.users`:

- `id`: `4b6a46f8-3866-4fc7-a7bf-9a99652608c7`
- `email`: `ahmed.elkilany11111@gmail.com`
- Google metadata includes `full_name`, `avatar_url`, and verified email fields.

The same user is missing from the onboarding-owned application tables:

- `public.user_profiles`
- `public.workspace_members`

Opening `/chat` now proves the user is authenticated, because the route reaches the onboarding RPC path instead of redirecting to `/?auth=login`. The route then redirects to `/?auth=login&error=onboarding_failed`, which means `public.ensure_user_onboarding()` is returning an error or no `workspace_id`.

## 2. Function Definition

Remote function summary for `public.ensure_user_onboarding()`:

```sql
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
    id,
    full_name,
    default_language,
    timezone,
    role,
    status
  )
  values (
    v_user_id,
    v_full_name,
    'en',
    'Africa/Cairo',
    'user',
    'active'
  )
  on conflict (id) do nothing;

  select wm.workspace_id
    into v_workspace_id
  from public.workspace_members as wm
  where wm.user_id = v_user_id
  order by wm.created_at asc
  limit 1;

  if v_workspace_id is not null then
    return query
    select v_user_id, v_workspace_id;
    return;
  end if;

  insert into public.workspaces (
    name,
    owner_id,
    plan,
    billing_status,
    settings
  )
  values (
    'My Workspace',
    v_user_id,
    'free',
    'active',
    '{}'::jsonb
  )
  returning id into v_workspace_id;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    permissions
  )
  values (
    v_workspace_id,
    v_user_id,
    'owner',
    '{"all": true}'::jsonb
  )
  on conflict (workspace_id, user_id) do update
    set
      role = excluded.role,
      permissions = excluded.permissions,
      updated_at = timezone('utc', now());

  return query
  select v_user_id, v_workspace_id;
end;
$function$
```

## 3. Likely Failure Cause

The likely failing statement is the `workspace_members` upsert:

```sql
on conflict (workspace_id, user_id) do update
```

The Postgres logs show the exact runtime error:

```text
column reference "workspace_id" is ambiguous
```

This is likely caused by the function return column named `workspace_id`:

```sql
RETURNS TABLE(user_id uuid, workspace_id uuid)
```

In PL/pgSQL, output columns are also variables inside the function body. The unqualified `workspace_id` in the `ON CONFLICT (workspace_id, user_id)` conflict target can collide with the output variable `workspace_id`, producing the ambiguity error. This explains why onboarding fails for a new Google user who has no existing membership and therefore reaches the `workspace_members` insert/upsert path.

Existing users who already have membership can return earlier from:

```sql
if v_workspace_id is not null then
  return query
  select v_user_id, v_workspace_id;
  return;
end if;
```

So the function can appear to work for users already onboarded while failing for new users.

## 4. Evidence

Function evidence:

- The function returns `TABLE(user_id uuid, workspace_id uuid)`.
- The function later uses `on conflict (workspace_id, user_id)`.
- The new Google user has no `workspace_members` row, so the function must execute the insert/upsert block.

Log evidence:

- Supabase API logs show repeated `POST | 400 | /rest/v1/rpc/ensure_user_onboarding`.
- Postgres logs show repeated errors:
  - `column reference "workspace_id" is ambiguous`

Constraint evidence:

- `public.workspace_members` has the required unique constraint:
  - `workspace_members_unique_user_workspace`
  - `UNIQUE (workspace_id, user_id)`
- Therefore the upsert should target the named constraint instead of the ambiguous column list.

Relevant constraints checked:

- `user_profiles_role_check`: allows `user`, `admin`, `super_admin`.
- `user_profiles_status_check`: allows `active`, `inactive`, `suspended`.
- `workspaces_plan_check`: allows `free`, `pro`, `team`, `enterprise`.
- `workspaces_billing_status_check`: allows `active`, `past_due`, `cancelled`, `trialing`.
- `workspace_members_role_check`: allows `owner`, `admin`, `editor`, `viewer`, `client`.
- `workspaces_owner_id_fkey`: references `user_profiles(id)`.
- `workspace_members_user_id_fkey`: references `user_profiles(id)`.
- `workspace_members_workspace_id_fkey`: references `workspaces(id)`.

The values used by the RPC are compatible with these constraints:

- profile `role = 'user'`
- profile `status = 'active'`
- workspace `plan = 'free'`
- workspace `billing_status = 'active'`
- member `role = 'owner'`

RLS evidence:

- `user_profiles`, `workspaces`, and `workspace_members` all have RLS enabled.
- `forcerowsecurity = false` for all three tables.
- The function is `SECURITY DEFINER`.
- The function owner is `postgres`.
- The three tables are owned by `postgres`.

So forced RLS and missing owner permissions are not the likely cause.

Grant evidence:

- `EXECUTE` on `ensure_user_onboarding` is granted to `authenticated`.
- `anon` and `public` do not have execute grants.

Trigger evidence:

- The only triggers on these tables are `BEFORE UPDATE` timestamp triggers:
  - `set_user_profiles_updated_at`
  - `set_workspace_members_updated_at`
  - `set_workspaces_updated_at`

These are not likely to block the initial inserts.

## 5. Minimal Fix Recommendation

Create a small SQL migration that replaces the ambiguous upsert conflict target in `public.ensure_user_onboarding()`.

Change:

```sql
on conflict (workspace_id, user_id) do update
```

To:

```sql
on conflict on constraint workspace_members_unique_user_workspace do update
```

This avoids referencing the ambiguous column name and uses the existing unique constraint directly.

Keep the rest of the function behavior unchanged:

- Keep `SECURITY DEFINER`.
- Keep `SET search_path = ''`.
- Keep `auth.uid()` as the only identity.
- Keep no `user_id` or `workspace_id` arguments.
- Keep the return shape `TABLE(user_id uuid, workspace_id uuid)`.
- Keep execute grant to `authenticated`.
- Do not add broad RLS insert policies.
- Do not use service role in the frontend.

Optional hardening in the same migration, if desired but not strictly required:

- Alias output expressions in `return query`:

```sql
return query
select v_user_id as user_id, v_workspace_id as workspace_id;
```

The durable minimal fix is still the named constraint conflict target.

## 6. Verification Plan

After applying the migration:

1. Sign in with Google using the affected account.
2. Open `/chat`.
3. Confirm `/chat` does not redirect to `/?auth=login&error=onboarding_failed`.
4. Confirm `public.user_profiles` contains:
   - `id = 4b6a46f8-3866-4fc7-a7bf-9a99652608c7`
5. Confirm `public.workspaces` contains a workspace where:
   - `owner_id = 4b6a46f8-3866-4fc7-a7bf-9a99652608c7`
6. Confirm `public.workspace_members` contains:
   - `user_id = 4b6a46f8-3866-4fc7-a7bf-9a99652608c7`
   - `role = 'owner'`
7. Confirm `acd_active_workspace_id` is set by the app after onboarding.
8. Reopen `/chat` and confirm onboarding is idempotent and does not create duplicate workspace membership rows.
