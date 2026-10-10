-- Run ONLY on disposable local PostgreSQL after fixture and review migration.
set test.user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $approve$ begin
 if public.kb_review_memory_with_reason('22222222-2222-4222-8222-222222222222',true,'Confirmed local test approval reason') <> 'APPROVED' then raise exception 'unexpected approval result'; end if;
end $approve$;
do $t$ begin
 if (select status from public.ai_p0_memories where id='11111111-1111-4111-8111-111111111111') <> 'SUPERSEDED'
 or (select status from public.ai_p0_memories where id='22222222-2222-4222-8222-222222222222') <> 'APPROVED'
 or not exists (select 1 from public.ai_p0_audit_log where memory_id='22222222-2222-4222-8222-222222222222' and details->>'review_reason'='Confirmed local test approval reason')
 then raise exception 'approval versioning and audit failed'; end if;
end $t$;
do $t$ begin
 perform public.kb_review_memory_with_reason('22222222-2222-4222-8222-222222222222',true,'Retry this approval');
 raise exception 'duplicate approval incorrectly permitted';
exception when sqlstate 'P0001' then
 if sqlerrm='duplicate approval incorrectly permitted' then raise; end if;
end $t$;
do $t$ begin
 perform public.kb_review_memory_with_reason('33333333-3333-4333-8333-333333333333',false,'short');
 raise exception 'short reason accepted';
exception when sqlstate '22023' then null;
end $t$;
set test.user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $t$ begin
 perform public.kb_review_memory_with_reason('33333333-3333-4333-8333-333333333333',false,'Non-manager should be denied');
 raise exception 'non-manager accepted';
exception when sqlstate '42501' then null;
end $t$;
set test.user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $reject$ begin
 if public.kb_review_memory_with_reason('33333333-3333-4333-8333-333333333333',false,'Rejected in isolated integration test') <> 'REJECTED' then raise exception 'unexpected rejection result'; end if;
end $reject$;
do $verify$ begin
 if (select status from public.ai_p0_memories where id='33333333-3333-4333-8333-333333333333') <> 'REJECTED'
 or not exists(select 1 from public.ai_p0_audit_log where memory_id='33333333-3333-4333-8333-333333333333' and event_type='MEMORY_REJECTED' and details->>'review_reason'='Rejected in isolated integration test')
 then raise exception 'reject workflow or audit failed'; end if;
 if (select count(*) from public.ai_p0_audit_log where memory_id='33333333-3333-4333-8333-333333333333') <> 1
 then raise exception 'audit row count mismatch'; end if;
end $verify$;
reset test.user_id;
select status from public.ai_p0_memories where id='33333333-3333-4333-8333-333333333333';
