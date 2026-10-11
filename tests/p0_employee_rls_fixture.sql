-- Disposable PostgreSQL only. Execute after p0_local_cases.sql.
create table public.ops_members(user_id uuid primary key, role text not null,is_active boolean not null);
insert into public.ops_members values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','manager',true),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','employee',true),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','employee',false);
alter table public.ops_members enable row level security;
create policy member_self on public.ops_members for select to authenticated
 using (user_id=(select auth.uid()));
grant select on public.ops_members to authenticated;
alter table public.ai_p0_memories enable row level security;
create policy ai_p0_memories_manager_read on public.ai_p0_memories for select to authenticated
 using ((select private.is_ops_manager()));
grant select on public.ai_p0_memories to authenticated;
update public.ai_p0_memories set reviewed_at=now()-interval '1 day',effective_at=now()-interval '1 day'
 where id='11111111-1111-4111-8111-111111111111';
insert into public.ai_p0_memories(id,scope,memory_key,version,title,status,reviewed_at,effective_at,expires_at)
values
 ('55555555-5555-4555-8555-555555555555','TEAM','TEAM-1',1,'Team restricted','APPROVED',now(),now()-interval '1 day',null),
 ('66666666-6666-4666-8666-666666666666','COMPANY','FUTURE',1,'Future','APPROVED',now(),now()+interval '2 days',null),
 ('77777777-7777-4777-8777-777777777777','COMPANY','EXPIRED',1,'Expired','APPROVED',now(),now()-interval '10 days',now()-interval '1 day'),
 ('88888888-8888-4888-8888-888888888888','STORE','STORE-1',1,'Store restricted','APPROVED',now(),now()-interval '1 day',null),
 ('99999999-9999-4999-8999-999999999999','COMPANY','UNREVIEWED',1,'Unreviewed','APPROVED',null,now()-interval '1 day',null);
