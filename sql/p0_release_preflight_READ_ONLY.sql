-- P0 deployment preflight. SELECT only; safe against production.
SELECT
  to_regprocedure('public.kb_review_memory_with_reason(uuid,boolean,text)') IS NOT NULL AS new_review_rpc_installed,
  to_regprocedure('public.ai_p0_review_memory(uuid,boolean)') IS NOT NULL AS old_review_rpc_exists,
  CASE WHEN to_regprocedure('public.ai_p0_review_memory(uuid,boolean)') IS NOT NULL
    THEN has_function_privilege('authenticated','public.ai_p0_review_memory(uuid,boolean)','EXECUTE')
    ELSE false END AS legacy_callable_by_authenticated,
  CASE WHEN to_regprocedure('public.kb_review_memory_with_reason(uuid,boolean,text)') IS NOT NULL
    THEN has_function_privilege('authenticated','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE')
    ELSE false END AS new_callable_by_authenticated,
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.ai_p0_memories'::regclass) AS knowledge_rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public'
    AND tablename='ai_p0_memories' AND cmd='SELECT'
    AND qual LIKE '%is_ops_manager%') AS manager_read_policy_count;
-- Release requires new_review_rpc_installed=true,
-- legacy_callable_by_authenticated=false, new_callable_by_authenticated=true,
-- knowledge_rls_enabled=true, manager_read_policy_count>=1.
-- THIS IS NOT A SUBSTITUTE FOR RLS/TRANSACTION INTEGRATION TESTS.
