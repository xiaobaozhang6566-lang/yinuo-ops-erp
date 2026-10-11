'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE='http://127.0.0.1:8765';
const manager='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const employee='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
async function check(browser,role){
 const ctx=await browser.newContext();
 const uid=role==='manager'?manager:employee;
 await ctx.addInitScript(({uid})=>{localStorage.setItem('ynerp',JSON.stringify({access_token:'fake',refresh_token:'fake',user:{id:uid}}));},{uid});
 const p=await ctx.newPage();
 let methods=[],errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://iscadepgzegrvcqzosso.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),q=url.pathname+url.search;
   methods.push({method:req.method(),path:url.pathname});
   let payload=[];
   if(url.pathname==='/rest/v1/ops_members')payload=[{user_id:uid,role,is_active:true,display_name:'测试'+role}];
   else if(url.pathname==='/rest/v1/stores')payload=[];
   else if(url.pathname==='/rest/v1/ops_tasks')payload=[{id:'11111111-1111-4111-8111-111111111111',task_no:'T1',title:'测试任务',status:'待处理',created_at:'2026-10-01T00:00:00Z',task_date:'2026-10-01',assignee_user_id:uid}];
   else if(url.pathname==='/rest/v1/rpc/ops_list_members')payload=[{user_id:uid,role,is_active:true,display_name:'测试'+role}];
   else if(url.pathname==='/rest/v1/ai_p0_memories')payload=q.includes('status=eq.DRAFT')?(role==='manager'?[{id:'22222222-2222-4222-8222-222222222222',status:'DRAFT',title:'内部草稿',scope:'COMPANY',version:1,content:{body:'需要复核'},source_type:'MANUAL',source_ref:'TEST',created_at:'2026-10-01T00:00:00Z'}]:[]):[];
   else if(url.pathname==='/rest/v1/ai_p0_audit_log')payload=[];
   else if(url.pathname==='/rest/v1/ops_task_events')payload=[];
   else if(url.pathname==='/rest/v1/ops_task_submissions')payload=[];
   else throw Error('Unexpected API '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
 });
 await p.goto(BASE,{waitUntil:'domcontentloaded'});
 await p.getByText('AI 第二大脑',{exact:true}).click();
 await p.getByRole('heading',{name:'任务执行留痕'}).waitFor();
 await p.getByText('测试任务').waitFor();
 assert.equal(await p.getByRole('heading',{name:'任务执行留痕'}).count(),1);
 if(role==='manager'){
   await p.getByRole('button',{name:'读取待审核草稿'}).click();
   await p.getByText('内部草稿').waitFor();
   await p.getByRole('button',{name:'预览来源与风险'}).click();
   await p.getByText(/尚未完成正式审核/).waitFor();
   assert.equal(await p.getByRole('button',{name:/审核通过|正式审批|保存草稿/}).count(),0);
 }else{
   assert.equal(await p.getByText('知识草稿与审核证据').count(),0);
   assert.equal(methods.some(x=>x.path==='/rest/v1/ai_p0_audit_log'),false);
 }
 await p.getByText('首页',{exact:true}).click();
 await p.getByText('今日任务').first().waitFor();
 assert.equal(errors.length,0,errors.join('\n'));
 assert.equal(methods.some(x=>x.path.includes('ai_p0_review_memory')||x.path.includes('kb-draft-summary')),false);
 assert.equal(methods.filter(x=>x.method!=='GET').every(x=>x.path==='/rest/v1/rpc/ops_list_members'),true);
 await ctx.close();
}
(async()=>{const browser=await chromium.launch({headless:true});try{await check(browser,'manager');await check(browser,'employee');console.log('PASS: manager and employee read-only navigation E2E');}finally{await browser.close()}})().catch(err=>{console.error(err);process.exitCode=1});
