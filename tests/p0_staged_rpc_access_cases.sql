-- Disposable PG17 only. Assert additive staged RPC remains inaccessible to API users.
DO $guard$ BEGIN
 IF to_regprocedure('public.kb_review_memory_with_reason(uuid,boolean,text)') IS NULL THEN RAISE EXCEPTION 'new RPC missing'; END IF;
 IF has_function_privilege('authenticated','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE') THEN RAISE EXCEPTION 'authenticated may invoke staged RPC'; END IF;
 IF has_function_privilege('anon','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE') THEN RAISE EXCEPTION 'anon may invoke staged RPC'; END IF;
 IF has_function_privilege('service_role','public.kb_review_memory_with_reason(uuid,boolean,text)','EXECUTE') THEN RAISE EXCEPTION 'service_role may invoke staged RPC'; END IF;
END $guard$;
SET ROLE authenticated;
DO $guard$ BEGIN
 BEGIN
 PERFORM public.kb_review_memory_with_reason('22222222-2222-4222-8222-222222222222',true,'Staged function must stay inaccessible');
 RAISE EXCEPTION 'unexpected staged RPC execution';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $guard$;
RESET ROLE;
SELECT 'staged RPC inaccessible by authenticated and anon' AS result;
