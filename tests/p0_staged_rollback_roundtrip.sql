-- Disposable PostgreSQL-only end-to-end staged add -> guarded rollback -> fresh add.
\i sql/kb_review_additive_STAGED_REVOKED.sql
\i tests/p0_staged_rpc_access_cases.sql
\i sql/kb_review_staged_ROLLBACK_DO_NOT_RUN.sql
DO $verify$ BEGIN
 IF to_regprocedure('public.kb_review_memory_with_reason(uuid,boolean,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'staged rollback did not remove RPC'; END IF;
END $verify$;
\i sql/kb_review_additive_STAGED_REVOKED.sql
\i tests/p0_staged_rpc_access_cases.sql
