-- CANDIDATE ONLY. Do not apply to production until JWT/RLS tests are passed.
-- V1 minimum access: active employees see only approved effective COMPANY knowledge.
-- TEAM/STORE/PRODUCT remain manager-only pending explicit scope resource keys.
begin;
create policy ai_p0_memories_employee_company_read
on public.ai_p0_memories for select to authenticated
using (
  scope='COMPANY'
  and status='APPROVED'
  and reviewed_at is not null
  and effective_at <= now()
  and (expires_at is null or expires_at > now())
  and exists (
    select 1 from public.ops_members m
    where m.user_id=(select auth.uid()) and m.is_active=true
  )
);
commit;
