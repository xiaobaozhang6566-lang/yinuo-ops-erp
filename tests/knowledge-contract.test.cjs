// Run from repo root: node tests/knowledge-contract.test.cjs
// Static safety checks, not a replacement for browser/RLS integration tests.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('knowledge.js','utf8');
const css=fs.readFileSync('knowledge.css','utf8');
new vm.Script(js,{filename:'knowledge.js'});
assert.match(html,/<script src="app\.js\?v=1\.2"><\/script>/);
assert.match(html,/<script src="v14\.js\?v=1\.4"><\/script>/);
assert.match(html,/<script src="knowledge\.js\?v=1\.0"><\/script>/);
assert.match(html,/knowledge\.css\?v=1\.0/);
assert.match(js,/S\.member\.role==='manager'/);
assert.match(js,/status=eq\.APPROVED/);
assert.match(js,/status=eq\.DRAFT/);
assert.match(js,/ai_p0_save_memory/);
assert.doesNotMatch(js,/\/rpc\/ai_p0_review_memory/,'Unsafe legacy approval API must not be used');
assert.match(js,/审核通过（待开放）/);
assert.match(js,/审核意见（至少 10 字）/);
assert.match(js,/data-intent/);
assert.match(js,/showAuditHistory/);
assert.match(js,/review_reason/);
assert.match(js,/当前为模拟确认/);
assert.match(js,/r\.status==='APPROVED'/);
assert.match(js,/effective_at/);
assert.match(js,/Boolean\(r\.reviewed_at\)/);
assert.match(js,/Number\.isFinite\(Date\.parse\(r\.effective_at\)\)/);
assert.match(js,/expires_at/);
assert.match(js,/Boolean\(r\.reviewed_at\)/);
assert.match(js,/Date\.parse\(r\.expires_at\)>now/);
assert.match(js,/status=eq\.APPROVED/);
assert.match(js,/async function submitReviewedKnowledgeAfterRelease/);
assert.ok(!/service_role|sb_secret_/.test(js),'Client must not contain server secrets');
assert.ok(css.includes('.kb-search'));
console.log('Knowledge V1 source contract checks passed. Browser and role-based authorization tests still required.');

// P1 task trace is read-only and uses RLS-protected ERP endpoints.
assert.match(js,/async function showTaskTrace\(\)/);
assert.match(js,/\/rest\/v1\/ops_task_events\?select=/);
assert.match(js,/\/rest\/v1\/ops_task_submissions\?select=/);
assert.match(js,/data-task-trace-id/);
console.log('P1 task trace read-only contract checks passed.');

assert.match(js,/整理为经验案例草稿/);
assert.match(js,/showCreate\(\{category:'LESSON'/);
assert.match(js,/未经审批不得生效/);
console.log('P1 task-to-lesson draft contract passed.');

assert.match(js,/form\.dataset\.caseSource==='TASK_CASE'/);
assert.match(js,/p_source_type:form\.dataset\.caseSource==='TASK_CASE'\?'TASK_CASE':'MANUAL'/);
assert.match(js,/案例缺少有效的/);
console.log('P1 case draft completeness checks passed.');

assert.match(js,/const required=\['问题描述','复盘原因','防复发措施','证据链接'\]/);
assert.match(js,/const missing=required\.filter/);
assert.match(js,/missing\.length/);
assert.match(js,/TASK:\[0-9a-f-\]/);
console.log('P1 case draft mandatory section and task source guards passed.');
