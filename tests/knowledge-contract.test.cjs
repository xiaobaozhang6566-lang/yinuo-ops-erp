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
assert.match(js,/ai_p0_review_memory/);
assert.match(js,/confirm\(/);
assert.match(js,/r\.status==='APPROVED'/);
assert.match(js,/effective_at/);
assert.match(js,/expires_at/);
assert.ok(!/service_role|sb_secret_/.test(js),'Client must not contain server secrets');
assert.ok(css.includes('.kb-search'));
console.log('Knowledge V1 source contract checks passed. Browser and role-based authorization tests still required.');
