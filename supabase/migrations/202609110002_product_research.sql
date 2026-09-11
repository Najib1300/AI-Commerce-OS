begin;

create type public.product_research_status as enum ('queued', 'running', 'completed', 'failed');
create type public.product_opportunity_status as enum ('discovered', 'shortlisted', 'selected', 'rejected');

-- API roles need USAGE on public, but never need to create schema objects.
-- Revoking CREATE does not affect normal PostgREST table/function access.
revoke create on schema public from public, anon, authenticated;

-- Preserve the Phase 1A helper contract while removing its mutable search path.
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.organization_members
     where organization_id = target_org
       and user_id = auth.uid()
  )
$$;

alter table public.businesses
  add constraint businesses_id_organization_unique unique (id, organization_id);

create table public.product_research_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null,
  status public.product_research_status not null default 'queued',
  target_market text not null check (char_length(target_market) between 2 and 100),
  target_country text not null check (char_length(target_country) between 2 and 80),
  niche text not null check (char_length(niche) between 2 and 100),
  budget numeric(14,2) not null check (budget >= 0),
  maximum_supplier_cost numeric(14,2) not null check (maximum_supplier_cost > 0),
  preferred_selling_price numeric(14,2) not null check (preferred_selling_price > 0),
  requested_product_count integer not null check (requested_product_count between 1 and 10),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  constraint product_research_runs_business_fk
    foreign key (business_id, organization_id)
    references public.businesses(id, organization_id) on delete cascade,
  constraint product_research_runs_identity_unique unique (id, business_id, organization_id)
);

create table public.product_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null,
  research_run_id uuid not null,
  name text not null check (char_length(name) between 2 and 160),
  category text not null check (char_length(category) between 2 and 100),
  description text not null,
  target_customer text not null,
  supplier_cost numeric(14,2) not null check (supplier_cost >= 0),
  suggested_price numeric(14,2) not null check (suggested_price > 0),
  estimated_margin numeric(12,2) not null check (estimated_margin <= 100),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  demand_score numeric(5,2) not null check (demand_score between 0 and 100),
  competition_score numeric(5,2) not null check (competition_score between 0 and 100),
  trend_score numeric(5,2) not null check (trend_score between 0 and 100),
  marketing_score numeric(5,2) not null check (marketing_score between 0 and 100),
  shipping_score numeric(5,2) not null check (shipping_score between 0 and 100),
  risk_score numeric(5,2) not null check (risk_score between 0 and 100),
  margin_score numeric(5,2) not null check (margin_score between 0 and 100),
  overall_score numeric(5,2) not null check (overall_score between 0 and 100),
  reasoning text not null,
  search_keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(search_keywords) = 'array'),
  marketing_angles jsonb not null default '[]'::jsonb check (jsonb_typeof(marketing_angles) = 'array'),
  risks jsonb not null default '[]'::jsonb check (jsonb_typeof(risks) = 'array'),
  status public.product_opportunity_status not null default 'discovered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_opportunities_run_fk
    foreign key (research_run_id, business_id, organization_id)
    references public.product_research_runs(id, business_id, organization_id) on delete cascade
);

create index product_research_runs_org_business_idx
  on public.product_research_runs(organization_id, business_id, created_at desc);
create unique index product_research_runs_one_active_per_business
  on public.product_research_runs(business_id)
  where status in ('queued', 'running');
create index product_opportunities_org_business_idx
  on public.product_opportunities(organization_id, business_id, overall_score desc);
create index product_opportunities_run_idx on public.product_opportunities(research_run_id);
create unique index product_opportunities_one_selected_per_business
  on public.product_opportunities(business_id)
  where status = 'selected';

alter table public.product_research_runs enable row level security;
alter table public.product_opportunities enable row level security;

create policy product_research_runs_member_select
  on public.product_research_runs for select
  using (public.is_org_member(organization_id));

create policy product_opportunities_member_select
  on public.product_opportunities for select
  using (public.is_org_member(organization_id));

create trigger product_opportunities_updated
  before update on public.product_opportunities
  for each row execute function public.set_updated_at();

create function public.start_product_research(
  p_business_id uuid,
  p_target_market text,
  p_target_country text,
  p_niche text,
  p_budget numeric,
  p_maximum_supplier_cost numeric,
  p_preferred_selling_price numeric,
  p_requested_product_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_run_id uuid := pg_catalog.gen_random_uuid();
  v_job_id uuid := pg_catalog.gen_random_uuid();
  v_started_at timestamptz := pg_catalog.now();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_target_market is null or pg_catalog.char_length(pg_catalog.btrim(p_target_market)) not between 2 and 100
     or p_target_country is null or pg_catalog.char_length(pg_catalog.btrim(p_target_country)) not between 2 and 80
     or p_niche is null or pg_catalog.char_length(pg_catalog.btrim(p_niche)) not between 2 and 100
     or p_budget is null or p_budget < 0
     or p_maximum_supplier_cost is null or p_maximum_supplier_cost <= 0
     or (p_budget > 0 and p_maximum_supplier_cost > p_budget)
     or p_preferred_selling_price is null or p_preferred_selling_price <= 0
     or p_requested_product_count is null or p_requested_product_count not between 1 and 10 then
    raise exception 'Invalid product research input' using errcode = '22023';
  end if;

  select organization_id into v_organization_id
    from public.businesses
   where id = p_business_id;
  if v_organization_id is null or not exists (
    select 1 from public.organization_members
     where organization_id = v_organization_id and user_id = v_user_id
  ) then
    raise exception 'Business not found' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_business_id::text)::bigint);
  if exists (
    select 1 from public.product_research_runs
     where business_id = p_business_id and status in ('queued', 'running')
  ) then
    raise exception 'Research is already running for this business' using errcode = '23505';
  end if;

  insert into public.product_research_runs (
    id, organization_id, business_id, status, target_market, target_country, niche,
    budget, maximum_supplier_cost, preferred_selling_price, requested_product_count
  ) values (
    v_run_id, v_organization_id, p_business_id, 'queued', pg_catalog.btrim(p_target_market),
    pg_catalog.btrim(p_target_country), pg_catalog.btrim(p_niche), p_budget,
    p_maximum_supplier_cost, p_preferred_selling_price, p_requested_product_count
  );
  insert into public.ai_jobs (
    id, organization_id, business_id, job_type, status, input, attempts
  ) values (
    v_job_id, v_organization_id, p_business_id, 'product_research', 'queued',
    pg_catalog.jsonb_build_object(
      'researchRunId', v_run_id, 'businessId', p_business_id,
      'targetMarket', pg_catalog.btrim(p_target_market), 'targetCountry', pg_catalog.btrim(p_target_country),
      'niche', pg_catalog.btrim(p_niche), 'budget', p_budget,
      'maximumSupplierCost', p_maximum_supplier_cost,
      'preferredSellingPrice', p_preferred_selling_price,
      'productCount', p_requested_product_count
    ), 0
  );

  update public.product_research_runs
     set status = 'running', started_at = v_started_at
   where id = v_run_id and status = 'queued';
  update public.ai_jobs
     set status = 'running', started_at = v_started_at, attempts = 1
   where id = v_job_id and status = 'queued';
  update public.businesses
     set status = 'researching'
   where id = p_business_id and organization_id = v_organization_id;

  return pg_catalog.jsonb_build_object('run_id', v_run_id, 'job_id', v_job_id);
end;
$$;

create function public.complete_product_research(
  p_run_id uuid,
  p_job_id uuid,
  p_products jsonb,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_total_tokens integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_business_id uuid;
  v_requested_count integer;
  v_product_count integer;
  v_completed_at timestamptz := pg_catalog.now();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_products is null or pg_catalog.jsonb_typeof(p_products) <> 'array' then
    raise exception 'Products must be a JSON array' using errcode = '22023';
  end if;
  v_product_count := pg_catalog.jsonb_array_length(p_products);

  select organization_id, business_id, requested_product_count
    into v_organization_id, v_business_id, v_requested_count
    from public.product_research_runs
   where id = p_run_id and status = 'running'
   for update;
  if v_business_id is null or not exists (
    select 1 from public.organization_members
     where organization_id = v_organization_id and user_id = v_user_id
  ) then
    raise exception 'Running research not found' using errcode = '42501';
  end if;
  if v_product_count < 1 or v_product_count > v_requested_count or v_product_count > 10 then
    raise exception 'Invalid product count' using errcode = '22023';
  end if;
  if p_model is null or pg_catalog.char_length(pg_catalog.btrim(p_model)) not between 1 and 100
     or p_input_tokens is null or p_input_tokens < 0
     or p_output_tokens is null or p_output_tokens < 0
     or p_total_tokens is null or p_total_tokens < 0 then
    raise exception 'Invalid usage data' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.ai_jobs
     where id = p_job_id and organization_id = v_organization_id
       and business_id = v_business_id and job_type = 'product_research' and status = 'running'
  ) then
    raise exception 'Running AI job not found' using errcode = '42501';
  end if;

  insert into public.product_opportunities (
    id, organization_id, business_id, research_run_id, name, category, description,
    target_customer, supplier_cost, suggested_price, estimated_margin, currency,
    demand_score, competition_score, trend_score, marketing_score, shipping_score,
    risk_score, margin_score, overall_score, reasoning, search_keywords,
    marketing_angles, risks, status
  )
  select pg_catalog.gen_random_uuid(), v_organization_id, v_business_id, p_run_id,
    item.name, item.category, item.description, item.target_customer,
    item.supplier_cost, item.suggested_price, item.estimated_margin, item.currency,
    item.demand_score, item.competition_score, item.trend_score, item.marketing_score,
    item.shipping_score, item.risk_score, item.margin_score, item.overall_score,
    item.reasoning, item.search_keywords, item.marketing_angles, item.risks, 'discovered'
  from pg_catalog.jsonb_to_recordset(p_products) as item(
    name text, category text, description text, target_customer text,
    supplier_cost numeric, suggested_price numeric, estimated_margin numeric, currency text,
    demand_score numeric, competition_score numeric, trend_score numeric,
    marketing_score numeric, shipping_score numeric, risk_score numeric,
    margin_score numeric, overall_score numeric, reasoning text,
    search_keywords jsonb, marketing_angles jsonb, risks jsonb
  );

  insert into public.usage_records (organization_id, user_id, usage_type, quantity, metadata)
  values (
    v_organization_id, v_user_id, 'product_research', p_total_tokens,
    pg_catalog.jsonb_build_object(
      'model', pg_catalog.btrim(p_model), 'input_tokens', p_input_tokens,
      'output_tokens', p_output_tokens, 'total_tokens', p_total_tokens,
      'research_run_id', p_run_id
    )
  );
  update public.product_research_runs
     set status = 'completed', completed_at = v_completed_at, error = null
   where id = p_run_id and status = 'running';
  update public.ai_jobs
     set status = 'completed', completed_at = v_completed_at, error = null,
         output = pg_catalog.jsonb_build_object(
           'researchRunId', p_run_id, 'productCount', v_product_count,
           'model', pg_catalog.btrim(p_model)
         )
   where id = p_job_id and status = 'running';
  return true;
end;
$$;

create function public.fail_product_research(p_run_id uuid, p_job_id uuid, p_error text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_business_id uuid;
  v_completed_at timestamptz := pg_catalog.now();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select organization_id, business_id into v_organization_id, v_business_id
    from public.product_research_runs
   where id = p_run_id and status = 'running'
   for update;
  if v_business_id is null or not exists (
    select 1 from public.organization_members
     where organization_id = v_organization_id and user_id = v_user_id
  ) then
    raise exception 'Running research not found' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.ai_jobs
     where id = p_job_id and organization_id = v_organization_id
       and business_id = v_business_id and job_type = 'product_research' and status = 'running'
  ) then
    raise exception 'Running AI job not found' using errcode = '42501';
  end if;

  update public.product_research_runs
     set status = 'failed', error = pg_catalog.left(coalesce(p_error, 'Unknown research failure'), 2000), completed_at = v_completed_at
   where id = p_run_id and status = 'running';
  update public.ai_jobs
     set status = 'failed', error = pg_catalog.left(coalesce(p_error, 'Unknown research failure'), 2000), completed_at = v_completed_at
   where id = p_job_id and status = 'running';
  update public.businesses
     set status = 'draft'
   where id = v_business_id and organization_id = v_organization_id and status = 'researching';
  return true;
end;
$$;

create function public.reject_product_opportunity(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_organization_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select opportunity.business_id, opportunity.organization_id
    into v_business_id, v_organization_id
    from public.product_opportunities opportunity
    join public.product_research_runs run
      on run.id = opportunity.research_run_id
     and run.business_id = opportunity.business_id
     and run.organization_id = opportunity.organization_id
   where opportunity.id = p_product_id
     and opportunity.status in ('discovered', 'shortlisted')
     and run.status = 'completed';
  if v_business_id is null or not exists (
    select 1 from public.organization_members
     where organization_id = v_organization_id and user_id = v_user_id
  ) then
    raise exception 'Selectable product opportunity not found' using errcode = '42501';
  end if;
  update public.product_opportunities
     set status = 'rejected'
   where id = p_product_id and status in ('discovered', 'shortlisted');
  return v_business_id;
end;
$$;

create or replace function public.select_product_opportunity(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_organization_id uuid;
  v_status public.product_opportunity_status;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select opportunity.business_id, opportunity.organization_id, opportunity.status
    into v_business_id, v_organization_id, v_status
    from public.product_opportunities opportunity
    join public.product_research_runs run
      on run.id = opportunity.research_run_id
     and run.business_id = opportunity.business_id
     and run.organization_id = opportunity.organization_id
   where opportunity.id = p_product_id
     and run.status = 'completed';

  if v_business_id is null or not exists (
    select 1 from public.organization_members
     where organization_id = v_organization_id and user_id = v_user_id
  ) then
    raise exception 'Product opportunity not found' using errcode = '42501';
  end if;
  if v_status not in ('discovered', 'shortlisted', 'selected') then
    raise exception 'Product opportunity cannot be selected' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_business_id::text)::bigint);
  update public.product_opportunities
     set status = 'shortlisted'
   where business_id = v_business_id and status = 'selected' and id <> p_product_id;
  update public.product_opportunities set status = 'selected' where id = p_product_id;
  update public.businesses set status = 'building' where id = v_business_id and organization_id = v_organization_id;

  return v_business_id;
end;
$$;

revoke all on function public.start_product_research(uuid, text, text, text, numeric, numeric, numeric, integer) from public, anon;
revoke all on function public.complete_product_research(uuid, uuid, jsonb, text, integer, integer, integer) from public, anon;
revoke all on function public.fail_product_research(uuid, uuid, text) from public, anon;
revoke all on function public.reject_product_opportunity(uuid) from public, anon;
revoke all on function public.select_product_opportunity(uuid) from public, anon;
grant execute on function public.start_product_research(uuid, text, text, text, numeric, numeric, numeric, integer) to authenticated;
grant execute on function public.complete_product_research(uuid, uuid, jsonb, text, integer, integer, integer) to authenticated;
grant execute on function public.fail_product_research(uuid, uuid, text) to authenticated;
grant execute on function public.reject_product_opportunity(uuid) to authenticated;
grant execute on function public.select_product_opportunity(uuid) to authenticated;

commit;
