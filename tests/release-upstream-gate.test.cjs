'use strict';
// P4 release gate regression: a missing, skipped, cancelled or failed job must not pass.
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const gate=path.join(__dirname,'release-upstream-gate.cjs');
const keys=['STATIC_RESULT','POSTGRES_RESULT','HTTP_RESULT','BROWSER_RESULT'];
function check(overrides,pass){
  const env={...process.env};
  for(const key of keys)env[key]='success';
  for(const [key,value] of Object.entries(overrides)){
    if(value===null)delete env[key];
    else env[key]=value;
  }
  const p=spawnSync(process.execPath,[gate],{env,encoding:'utf8',timeout:5000});
  if(p.error)throw p.error;
  assert.equal(p.status,pass?0:1,JSON.stringify({overrides,stdout:p.stdout,stderr:p.stderr}));
  if(!pass)assert.match(p.stderr,/RELEASE BLOCKED/);
}
check({},true);
for(const name of keys){
  for(const value of ['failure','cancelled','skipped','',null])check({[name]:value},false);
}
check({STATIC_RESULT:'failure',BROWSER_RESULT:null},false);
console.log('P4 release gate negative matrix passed: 1 success and 21 blocked combinations.');
