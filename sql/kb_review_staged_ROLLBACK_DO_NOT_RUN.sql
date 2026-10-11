-- YINUO AI Second Brain | STAGED RPC ROLLBACK CANDIDATE
-- Use only for a newly added, non-executable review RPC, before approval cutover.
-- NEVER automatically run in production. It does not modify knowledge records.
begin;
do $rollback$
begin
  if to_regprocedure('public.kb_review_memory_with_reason(uuid,boolean,text)') is null then
    raise exception 'staged RPC missing; inspect state before rollback';
  end if;
  if has_function_privilege('anon','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE')
     or has_function_privilege('authenticated','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE')
     or has_function_privilege('service_role','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE') then
    raise exception 'RPC is active; staged-only rollback forbidden';
  end if;
end
$rollback$;
drop function public.kb_review_memory_with_reason(uuid,boolean,text);
do $postcheck$
begin
  if to_regprocedure('public.kb_review_memory_with_reason(uuid,boolean,text)') is not null then
    raise exception 'staged RPC removal incomplete';
  end if;
end
$postcheck$;
commit;
-- Legacy RPC is untouched: this only removes the new signature.
