-- Isolated PostgreSQL RLS assertions; must fail CI if a role sees extra rows.
set role authenticated;
set test.user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $check$ declare ids uuid[]; begin
 select array_agg(id order by id) into ids from public.ai_p0_memories;
 if ids is distinct from array['11111111-1111-4111-8111-111111111111'::uuid] then
 raise exception 'active employee scope leak: %',ids; end if;
end $check$;
set test.user_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
do $check$ begin
 if exists(select 1 from public.ai_p0_memories) then
 raise exception 'disabled employee must not see knowledge'; end if;
end $check$;
reset test.user_id;
do $check$ begin
 if exists(select 1 from public.ai_p0_memories) then
 raise exception 'unauthenticated identity must not see knowledge'; end if;
end $check$;
set test.user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $check$ begin
 if (select count(*) from public.ai_p0_memories) <> 9 then
 raise exception 'manager should see nine knowledge fixture rows'; end if;
end $check$;
reset role;
