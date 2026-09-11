begin;

-- New accounts receive a profile at signup. Workspace provisioning is deferred
-- until onboarding so the user can choose the organization name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

create or replace function public.create_initial_workspace(
  p_full_name text,
  p_organization_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_existing_organization_id uuid;
  v_organization_id uuid;
  v_base_slug text;
  v_candidate_slug text;
  v_suffix integer := 1;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_full_name is null or char_length(trim(p_full_name)) not between 2 and 100 then
    raise exception 'Invalid full name' using errcode = '22023';
  end if;
  if p_organization_name is null or char_length(trim(p_organization_name)) not between 2 and 100 then
    raise exception 'Invalid organization name' using errcode = '22023';
  end if;

  -- Serialize duplicate submissions for this authenticated account.
  select email into v_email from auth.users where id = v_user_id for update;
  if v_email is null then
    raise exception 'Authenticated user record not found' using errcode = '42501';
  end if;

  select organization_id into v_existing_organization_id
    from public.organization_members
   where user_id = v_user_id
   order by created_at
   limit 1;
  if v_existing_organization_id is not null then
    return v_existing_organization_id;
  end if;

  insert into public.profiles (id, email, full_name)
  values (v_user_id, v_email, trim(p_full_name))
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  v_base_slug := trim(both '-' from regexp_replace(lower(trim(p_organization_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug = '' then v_base_slug := 'workspace'; end if;
  v_base_slug := left(v_base_slug, 55);

  -- Serialize allocation for the same base slug to avoid collision races.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_base_slug)::bigint);
  v_candidate_slug := v_base_slug;
  while exists (select 1 from public.organizations where slug = v_candidate_slug) loop
    v_suffix := v_suffix + 1;
    v_candidate_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.organizations (name, slug, owner_id)
  values (trim(p_organization_name), v_candidate_slug, v_user_id)
  returning id into v_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'owner');

  return v_organization_id;
end;
$$;

revoke all on function public.create_initial_workspace(text, text) from public;
revoke all on function public.create_initial_workspace(text, text) from anon;
grant execute on function public.create_initial_workspace(text, text) to authenticated;

commit;
