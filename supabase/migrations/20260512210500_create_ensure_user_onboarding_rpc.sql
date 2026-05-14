-- Create an authenticated, idempotent onboarding RPC for Email OTP signup.
-- This migration is intentionally local-only until applied to Supabase explicitly.

create or replace function public.ensure_user_onboarding()
returns table (
  user_id uuid,
  workspace_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all on function public.ensure_user_onboarding() from public;
revoke all on function public.ensure_user_onboarding() from anon;
revoke all on function public.ensure_user_onboarding() from authenticated;
grant execute on function public.ensure_user_onboarding() to authenticated;
