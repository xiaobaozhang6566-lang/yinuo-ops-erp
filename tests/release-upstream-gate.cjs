const assert=require('node:assert/strict');
const names=['STATIC_RESULT','POSTGRES_RESULT','HTTP_RESULT','BROWSER_RESULT'];
const failures=names.filter(name=>process.env[name]!=='success');
if(failures.length){
  console.error('RELEASE BLOCKED: upstream jobs not all successful:',failures.map(n=>n+'='+String(process.env[n]||'missing')).join(', '));
  process.exitCode=1;
}else{
  console.log('P4 release upstream gate: all four independent jobs succeeded.');
}
assert.equal(names.length,4);
