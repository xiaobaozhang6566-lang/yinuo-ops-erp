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
assert.doesNotMatch(page,/\/rpc\/kb_review_memory_with_reason/);
assert.match(page,/审核通过（待开放）/);
console.log('P0: review migration and disabled-submit contract checks passed (static only).');
