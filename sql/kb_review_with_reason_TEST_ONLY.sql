-- YINUO AI OS V1 | TEST ENVIRONMENT ONLY
-- Do NOT run on production before authorization tests and client migration.
begin;
create or replace function public.kb_review_memory_with_reason(
  p_memory_id uuid, p_approve boolean, p_reason text
) returns text
language plpgsql security definer set search_path = ''
as $body$
declare
  v_scope text;
  v_key text;
  v_status text;
  v_result text;
begin
  if auth.uid() is null or not private.is_ops_manager() then
    raise exception 'manager access required' using errcode='42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 10
    or char_length(p_reason) > 2000 then
    raise exception 'reason must be 10-2000 characters' using errcode='22023';
  end if;
  select scope,memory_key,status into v_scope,v_key,v_status
  from public.ai_p0_memories where id=p_memory_id;
  if v_status is distinct from 'DRAFT' then
    raise exception 'memory draft not found';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_scope||':'||v_key,0));
  select status into v_status from public.ai_p0_memories
  where id=p_memory_id for update;
  if v_status <> 'DRAFT' then
    raise exception 'memory no longer draft';
  end if;
  if p_approve then
    update public.ai_p0_memories
    set status='SUPERSEDED',updated_at=now()
    where scope=v_scope and memory_key=v_key and status='APPROVED';
  end if;
  v_result=case when p_approve then 'APPROVED' else 'REJECTED' end;
  update public.ai_p0_memories
  set status=v_result,reviewed_by=auth.uid(),reviewed_at=now(),
    effective_at=case when p_approve then now() else null end,updated_at=now()
  where id=p_memory_id;
  insert into public.ai_p0_audit_log(
    memory_id,actor_user_id,actor_type,event_type,details
  ) values (
    p_memory_id,auth.uid(),'MANAGER',
    case when p_approve then 'MEMORY_APPROVED' else 'MEMORY_REJECTED' end,
    jsonb_build_object('review_reason',btrim(p_reason),'knowledge_version',
      (select version from public.ai_p0_memories where id=p_memory_id),
      'scope',v_scope,'memory_key',v_key)
  );
  return v_result;
end;
$body$;
revoke all on function public.kb_review_memory_with_reason(uuid,boolean,text) from public,anon;
grant execute on function public.kb_review_memory_with_reason(uuid,boolean,text) to authenticated;
commit;
-- RELEASE GATE: the old public.ai_p0_review_memory(uuid,boolean)
-- remains callable by authenticated and BYPASSES mandatory reason.
-- After confirming no legacy clients use it, revoke its authenticated EXECUTE
-- in a separate, explicitly approved production change.
