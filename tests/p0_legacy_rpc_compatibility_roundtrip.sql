-- Disposable PostgreSQL fixture only. Fingerprint legacy signature and API grants.
CREATE TEMP TABLE legacy_review_before AS
SELECT p.oid::text AS identity_oid,
       pg_get_functiondef(p.oid) AS definition,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_exec,
       has_function_privilege('service_role',p.oid,'EXECUTE') AS service_exec
FROM pg_proc p WHERE p.oid='public.ai_p0_review_memory(uuid,boolean)'::regprocedure;
\i tests/p0_staged_rollback_roundtrip.sql
DO $unchanged$
DECLARE before_row record; after_row record;
BEGIN
  SELECT * INTO before_row FROM legacy_review_before;
  SELECT p.oid::text AS identity_oid,pg_get_functiondef(p.oid) AS definition,
         has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_exec,
         has_function_privilege('service_role',p.oid,'EXECUTE') AS service_exec
    INTO after_row
    FROM pg_proc p WHERE p.oid='public.ai_p0_review_memory(uuid,boolean)'::regprocedure;
  IF before_row IS NULL OR after_row IS NULL OR
     row(before_row.identity_oid,before_row.definition,before_row.auth_exec,before_row.service_exec)
       IS DISTINCT FROM
     row(after_row.identity_oid,after_row.definition,after_row.auth_exec,after_row.service_exec)
  THEN RAISE EXCEPTION 'legacy RPC changed during staged migration roundtrip';
  END IF;
END $unchanged$;
SELECT 'legacy approval signature, body, oid and API grants unchanged' AS result;
