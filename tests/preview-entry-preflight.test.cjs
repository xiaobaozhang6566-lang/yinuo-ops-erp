// P4 static preview preflight; no network calls or production writes.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const knowledge=fs.readFileSync('knowledge.js','utf8');
const app=fs.readFileSync('app.js','utf8');
assert.match(html,/<!doctype html>/i);
for(const file of ['app.js','v13.js','v14.js','knowledge.js','knowledge.css']){
  assert.ok(fs.existsSync(file),'Missing preview asset: '+file);
}
for(const file of ['app.js','v13.js','v14.js','knowledge.js']){
  assert.ok(html.includes('src="'+file+'?v='),'Missing HTML script reference: '+file);
  new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
}
assert.ok(html.includes('knowledge.css?v='),'Missing knowledge stylesheet');
assert.match(knowledge,/const REVIEW_RELEASE_ENABLED=false/);
assert.ok(!knowledge.includes('/rpc/ai_p0_review_memory'),'Legacy approval API must not be called');
assert.ok(knowledge.includes('status=eq.APPROVED'));
assert.ok(knowledge.includes('status=eq.DRAFT'));
assert.ok(knowledge.includes('未经核验'));
assert.ok(!/service_role|sb_secret_/i.test(html+knowledge+app),'Secret marker in browser bundle');
console.log('Preview entrypoint static preflight passed; hosted E2E and real RLS still required.');
