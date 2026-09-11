-- PostgreSQL treats COALESCE as special syntax, not a schema-qualified function.
-- Replace the affected Phase 1C RPCs while preserving their signatures and grants.

drop function if exists public.fail_brand_generation(uuid,uuid,text);
drop function if exists public.update_selected_brand(uuid,jsonb);

create function public.fail_brand_generation(p_run_id uuid,p_job_id uuid,p_error text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_org uuid;v_business uuid;v_now timestamptz:=pg_catalog.now();
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select organization_id,business_id into v_org,v_business from public.brand_generation_runs where id=p_run_id and status='running' for update;
 if v_business is null or not exists(select 1 from public.organization_members where organization_id=v_org and user_id=v_user) then raise exception 'Running brand generation not found' using errcode='42501'; end if;
 if not exists(select 1 from public.ai_jobs where id=p_job_id and organization_id=v_org and business_id=v_business and job_type='brand_generation' and status='running' and input->>'brandGenerationRunId'=p_run_id::text) then raise exception 'Running AI job not found' using errcode='22023'; end if;
 update public.brand_generation_runs set status='failed',error=pg_catalog.left(coalesce(p_error,'Unknown brand generation failure'),2000),completed_at=v_now where id=p_run_id;
 update public.ai_jobs set status='failed',error=pg_catalog.left(coalesce(p_error,'Unknown brand generation failure'),2000),completed_at=v_now where id=p_job_id;
 return v_business;
end$$;

create function public.update_selected_brand(p_direction_id uuid,p_updates jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_org uuid;v_business uuid;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_updates is null or pg_catalog.jsonb_typeof(p_updates)<>'object' then raise exception 'Invalid brand updates' using errcode='22023'; end if;
 select organization_id,business_id into v_org,v_business from public.brand_directions where id=p_direction_id and status='selected' for update;
 if v_business is null or not exists(select 1 from public.organization_members where organization_id=v_org and user_id=v_user) then raise exception 'Selected brand direction not found' using errcode='42501'; end if;
 update public.brand_directions set
  name=coalesce(p_updates->>'name',name),tagline=coalesce(p_updates->>'tagline',tagline),positioning_statement=coalesce(p_updates->>'positioning_statement',positioning_statement),target_customer=coalesce(p_updates->>'target_customer',target_customer),customer_pain_points=coalesce(p_updates->'customer_pain_points',customer_pain_points),value_proposition=coalesce(p_updates->>'value_proposition',value_proposition),brand_personality=coalesce(p_updates->'brand_personality',brand_personality),brand_voice=coalesce(p_updates->'brand_voice',brand_voice),primary_color=coalesce(p_updates->>'primary_color',primary_color),secondary_color=coalesce(p_updates->>'secondary_color',secondary_color),accent_color=coalesce(p_updates->>'accent_color',accent_color),typography_direction=coalesce(p_updates->>'typography_direction',typography_direction),logo_concept=coalesce(p_updates->>'logo_concept',logo_concept),visual_style=coalesce(p_updates->>'visual_style',visual_style),domain_suggestions=coalesce(p_updates->'domain_suggestions',domain_suggestions),social_handle_suggestions=coalesce(p_updates->'social_handle_suggestions',social_handle_suggestions),about_summary=coalesce(p_updates->>'about_summary',about_summary),store_design_direction=coalesce(p_updates->>'store_design_direction',store_design_direction)
 where id=p_direction_id;
 if exists(select 1 from public.brand_directions d where d.id=p_direction_id and (pg_catalog.char_length(pg_catalog.btrim(d.name))<2 or pg_catalog.char_length(pg_catalog.btrim(d.tagline))<2 or pg_catalog.char_length(pg_catalog.btrim(d.positioning_statement))<2 or pg_catalog.char_length(pg_catalog.btrim(d.target_customer))<2 or pg_catalog.char_length(pg_catalog.btrim(d.value_proposition))<2 or pg_catalog.char_length(pg_catalog.btrim(d.typography_direction))<2 or pg_catalog.char_length(pg_catalog.btrim(d.logo_concept))<2 or pg_catalog.char_length(pg_catalog.btrim(d.visual_style))<2 or pg_catalog.char_length(pg_catalog.btrim(d.about_summary))<2 or pg_catalog.char_length(pg_catalog.btrim(d.store_design_direction))<2)) then raise exception 'Brand direction is incomplete' using errcode='22023'; end if;
 insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id) values(v_org,v_user,'brand_direction_updated','brand_direction',p_direction_id);
 return v_business;
end$$;

revoke all on function public.fail_brand_generation(uuid,uuid,text),public.update_selected_brand(uuid,jsonb) from public,anon;
grant execute on function public.fail_brand_generation(uuid,uuid,text),public.update_selected_brand(uuid,jsonb) to authenticated;
