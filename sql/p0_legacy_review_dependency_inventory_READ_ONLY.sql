-- AI Second Brain V1 / P0. READ ONLY. NO DDL, NO AUTH SESSION TOKENS.
-- Database function dependencies do not reveal external REST callers.
select
  to_regprocedure('public.ai_p0_review_memory(uuid,boolean)') is not null as legacy_review_exists,
  to_regprocedure('public.kb_review_memory_with_reason(uuid,boolean,text)') is not null as new_review_exists,
  has_function_privilege('authenticated','public.ai_p0_review_memory(uuid,boolean)','EXECUTE') as legacy_authenticated_executable,
  has_function_privilege('service_role','public.ai_p0_review_memory(uuid,boolean)','EXECUTE') as legacy_service_role_executable;
-- Explicit PL/pgSQL source references to the legacy function in trusted schemas.
select n.nspname as schema_name,p.proname as dependent_function,
       pg_get_function_identity_arguments(p.oid) as identity_args
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') and p.prokind='f'
  and p.proname<>'ai_p0_review_memory'
  and pg_get_functiondef(p.oid) ilike '%ai_p0_review_memory%'
order by 1,2;
-- Catalog dependencies may omit dynamic REST and PL/pgSQL text-based references.
select n.nspname as schema_name,c.relname as relation_name,c.relkind,d.deptype
from pg_depend d join pg_class c on c.oid=d.objid
join pg_namespace n on n.oid=c.relnamespace
where d.refobjid='public.ai_p0_review_memory(uuid,boolean)'::regprocedure
order by 1,2;
-- Business records untouched. Counts do not establish whether any client called the function.
select status,count(*) as item_count from public.ai_p0_memories
where status in ('DRAFT','APPROVED') group by status order by status;
