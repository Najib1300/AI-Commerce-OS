begin;

create type public.brand_generation_status as enum ('queued','running','completed','failed');
create type public.brand_direction_status as enum ('generated','selected','rejected','approved');

alter table public.product_opportunities
  add constraint product_opportunities_identity_unique unique (id,business_id,organization_id);

create table public.brand_generation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null,
  selected_product_id uuid not null,
  status public.brand_generation_status not null default 'queued',
  requested_direction_count integer not null check (requested_direction_count between 1 and 5),
  provider text not null check (provider in ('openai','mock')),
  model text not null check (char_length(model) between 1 and 100),
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences)='object'),
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint brand_runs_business_fk foreign key (business_id,organization_id)
    references public.businesses(id,organization_id) on delete cascade,
  constraint brand_runs_product_fk foreign key (selected_product_id,business_id,organization_id)
    references public.product_opportunities(id,business_id,organization_id) on delete restrict,
  constraint brand_runs_identity_unique unique (id,selected_product_id,business_id,organization_id)
);

create table public.brand_directions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null,
  brand_generation_run_id uuid not null,
  selected_product_id uuid not null,
  name text not null check (char_length(name) between 2 and 120),
  tagline text not null check (char_length(tagline) between 2 and 240),
  positioning_statement text not null,
  target_customer text not null,
  customer_pain_points jsonb not null check (jsonb_typeof(customer_pain_points)='array' and jsonb_array_length(customer_pain_points)>0),
  value_proposition text not null,
  brand_personality jsonb not null check (jsonb_typeof(brand_personality)='array' and jsonb_array_length(brand_personality)>0),
  brand_voice jsonb not null check (jsonb_typeof(brand_voice)='object' and brand_voice ?& array['tone','style','preferred_language_patterns','avoid_language_patterns']),
  primary_color text not null check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  typography_direction text not null,
  logo_concept text not null,
  visual_style text not null,
  domain_suggestions jsonb not null check (jsonb_typeof(domain_suggestions)='array' and jsonb_array_length(domain_suggestions)>0),
  social_handle_suggestions jsonb not null check (jsonb_typeof(social_handle_suggestions)='array' and jsonb_array_length(social_handle_suggestions)>0),
  about_summary text not null,
  store_design_direction text not null,
  status public.brand_direction_status not null default 'generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_directions_run_fk foreign key (brand_generation_run_id,selected_product_id,business_id,organization_id)
    references public.brand_generation_runs(id,selected_product_id,business_id,organization_id) on delete cascade
);

create index brand_runs_org_business_idx on public.brand_generation_runs(organization_id,business_id,created_at desc);
create unique index brand_runs_one_active_per_business on public.brand_generation_runs(business_id) where status in ('queued','running');
create index brand_directions_org_business_idx on public.brand_directions(organization_id,business_id,created_at desc);
create index brand_directions_run_idx on public.brand_directions(brand_generation_run_id);
create unique index brand_directions_one_selected_per_business on public.brand_directions(business_id) where status='selected';
create unique index brand_directions_one_approved_per_business on public.brand_directions(business_id) where status='approved';

alter table public.brand_generation_runs enable row level security;
alter table public.brand_directions enable row level security;
create policy brand_runs_member_select on public.brand_generation_runs for select using (public.is_org_member(organization_id));
create policy brand_directions_member_select on public.brand_directions for select using (public.is_org_member(organization_id));
create trigger brand_directions_updated before update on public.brand_directions for each row execute function public.set_updated_at();

create function public.start_brand_generation(p_business_id uuid,p_requested_direction_count integer,p_provider text,p_model text,p_preferences jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user_id uuid:=auth.uid();v_org uuid;v_product uuid;v_run uuid:=pg_catalog.gen_random_uuid();v_job uuid:=pg_catalog.gen_random_uuid();v_now timestamptz:=pg_catalog.now();
begin
 if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_requested_direction_count is null or p_requested_direction_count not between 1 and 5 or p_provider not in ('openai','mock') or p_model is null or pg_catalog.char_length(pg_catalog.btrim(p_model)) not between 1 and 100 or p_preferences is null or pg_catalog.jsonb_typeof(p_preferences)<>'object' then raise exception 'Invalid brand generation input' using errcode='22023'; end if;
 select b.organization_id into v_org from public.businesses b where b.id=p_business_id;
 if v_org is null or not exists(select 1 from public.organization_members m where m.organization_id=v_org and m.user_id=v_user_id) then raise exception 'Business not found' using errcode='42501'; end if;
 select p.id into v_product from public.product_opportunities p join public.product_research_runs r on r.id=p.research_run_id and r.business_id=p.business_id and r.organization_id=p.organization_id where p.business_id=p_business_id and p.organization_id=v_org and p.status='selected' and r.status='completed';
 if v_product is null then raise exception 'Select a product before creating your brand' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_business_id::text)::bigint);
 if exists(select 1 from public.brand_generation_runs where business_id=p_business_id and status in ('queued','running')) then raise exception 'Brand generation is already running for this business' using errcode='23505'; end if;
 insert into public.brand_generation_runs(id,organization_id,business_id,selected_product_id,status,requested_direction_count,provider,model,preferences) values(v_run,v_org,p_business_id,v_product,'queued',p_requested_direction_count,p_provider,pg_catalog.btrim(p_model),p_preferences);
 insert into public.ai_jobs(id,organization_id,business_id,job_type,status,input,attempts) values(v_job,v_org,p_business_id,'brand_generation','queued',pg_catalog.jsonb_build_object('brandGenerationRunId',v_run,'businessId',p_business_id,'selectedProductId',v_product,'provider',p_provider,'model',pg_catalog.btrim(p_model)),0);
 update public.brand_generation_runs set status='running',started_at=v_now where id=v_run and status='queued';
 update public.ai_jobs set status='running',started_at=v_now,attempts=1 where id=v_job and status='queued';
 return pg_catalog.jsonb_build_object('run_id',v_run,'job_id',v_job,'selected_product_id',v_product);
end$$;

create function public.complete_brand_generation(p_run_id uuid,p_job_id uuid,p_directions jsonb,p_input_tokens integer,p_output_tokens integer,p_total_tokens integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_org uuid;v_business uuid;v_product uuid;v_count integer;v_requested integer;v_provider text;v_model text;v_now timestamptz:=pg_catalog.now();
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_directions is null or pg_catalog.jsonb_typeof(p_directions)<>'array' then raise exception 'Directions must be an array' using errcode='22023'; end if;
 v_count:=pg_catalog.jsonb_array_length(p_directions);
 select organization_id,business_id,selected_product_id,requested_direction_count,provider,model into v_org,v_business,v_product,v_requested,v_provider,v_model from public.brand_generation_runs where id=p_run_id and status='running' for update;
 if v_business is null or not exists(select 1 from public.organization_members where organization_id=v_org and user_id=v_user) then raise exception 'Running brand generation not found' using errcode='42501'; end if;
 if v_count<1 or v_count>v_requested or v_count>5 or p_input_tokens is null or p_input_tokens<0 or p_output_tokens is null or p_output_tokens<0 or p_total_tokens is null or p_total_tokens<0 then raise exception 'Invalid generation result' using errcode='22023'; end if;
 if not exists(select 1 from public.ai_jobs where id=p_job_id and organization_id=v_org and business_id=v_business and job_type='brand_generation' and status='running') then raise exception 'Running AI job not found' using errcode='42501'; end if;
 insert into public.brand_directions(organization_id,business_id,brand_generation_run_id,selected_product_id,name,tagline,positioning_statement,target_customer,customer_pain_points,value_proposition,brand_personality,brand_voice,primary_color,secondary_color,accent_color,typography_direction,logo_concept,visual_style,domain_suggestions,social_handle_suggestions,about_summary,store_design_direction)
 select v_org,v_business,p_run_id,v_product,d.name,d.tagline,d.positioning_statement,d.target_customer,d.customer_pain_points,d.value_proposition,d.brand_personality,d.brand_voice,d.primary_color,d.secondary_color,d.accent_color,d.typography_direction,d.logo_concept,d.visual_style,d.domain_suggestions,d.social_handle_suggestions,d.about_summary,d.store_design_direction
 from pg_catalog.jsonb_to_recordset(p_directions) d(name text,tagline text,positioning_statement text,target_customer text,customer_pain_points jsonb,value_proposition text,brand_personality jsonb,brand_voice jsonb,primary_color text,secondary_color text,accent_color text,typography_direction text,logo_concept text,visual_style text,domain_suggestions jsonb,social_handle_suggestions jsonb,about_summary text,store_design_direction text);
 insert into public.usage_records(organization_id,user_id,usage_type,quantity,metadata) values(v_org,v_user,'brand_generation',p_total_tokens,pg_catalog.jsonb_build_object('provider',v_provider,'model',v_model,'input_tokens',p_input_tokens,'output_tokens',p_output_tokens,'total_tokens',p_total_tokens,'brand_generation_run_id',p_run_id));
 update public.brand_generation_runs set status='completed',completed_at=v_now,error=null where id=p_run_id and status='running';
 update public.ai_jobs set status='completed',completed_at=v_now,error=null,output=pg_catalog.jsonb_build_object('brandGenerationRunId',p_run_id,'directionCount',v_count,'provider',v_provider,'model',v_model) where id=p_job_id and status='running';
 return true;
end$$;

create function public.fail_brand_generation(p_run_id uuid,p_job_id uuid,p_error text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_org uuid;v_business uuid;v_now timestamptz:=pg_catalog.now();
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select organization_id,business_id into v_org,v_business from public.brand_generation_runs where id=p_run_id and status='running' for update;
 if v_business is null or not exists(select 1 from public.organization_members where organization_id=v_org and user_id=v_user) then raise exception 'Running brand generation not found' using errcode='42501'; end if;
 if not exists(select 1 from public.ai_jobs where id=p_job_id and organization_id=v_org and business_id=v_business and job_type='brand_generation' and status='running') then raise exception 'Running AI job not found' using errcode='42501'; end if;
 update public.brand_generation_runs set status='failed',error=pg_catalog.left(pg_catalog.coalesce(p_error,'Unknown brand generation failure'),2000),completed_at=v_now where id=p_run_id;
 update public.ai_jobs set status='failed',error=pg_catalog.left(pg_catalog.coalesce(p_error,'Unknown brand generation failure'),2000),completed_at=v_now where id=p_job_id;
 return true;
end$$;

create function public.reject_brand_direction(p_direction_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_org uuid;v_business uuid;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select d.organization_id,d.business_id into v_org,v_business from public.brand_directions d join public.brand_generation_runs r on r.id=d.brand_generation_run_id and r.status='completed' where d.id=p_direction_id and d.status='generated';
 if v_business is null or not exists(select 1 from public.organization_members where organization_id=v_org and user_id=v_user) then raise exception 'Rejectable brand direction not found' using errcode='42501'; end if;
 update public.brand_directions set status='rejected' where id=p_direction_id and status='generated';
 insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id) values(v_org,v_user,'brand_direction_rejected','brand_direction',p_direction_id);
 return v_business;
end$$;

create function public.select_brand_direction(p_direction_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_org uuid;v_business uuid;v_status public.brand_direction_status;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select d.organization_id,d.business_id,d.status into v_org,v_business,v_status from public.brand_directions d join public.brand_generation_runs r on r.id=d.brand_generation_run_id and r.status='completed' where d.id=p_direction_id;
 if v_business is null or not exists(select 1 from public.organization_members where organization_id=v_org and user_id=v_user) then raise exception 'Brand direction not found' using errcode='42501'; end if;
 if v_status not in ('generated','selected') then raise exception 'Brand direction cannot be selected' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_business::text)::bigint);
 update public.brand_directions set status='generated' where business_id=v_business and status='selected' and id<>p_direction_id;
 update public.brand_directions set status='selected' where id=p_direction_id;
 insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id) values(v_org,v_user,'brand_direction_selected','brand_direction',p_direction_id);
 return v_business;
end$$;

create function public.update_selected_brand(p_direction_id uuid,p_updates jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_org uuid;v_business uuid;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_updates is null or pg_catalog.jsonb_typeof(p_updates)<>'object' then raise exception 'Invalid brand updates' using errcode='22023'; end if;
 select organization_id,business_id into v_org,v_business from public.brand_directions where id=p_direction_id and status='selected' for update;
 if v_business is null or not exists(select 1 from public.organization_members where organization_id=v_org and user_id=v_user) then raise exception 'Selected brand direction not found' using errcode='42501'; end if;
 if exists(select 1 from public.brand_directions d where d.id=p_direction_id and (pg_catalog.char_length(pg_catalog.btrim(d.name))<2 or pg_catalog.char_length(pg_catalog.btrim(d.tagline))<2 or pg_catalog.char_length(pg_catalog.btrim(d.positioning_statement))<2 or pg_catalog.char_length(pg_catalog.btrim(d.target_customer))<2 or pg_catalog.char_length(pg_catalog.btrim(d.value_proposition))<2 or pg_catalog.char_length(pg_catalog.btrim(d.typography_direction))<2 or pg_catalog.char_length(pg_catalog.btrim(d.logo_concept))<2 or pg_catalog.char_length(pg_catalog.btrim(d.visual_style))<2 or pg_catalog.char_length(pg_catalog.btrim(d.about_summary))<2 or pg_catalog.char_length(pg_catalog.btrim(d.store_design_direction))<2)) then raise exception 'Brand direction is incomplete' using errcode='22023'; end if;
 update public.brand_directions set
  name=pg_catalog.coalesce(p_updates->>'name',name),tagline=pg_catalog.coalesce(p_updates->>'tagline',tagline),positioning_statement=pg_catalog.coalesce(p_updates->>'positioning_statement',positioning_statement),target_customer=pg_catalog.coalesce(p_updates->>'target_customer',target_customer),customer_pain_points=pg_catalog.coalesce(p_updates->'customer_pain_points',customer_pain_points),value_proposition=pg_catalog.coalesce(p_updates->>'value_proposition',value_proposition),brand_personality=pg_catalog.coalesce(p_updates->'brand_personality',brand_personality),brand_voice=pg_catalog.coalesce(p_updates->'brand_voice',brand_voice),primary_color=pg_catalog.coalesce(p_updates->>'primary_color',primary_color),secondary_color=pg_catalog.coalesce(p_updates->>'secondary_color',secondary_color),accent_color=pg_catalog.coalesce(p_updates->>'accent_color',accent_color),typography_direction=pg_catalog.coalesce(p_updates->>'typography_direction',typography_direction),logo_concept=pg_catalog.coalesce(p_updates->>'logo_concept',logo_concept),visual_style=pg_catalog.coalesce(p_updates->>'visual_style',visual_style),domain_suggestions=pg_catalog.coalesce(p_updates->'domain_suggestions',domain_suggestions),social_handle_suggestions=pg_catalog.coalesce(p_updates->'social_handle_suggestions',social_handle_suggestions),about_summary=pg_catalog.coalesce(p_updates->>'about_summary',about_summary),store_design_direction=pg_catalog.coalesce(p_updates->>'store_design_direction',store_design_direction)
 where id=p_direction_id;
 if exists(select 1 from public.brand_directions d where d.id=p_direction_id and (pg_catalog.char_length(pg_catalog.btrim(d.name))<2 or pg_catalog.char_length(pg_catalog.btrim(d.tagline))<2 or pg_catalog.char_length(pg_catalog.btrim(d.positioning_statement))<2 or pg_catalog.char_length(pg_catalog.btrim(d.target_customer))<2 or pg_catalog.char_length(pg_catalog.btrim(d.value_proposition))<2 or pg_catalog.char_length(pg_catalog.btrim(d.typography_direction))<2 or pg_catalog.char_length(pg_catalog.btrim(d.logo_concept))<2 or pg_catalog.char_length(pg_catalog.btrim(d.visual_style))<2 or pg_catalog.char_length(pg_catalog.btrim(d.about_summary))<2 or pg_catalog.char_length(pg_catalog.btrim(d.store_design_direction))<2)) then raise exception 'Brand direction is incomplete' using errcode='22023'; end if;
 insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id) values(v_org,v_user,'brand_direction_updated','brand_direction',p_direction_id);
 return v_business;
end$$;

create function public.approve_brand_direction(p_direction_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_org uuid;v_business uuid;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select d.organization_id,d.business_id into v_org,v_business from public.brand_directions d join public.brand_generation_runs r on r.id=d.brand_generation_run_id and r.status='completed' where d.id=p_direction_id and d.status='selected' for update;
 if v_business is null or not exists(select 1 from public.organization_members where organization_id=v_org and user_id=v_user) then raise exception 'Selected brand direction not found' using errcode='42501'; end if;
 if exists(select 1 from public.brand_directions d where d.id=p_direction_id and (pg_catalog.char_length(pg_catalog.btrim(d.name))<2 or pg_catalog.char_length(pg_catalog.btrim(d.tagline))<2 or pg_catalog.char_length(pg_catalog.btrim(d.positioning_statement))<2 or pg_catalog.char_length(pg_catalog.btrim(d.target_customer))<2 or pg_catalog.char_length(pg_catalog.btrim(d.value_proposition))<2 or pg_catalog.char_length(pg_catalog.btrim(d.typography_direction))<2 or pg_catalog.char_length(pg_catalog.btrim(d.logo_concept))<2 or pg_catalog.char_length(pg_catalog.btrim(d.visual_style))<2 or pg_catalog.char_length(pg_catalog.btrim(d.about_summary))<2 or pg_catalog.char_length(pg_catalog.btrim(d.store_design_direction))<2)) then raise exception 'Brand direction is incomplete' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_business::text)::bigint);
 if exists(select 1 from public.brand_directions where business_id=v_business and status='approved' and id<>p_direction_id) then raise exception 'An approved brand already exists' using errcode='23505'; end if;
 update public.brand_directions set status='approved' where id=p_direction_id and status='selected';
 insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id) values(v_org,v_user,'brand_approved','brand_direction',p_direction_id);
 return v_business;
end$$;

revoke all on table public.brand_generation_runs,public.brand_directions from anon,authenticated;
grant select on table public.brand_generation_runs,public.brand_directions to authenticated;
revoke all on function public.start_brand_generation(uuid,integer,text,text,jsonb),public.complete_brand_generation(uuid,uuid,jsonb,integer,integer,integer),public.fail_brand_generation(uuid,uuid,text),public.reject_brand_direction(uuid),public.select_brand_direction(uuid),public.update_selected_brand(uuid,jsonb),public.approve_brand_direction(uuid) from public,anon;
grant execute on function public.start_brand_generation(uuid,integer,text,text,jsonb),public.complete_brand_generation(uuid,uuid,jsonb,integer,integer,integer),public.fail_brand_generation(uuid,uuid,text),public.reject_brand_direction(uuid),public.select_brand_direction(uuid),public.update_selected_brand(uuid,jsonb),public.approve_brand_direction(uuid) to authenticated;

commit;
