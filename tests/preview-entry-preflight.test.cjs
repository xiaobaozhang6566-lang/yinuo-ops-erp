// Release preflight for static preview entrypoint. No network, credentials or production writes.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const knowledge=fs.readFileSync('knowledge.js','utf8');
const app=fs.readFileSync('app.js','utf8');
assert.match(html,/<!doctype html>/i);
for(const file of ['app.js','v13.js','v14.js','knowledge.js','knowledge.css']) {
  assert.ok(fs.existsSync(file),'Missing preview asset: '+file);
}
for(const file of ['app.js','v13.js','v14.js','knowledge.js']) {
  assert.ok(new RegExp('<script\\s+src="'+file.replace('.','\\.')+'\\?v=[^"]+"').test(html),'Missing HTML script reference: '+file);
  new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
}
assert.match(html,/knowledge\\.css\\?v=/);
assert.match(knowledge,/const REVIEW_RELEASE_ENABLED=false/);
assert.doesNotMatch(knowledge,/\\/rpc\\/ai_p0_review_memory/);
assert.match(knowledge,/status=eq\\.APPROVED/);
assert.match(knowledge,/status=eq\\.DRAFT/);
assert.match(knowledge,/未经核验/);
assert.ok(!/service_role|sb_secret_/i.test(html+knowledge+app),'Secret marker in browser bundle');
console.log('Preview entrypoint preflight passed. Browser E2E, hosted preview and live RLS remain unverified.');
