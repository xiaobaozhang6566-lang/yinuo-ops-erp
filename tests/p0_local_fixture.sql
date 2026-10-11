-- Local fixture ONLY. Fresh disposable PostgreSQL 17 database.
create schema if not exists auth;
create schema if not exists private;
do $r$ begin
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $r$;
create or replace function auth.uid() returns uuid language sql stable
as $f$ select nullif(current_setting('test.user_id',true),'')::uuid $f$;
create or replace function private.is_ops_manager() returns boolean language sql stable
as $f$ select auth.uid()='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid $f$;
create table public.ai_p0_memories (
 id uuid primary key, scope text not null, memory_key text not null,
 version integer not null, category text not null default 'SOP', title text not null,
 content jsonb not null default '{}'::jsonb, status text not null,
 effective_at timestamptz, expires_at timestamptz, reviewed_by uuid,
 reviewed_at timestamptz, updated_at timestamptz default now(),
 unique(scope,memory_key,version),
 check(status in ('DRAFT','APPROVED','REJECTED','SUPERSEDED'))
);
create table public.ai_p0_audit_log (
 id bigint generated always as identity primary key,
 memory_id uuid references public.ai_p0_memories(id),
 actor_user_id uuid, actor_type text not null,event_type text not null,
 details jsonb not null default '{}'::jsonb,created_at timestamptz default now()
);
grant usage on schema public,auth,private to authenticated;
grant select on public.ai_p0_memories,public.ai_p0_audit_log to authenticated;
grant execute on function auth.uid(),private.is_ops_manager() to authenticated;

-- Synthetic legacy approval RPC for non-destructive compatibility fingerprinting.
-- Not the actual production function; isolate signature and ACL survival only.
create function public.ai_p0_review_memory(p_memory_id uuid,p_approve boolean)
returns text language plpgsql security definer set search_path = ''
as $legacy_fixture$
begin
  return 'SYNTHETIC_LEGACY_RPC_NOT_FOR_PRODUCTION';
end;
$legacy_fixture$;
revoke all on function public.ai_p0_review_memory(uuid,boolean) from public,anon;
grant execute on function public.ai_p0_review_memory(uuid,boolean) to authenticated,service_role;

insert into public.ai_p0_memories(id,scope,memory_key,version,title,status)
values
('11111111-1111-4111-8111-111111111111','COMPANY','EXAMPLE-A',1,'Previous','APPROVED'),
('22222222-2222-4222-8222-222222222222','COMPANY','EXAMPLE-A',2,'New draft','DRAFT'),
('33333333-3333-4333-8333-333333333333','COMPANY','EXAMPLE-B',1,'Rejected draft','DRAFT'),
('44444444-4444-4444-8444-444444444444','COMPANY','EXAMPLE-C',1,'Rollback draft','DRAFT');
