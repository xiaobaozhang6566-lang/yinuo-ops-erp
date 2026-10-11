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
assert.match(js,/return required\.filter/);
assert.match(js,/missing\.length/);
assert.match(js,/function validTaskCaseSource/);
console.log('P1 case draft mandatory section and task source guards passed.');

// P2 excerpt is source-based, read-only, and never invokes approval or generative APIs.
assert.match(js,/function reviewEvidencePreview\(item\)/);
assert.match(js,/生成审核前原文摘录（只读）/);
assert.match(js,/未经核验/);
assert.match(js,/不得据此直接批准或发布 SOP/);
assert.match(js,/evidenceOutput\.textContent=reviewEvidencePreview\(item\)/);
console.log('P2 source excerpt UI contract passed (no AI generation).');

assert.match(js,/警示：缺少来源类型或来源编号/);
assert.match(js,/本行已截断/);
assert.match(js,/审核前必须阅读完整原文/);
assert.match(js,/第 '\+x\.line\+' 行/);
console.log('P2 evidence provenance and truncation warnings contract passed.');

// P2 provenance preview requires source fields in the DRAFT read query.
assert.match(js,/select=id,title,category,scope,memory_key,version,content,created_at,status,source_type,source_ref&status=eq\.DRAFT/);
console.log('P2 draft provenance query contract passed.');

assert.match(js,/警示：正文含待填写或待核实内容/);
assert.match(js,/警示：知识正文为空/);
assert.match(js,/const unresolved=/);
assert.match(js,/const noBody=/);
console.log('P2 draft incompleteness warnings checked.');

// P2 behavior tests: execute the real pure preview function, not only source regexes.
const previewStart=js.indexOf('  function reviewEvidencePreview(item){');
const previewEnd=js.indexOf('  async function showDrafts()',previewStart);
assert.ok(previewStart>=0 && previewEnd>previewStart,'P2 preview function must exist');
const sandbox={};
vm.runInNewContext(js.slice(previewStart,previewEnd)+';this.runPreview=reviewEvidencePreview;',sandbox);
const preview=sandbox.runPreview;
const base={memory_key:'SOP-1',version:2,scope:'COMPANY',status:'DRAFT',source_type:'MANUAL',source_ref:'DOC-1'};
const validPreview=preview({...base,content:{body:'First line\nSecond line'}});
assert.match(validPreview,/第 1 行：First line/);
assert.match(validPreview,/第 2 行：Second line/);
assert.doesNotMatch(validPreview,/警示：缺少来源类型/);
const missingSourcePreview=preview({...base,source_ref:'',content:{body:'Verified text'}});
assert.match(missingSourcePreview,/警示：缺少来源类型或来源编号/);
const emptyPreview=preview({...base,content:{body:''}});
assert.match(emptyPreview,/警示：知识正文为空/);
const unresolvedPreview=preview({...base,content:{body:'Root cause [待核实]'}});
assert.match(unresolvedPreview,/警示：正文含待填写或待核实内容/);
const longPreview=preview({...base,content:{body:Array.from({length:7},(_,i)=>'Line '+i).join('\n')}});
assert.match(longPreview,/已省略 2 行/);
const truncatedPreview=preview({...base,content:{body:'A'.repeat(230)}});
assert.match(truncatedPreview,/本行已截断/);
console.log('P2 preview functional cases passed.');

// P1 behavioral checks: exercise actual validation guards without a live database.
const p1Start=js.indexOf('  function caseDraftMissingFields(body){');
const p1End=js.indexOf('  function showCreate(seed){',p1Start);
assert.ok(p1Start>=0&&p1End>p1Start);
const p1Context={URL}; // The application runs in a browser with the standard URL constructor.
vm.runInNewContext(js.slice(p1Start,p1End)+';this.checkFields=caseDraftMissingFields;this.checkSource=validTaskCaseSource;',p1Context);
const bodyFor=proof=>['问题描述：发现口袋位置错误','复盘原因：原图核对遗漏','防复发措施：增加结构复核','证据链接：'+proof].join('\n');
assert.ok(p1Context.checkFields(bodyFor('待补充')).includes('证据链接'));
assert.ok(p1Context.checkFields(bodyFor('[待核实]')).includes('证据链接'));
assert.ok(p1Context.checkFields(bodyFor('TODO')).includes('证据链接'));
assert.equal(p1Context.checkFields(bodyFor('https://example.com/evidence')).length,0);
assert.equal(p1Context.checkSource('TASK:11111111-1111-4111-8111-111111111111'),true);
assert.equal(p1Context.checkSource('TASK:------------------------------------'),false);
assert.equal(p1Context.checkSource('TASK:1234'),false);
console.log('P1 case draft behavior tests passed.');

assert.ok(p1Context.checkFields(bodyFor('not a URL')).includes('证据链接'));
assert.ok(p1Context.checkFields(bodyFor('http://example.com/evidence')).includes('证据链接'));
assert.ok(p1Context.checkFields(bodyFor('https://user:pass@example.com/evidence')).includes('证据链接'));
assert.ok(p1Context.checkFields(bodyFor('https://example.com/evidence')+'\n证据链接：https://example.com/other').includes('证据链接'));
assert.match(js,/const linked=await api\('\/rest\/v1\/ops_tasks\?select=id&id=eq\.'/);
assert.match(js,/关联任务不存在或当前账号无权读取/);
console.log('P1 evidence URL and source lookup guards passed.');
