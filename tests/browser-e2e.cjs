// P4 isolated browser E2E. Mock every Supabase request; NEVER use live business data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const HOST=process.env.LOCAL_E2E_URL||'http://127.0.0.1:8765';
const SUPABASE='https://iscadepgzegrvcqzosso.supabase.co/';
const managerId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const taskId='11111111-1111-4111-8111-111111111111';
const now='2026-10-11T06:00:00Z';
const task={id:taskId,task_no:'T-100',title:'核验商品页面信息',status:'已完成',task_date:'2026-10-11',assignee_user_id:managerId,assignee:'演示员工',task_type:'商品检查'};
const draft={id:'22222222-2222-4222-8222-222222222222',title:'审核前测试草稿',category:'SOP',scope:'COMPANY',memory_key:'TEST-SOP',version:1,status:'DRAFT',created_at:now,content:{body:'核查原文第一行\n[待核实]'},source_type:'MANUAL',source_ref:''};
const approved={...draft,id:'33333333-3333-4333-8333-333333333333',title:'已批准测试知识',status:'APPROVED',source_ref:'DOC-1',reviewed_at:'2026-01-01T00:00:00Z',effective_at:'2026-01-01T00:00:00Z',expires_at:null,content:{body:'已核验的测试正文'}};

async function scenario(browser,role){
  const context=await browser.newContext();
  const userId=role==='manager'?managerId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await context.addInitScript(({userId})=>{
    localStorage.setItem('ynerp',JSON.stringify({user:{id:userId},access_token:'synthetic-token',refresh_token:'synthetic-refresh'}));
  },{userId});
  const page=await context.newPage();
  let writes=[],requests=[];
  await page.route(SUPABASE+'**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname+url.search;
    requests.push(req.method()+' '+path);
    const reply=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    if(req.method()==='POST'&&path.includes('/rpc/ai_p0_save_memory')){
      writes.push(JSON.parse(req.postData()||'{}'));
      return reply({id:'44444444-4444-4444-8444-444444444444'});
    }
    if(req.method()!=='GET')return route.fulfill({status:403,body:'{"message":"Mock forbids unexpected writes"}',contentType:'application/json'});
    if(path.startsWith('/rest/v1/ops_members?'))return reply([{user_id:userId,role,is_active:true,display_name:role==='manager'?'演示管理员':'演示员工'}]);
    if(path.startsWith('/rest/v1/stores?'))return reply([]);
    if(path.startsWith('/rest/v1/ops_tasks?'))return reply(path.includes('select=id&')?[{id:taskId}]:[task]);
    if(path.startsWith('/rest/v1/ai_p0_memories?')){
      if(path.includes('status=eq.APPROVED'))return reply([approved]);
      if(path.includes('status=eq.DRAFT'))return reply(role==='manager'?[draft]:[]);
      return reply([]);
    }
    if(path.startsWith('/rest/v1/ops_task_events?'))return reply([{id:'event-1',event_type:'TASK_COMPLETED',created_at:now,detail:{source:'test-fixture'}}]);
    if(path.startsWith('/rest/v1/ops_task_submissions?'))return reply([{id:'submission-1',attempt_no:1,result:'已完成核验',note:'复核已记录',review_status:'已通过',submitted_at:now}]);
    if(path.startsWith('/rest/v1/ai_p0_audit_log?'))return reply([]);
    return route.fulfill({status:403,body:'{"message":"Unexpected query blocked by mock"}',contentType:'application/json'});
  });
  // Mock POST member list separately, so all authorized setup requests remain isolated.
  await page.route(SUPABASE+'rest/v1/rpc/ops_list_members',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{user_id:managerId,role:'manager',is_active:true,display_name:'演示管理员'}])}));
  await page.goto(HOST+'/index.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'AI 知识中心'}).click();
  await page.getByText('已批准测试知识').waitFor();
  assert.equal(await page.getByText('审核前测试草稿').count(),0,'Draft must not appear as approved knowledge');
  await page.getByRole('button',{name:'查看任务留痕'}).click();
  await page.getByText('任务 #T-100').waitFor();
  await page.getByRole('button',{name:'查看留痕'}).click();
  await page.getByText('TASK_COMPLETED').waitFor();
  await page.getByText('已完成核验').waitFor();
  if(role==='manager'){
    await page.getByRole('button',{name:'查看待审核草稿'}).click();
    await page.getByText('审核前测试草稿').waitFor();
    assert.equal(await page.getByRole('button',{name:'审核通过（待开放）'}).isDisabled(),true);
    await page.getByRole('button',{name:'生成审核前原文摘录（只读）'}).click();
    await page.getByText('警示：缺少来源类型或来源编号',{exact:false}).waitFor();
    await page.getByRole('button',{name:'整理为经验案例草稿'}).click();
    await page.locator('textarea[name="body"]').waitFor();
    const initial=await page.locator('textarea[name="body"]').inputValue();
    assert.match(initial,/\[请填写/);
    await page.getByRole('button',{name:'保存为待审核草稿'}).click();
    await page.getByText('案例缺少有效的',{exact:false}).waitFor();
    assert.equal(writes.length,0,'Incomplete case must not write');
    const completed=initial.replace('问题描述：[请填写真实问题与影响]','问题描述：核验时发现商品文案不一致')
      .replace('复盘原因：[请填写已核验的根因]','复盘原因：上架校验未覆盖价格变更')
      .replace('防复发措施：[请填写可执行的措施]','防复发措施：补充双人复核步骤')
      .replace('证据链接：[请补充]','证据链接：https://example.com/fixtures/evidence');
    await page.locator('textarea[name="body"]').fill(completed);
    await page.getByRole('button',{name:'保存为待审核草稿'}).click();
    await page.getByText('草稿保存成功；尚未审核生效。').waitFor();
    assert.equal(writes.length,1,'Only explicitly saved draft may write');
    assert.equal(writes[0].p_source_type,'TASK_CASE');
    assert.equal(writes[0].p_source_ref,'TASK:'+taskId);
  }else{
    assert.equal(await page.getByRole('button',{name:'查看待审核草稿'}).count(),0,'Employees cannot use admin draft UI');
    assert.equal(await page.getByRole('button',{name:'整理为经验案例草稿'}).count(),0,'Employees cannot create case drafts');
    assert.equal(writes.length,0);
  }
  assert.ok(!requests.some(x=>x.includes('/rpc/ai_p0_review_memory')||x.includes('/rpc/kb_review_memory_with_reason')),'No approval requests permitted');
  await context.close();
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{await scenario(browser,'manager');await scenario(browser,'employee');console.log('P1/P2 isolated browser E2E PASS: manager, employee, task trace, case validation, approval gate.');}
  finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
