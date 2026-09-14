create function public.record_checkout_payment_started(p_checkout_id uuid,p_payment_token uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare c public.checkout_sessions%rowtype;
begin
 select * into c from public.checkout_sessions
 where id=p_checkout_id and payment_token=p_payment_token and provider='mock' and status in('awaiting_payment','paid');
 if c.id is null then raise exception 'Checkout not found' using errcode='42501'; end if;
 if not exists(select 1 from public.audit_logs where organization_id=c.organization_id and action='payment_started' and entity_type='checkout_session' and entity_id=c.id)then
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(c.organization_id,null,'payment_started','checkout_session',c.id,pg_catalog.jsonb_build_object('provider',c.provider));
 end if;
end$$;
revoke all on function public.record_checkout_payment_started(uuid,uuid)from public,anon,authenticated;
grant execute on function public.record_checkout_payment_started(uuid,uuid)to anon,authenticated;

insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
select c.organization_id,null,'payment_started','checkout_session',c.id,pg_catalog.jsonb_build_object('provider',c.provider)
from public.checkout_sessions c
where not exists(select 1 from public.audit_logs a where a.organization_id=c.organization_id and a.action='payment_started' and a.entity_type='checkout_session' and a.entity_id=c.id);
