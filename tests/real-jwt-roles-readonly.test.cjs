'use strict';
const assert=require('node:assert/strict');
const {verify}=require('./real-jwt-roles-readonly.cjs');
const M='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',E='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const t1='11111111-1111-4111-8111-111111111111',t2='22222222-2222-4222-8222-222222222222';
function mock({leak=false,employeeDraft=false,noManagerOnly=false}={}){
  return async(url,opts)=>{
    assert.equal(opts.method,'GET');
    const manager=opts.headers.Authorization==='Bearer manager.jwt';
    let data;
    if(url.endsWith('/auth/v1/user'))data={id:manager?M:E};
    else if(url.includes('/ops_members?'))data=[{user_id:manager?M:E,role:manager?'manager':'employee',is_active:true}];
    else if(url.includes('/ai_p0_memories?'))data=manager||employeeDraft?[{id:t1,status:'DRAFT'}]:[];
    else if(url.includes('/ops_tasks?'))data=manager?[{id:t1},{id:t2}]:leak?[{id:t1},{id:'33333333-3333-4333-8333-333333333333'}]:noManagerOnly?[{id:t1},{id:t2}]:[{id:t1}];
    else throw new Error('unexpected URL');
    return {ok:true,json:async()=>data};
  };
}
const config={SUPABASE_PUBLISHABLE_KEY:'test',YINUO_MANAGER_TEST_JWT:'manager.jwt',YINUO_EMPLOYEE_TEST_JWT:'employee.jwt'};
(async()=>{
  const good=await verify(config,mock());
  assert.equal(good.status,'PASS');
  for(const [options,error] of [
    [{leak:true},/outside the manager-visible scope/],
    [{employeeDraft:true},/draft visibility mismatch/],
    [{noManagerOnly:true},/No manager-only task/]
  ])await assert.rejects(verify(config,mock(options)),error);
  await assert.rejects(verify({...config,YINUO_EMPLOYEE_TEST_JWT:null},mock()),/Missing publishable key/);
  console.log('Read-only live JWT role validator: synthetic safety regressions passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
