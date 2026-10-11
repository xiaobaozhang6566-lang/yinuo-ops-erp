'use strict';
// Manual, read-only live Supabase JWT role verification. No credentials are logged.
// Set secrets in the invoking environment; do not paste tokens into ChatGPT or commit them.
const assert=require('node:assert/strict');
const API='https://iscadepgzegrvcqzosso.supabase.co';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
async function verifyRole(name,jwt,key,fetcher){
  assert.ok(jwt&&key,'Missing transient JWT or publishable key');
  const headers={apikey:key,Authorization:'Bearer '+jwt,'Cache-Control':'no-store'};
  const get=async path=>{
    const url=API+path;
    const response=await fetcher(url,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error(name+' API GET '+path.split('?')[0]+' returned '+response.status);
    return response.json();
  };
  const user=await get('/auth/v1/user');
  if(!UUID.test(user?.id||''))throw new Error(name+' Supabase Auth session is invalid');
  const members=await get('/rest/v1/ops_members?select=user_id,role,is_active&limit=10');
  if(!Array.isArray(members)||members.length!==1||members[0].user_id!==user.id||
     members[0].role!==name||members[0].is_active!==true)
    throw new Error(name+' role or member isolation mismatch');
  const drafts=await get('/rest/v1/ai_p0_memories?select=id,status&status=eq.DRAFT&limit=1');
  if(!Array.isArray(drafts)||(name==='manager'?!drafts.length:!!drafts.length))
    throw new Error(name+' draft visibility mismatch');
  // Compare the complete small task set across two real sessions, not just API reachability.
  const tasks=await get('/rest/v1/ops_tasks?select=id&order=id.asc&limit=1000');
  if(!Array.isArray(tasks)||tasks.length>=1000||
     tasks.some(task=>!UUID.test(task?.id||''))||
     new Set(tasks.map(task=>task.id)).size!==tasks.length)
    throw new Error(name+' task scope is invalid or requires pagination');
  return {name,auth:'PASS',selfMember:'PASS',draftVisibility:'PASS',
    tasksReadable:'PASS',userId:user.id,taskIds:tasks.map(task=>task.id)};
}
async function verify(config=process.env,fetcher=fetch){
  if(config.SUPABASE_URL&&config.SUPABASE_URL.replace(/\/$/,'')!==API)
    throw new Error('Project endpoint mismatch');
  const key=config.SUPABASE_PUBLISHABLE_KEY;
  if(!key||!config.YINUO_MANAGER_TEST_JWT||!config.YINUO_EMPLOYEE_TEST_JWT)
    throw new Error('Missing publishable key and two fresh test-user JWTs');
  const manager=await verifyRole('manager',config.YINUO_MANAGER_TEST_JWT,key,fetcher);
  const employee=await verifyRole('employee',config.YINUO_EMPLOYEE_TEST_JWT,key,fetcher);
  if(manager.userId===employee.userId)throw new Error('Manager and employee must be different Auth accounts');
  const managerTasks=new Set(manager.taskIds);
  if(employee.taskIds.some(id=>!managerTasks.has(id)))
    throw new Error('Employee sees tasks outside the manager-visible scope');
  if(!manager.taskIds.some(id=>!employee.taskIds.includes(id)))
    throw new Error('No manager-only task available to prove employee task isolation');
  return {status:'PASS',project:'iscadepgzegrvcqzosso',
    roles:[manager,employee].map(({name,auth,selfMember,draftVisibility,tasksReadable})=>({
      name,auth,selfMember,draftVisibility,tasksReadable
    })),
    warning:'Read-only role validation; no approval RPC called and no production data changed.'};
}
if(require.main===module){
  verify().then(result=>console.log(JSON.stringify(result,null,2)))
    .catch(error=>{console.error('LIVE JWT VALIDATION FAILED:',error.message);process.exitCode=1;});
}
module.exports={verify,verifyRole};
