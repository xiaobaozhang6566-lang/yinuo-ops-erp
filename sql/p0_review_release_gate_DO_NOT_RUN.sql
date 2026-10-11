-- P0 RELEASE GATE. Do not execute before isolated review-RPC tests pass.
-- Apply after kb_review_memory_with_reason is installed and verified.
-- No production knowledge records are changed by this script.
begin;
do $guard$
begin
  if to_regprocedure('public.kb_review_memory_with_reason(uuid,boolean,text)') is null then
    raise exception 'new reason-required review function is missing';
  end if;
  if to_regprocedure('public.ai_p0_review_memory(uuid,boolean)') is null then
    raise exception 'legacy review function is missing';
  end if;
end $guard$;
-- Remove the bypass via roles used by the REST API.
revoke execute on function public.ai_p0_review_memory(uuid,boolean) from public, anon, authenticated, service_role;
-- Explicitly grant new function only to authenticated (its body still checks manager role).
revoke all on function public.kb_review_memory_with_reason(uuid,boolean,text) from public, anon, service_role;
grant execute on function public.kb_review_memory_with_reason(uuid,boolean,text) to authenticated;
-- Validate all standard Supabase REST roles IN THE SAME TRANSACTION.
do $acl_check$
begin
  if has_function_privilege('anon','public.ai_p0_review_memory(uuid,boolean)','EXECUTE')
    or has_function_privilege('authenticated','public.ai_p0_review_memory(uuid,boolean)','EXECUTE')
    or has_function_privilege('service_role','public.ai_p0_review_memory(uuid,boolean)','EXECUTE')
    or has_function_privilege('anon','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE')
    or not has_function_privilege('authenticated','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE')
    or has_function_privilege('service_role','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE')
  then raise exception 'P0 ACL cutover mismatch; rolled back by transaction' using errcode='42501';
  end if;
end $acl_check$;
commit;
-- Verify separately:
-- SELECT has_function_privilege('authenticated','public.ai_p0_review_memory(uuid,boolean)','EXECUTE') = false;
-- SELECT has_function_privilege('authenticated','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE') = true;
-- NOTE: function owner, superusers and nonstandard roles require separate inventory.
-- Never run before signed backup recovery evidence, live JWT verification and cutover authorization.
