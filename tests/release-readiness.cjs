// P4 V1.0 release-readiness evidence, not a deployment command.
// Default mode reports progress. --enforce fails closed for merge-to-main PRs.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const kb=fs.readFileSync('knowledge.js','utf8');
const workflow=fs.readFileSync('.github/workflows/knowledge-safety.yml','utf8');
const exists=x=>fs.existsSync(x);
const required=(text,part)=>text.includes(part);
const checks=[
  {id:'P1-CASE-SOURCE',pass:required(kb,'function validTaskCaseSource(')
      &&required(kb,"const linked=await api('/rest/v1/ops_tasks?select=id&id=eq.'")
      &&required(kb,'caseDraftMissingFields(body)'),
    evidence:'Task case source checked by role-filtered API; required field and HTTPS evidence guards.'},
  {id:'P2-REVIEW-PREVIEW',pass:required(kb,'function reviewEvidencePreview(')
      &&required(kb,'function reviewRiskChecklist(')
      &&required(kb,'REVIEW_RELEASE_ENABLED=false')
      &&required(kb,'审核通过（待开放）'),
    evidence:'Read-only provenance and risk checklist; knowledge approval remains disabled.'},
  {id:'P2-AI-SUMMARY-SERVER',pass:exists('api/kb-draft-summary.js')
      &&exists('tests/ai-draft-summary.test.cjs')
      &&required(workflow,'node tests/ai-draft-summary.test.cjs'),
    evidence:'Requires a server-backed AI summary and a registered automated safety test. Static file presence alone is not full authorization.'},
  {id:'P4-BROWSER-E2E',pass:exists('tests/browser-e2e.cjs')
      &&required(workflow,'node tests/browser-e2e.cjs'),
    evidence:'Playwright isolated mock-backend browser E2E is registered.'},
  {id:'P4-POSTGRES-RLS',pass:exists('tests/p0_employee_rls_cases.sql')
      &&required(workflow,'tests/p0_employee_rls_cases.sql'),
    evidence:'Disposable PostgreSQL authorization regression is registered.'},
  {id:'P4-HOSTED-PREVIEW-SIGNOFF',pass:false,
    evidence:'Requires a separate real-host Preview authentication and authorization signoff; not provided by mock-browser CI.'},
  {id:'P0-PRODUCTION-SIGNOFF',pass:false,
    evidence:'Requires separately authorized production permissions/migration assessment and rollback approval.'}
];
assert.equal(checks.length,7);
const passed=checks.filter(x=>x.pass).length;
const blocked=checks.filter(x=>!x.pass).map(x=>x.id);
const report={release:'AI-Second-Brain-V1.0',branch:process.env.GITHUB_REF_NAME||'local',
  commit:process.env.GITHUB_SHA||'local',ready:blocked.length===0,
  summary:passed+'/'+checks.length+' checks evidenced',
  checks,blocked,
  warning:'Preview READY and CI success do not authorize production. Do not merge draft PR or promote deployment.'};
if(process.env.GITHUB_STEP_SUMMARY){
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '### AI Second Brain V1.0 release gate\n\n'+
    '| Check | Evidence | Status |\n|---|---|---|\n'+
    checks.map(x=>'| '+x.id+' | '+x.evidence.replace(/\|/g,'/')+' | '+(x.pass?'PASS':'BLOCKED')+' |').join('\n')+
    '\n\n**Result:** '+(report.ready?'READY':'BLOCKED')+
    '. This check does not deploy or approve anything.\n');
}
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--enforce')&&!report.ready)process.exitCode=1;
