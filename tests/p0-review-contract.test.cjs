// Pure contract tests; no production network or database writes.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const sql = fs.readFileSync('sql/kb_review_with_reason_TEST_ONLY.sql', 'utf8');
const page = fs.readFileSync('knowledge.js', 'utf8');
const must = [
  /security definer/i,
  /set search_path\s*=\s*''/i,
  /auth\.uid\(\)/i,
  /private\.is_ops_manager\(\)/i,
  /char_length\(btrim\(p_reason\)\)\s*<\s*10/i,
  /char_length\(p_reason\)\s*>\s*2000/i,
  /for update/i,
  /pg_advisory_xact_lock/i,
  /status='SUPERSEDED'/i,
  /reviewed_by=auth\.uid\(\)/i,
  /reviewed_at=now\(\)/i,
  /jsonb_build_object\('review_reason'/i,
  /insert into public\.ai_p0_audit_log/i,
  /revoke all on function/i,
];
must.forEach(re=>assert.match(sql,re));
assert.doesNotMatch(page,/\/rpc\/ai_p0_review_memory/);
assert.match(page,/async function submitReviewedKnowledgeAfterRelease/);
assert.match(page,/审核通过（待开放）/);
console.log('P0: review migration and disabled-submit contract checks passed (static only).');

const gate=fs.readFileSync('sql/p0_review_release_gate_DO_NOT_RUN.sql','utf8');
assert.match(gate,/revoke execute on function public\.ai_p0_review_memory\(uuid,boolean\) from public, anon, authenticated/i);
assert.match(gate,/to_regprocedure\('public\.kb_review_memory_with_reason\(uuid,boolean,text\)'\)/);
assert.match(gate,/grant execute on function public\.kb_review_memory_with_reason\(uuid,boolean,text\) to authenticated/i);
assert.match(gate,/from public, anon, authenticated, service_role/i);
assert.match(gate,/has_function_privilege\('service_role','public\.ai_p0_review_memory\(uuid,boolean\)','EXECUTE'\)/);
assert.match(gate,/has_function_privilege\('service_role','public\.kb_review_memory_with_reason\(uuid,boolean,text\)','EXECUTE'\)/);
console.log('P0: release permission gate statically checked; NOT executed against production.');

// Fail closed until production JWT/RLS and legacy RPC permissions are verified.
assert.match(page,/const REVIEW_RELEASE_ENABLED=false/);
assert.match(page,/if\(!REVIEW_RELEASE_ENABLED\)throw new Error\('正式审批尚未通过上线验收'\)/);
assert.match(page,/if\(KB\.adminBusy\)throw new Error\('已有审核操作正在执行'\)/);
assert.match(page,/finally\{KB\.adminBusy=false\}/);
console.log('P0: production approval release gate remains disabled.');

const employeePolicy=fs.readFileSync('sql/p0_employee_company_read_CANDIDATE.sql','utf8');
assert.match(employeePolicy,/scope='COMPANY'/);
assert.match(employeePolicy,/status='APPROVED'/);
assert.match(employeePolicy,/reviewed_at is not null/);
assert.match(employeePolicy,/effective_at <= now\(\)/);
assert.match(employeePolicy,/expires_at is null or expires_at > now\(\)/);
assert.match(employeePolicy,/m\.is_active=true/);
assert.doesNotMatch(employeePolicy,/scope\s+in\s*\(/i);
console.log('P0: active member company-only access candidate checked; no deployment.');
