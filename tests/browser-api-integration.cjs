// P4: integrated browser -> real server handler -> mocked Supabase/AI E2E.
// All credentials, data and upstream responses are synthetic. No network calls to providers.
'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const handler=require('../api/kb-draft-summary.js');

const PORT=8776,ORIGIN='http://127.0.0.1:'+PORT;
const backend='https://iscadepgzegrvcqzosso.supabase.co/';
const managerId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const employeeId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const draftId='22222222-2222-4222-8222-222222222222';
const now='2026-10-11T06:00:00Z';
const draft={id:draftId,title:'AI 集成核验草稿',category:'SOP',scope:'COMPANY',memory_key:'INT-001',version:1,
  status:'DRAFT',created_at:now,content:{body:'原文第一行已经复核\n第二行需要进一步核实'},
  source_type:'MANUAL',source_ref:'DOC-INT-001'};
const approved={...draft,id:'33333333-3333-4333-8333-333333333333',title:'测试已批准知识',
  status:'APPROVED',reviewed_at:now,effective_at:now,expires_at:null};
Object.assign(process.env,{AI_SUMMARY_ENABLED:'true',OPENAI_API_KEY:'synthetic',
  SUPABASE_URL:'https://iscadepgzegrvcqzosso.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic'});
let modelCalls=0,backendWrites=0;
const nativeFetch=global.fetch;
global.fetch=async(url,opts={})=>{
  const u=String(url),auth=opts.headers?.Authorization||'';
  const isManager=auth==='Bearer mock-manager';
  if(u.startsWith('https://iscadepgzegrvcqzosso.supabase.co/')){
    if((opts.method||'GET')!=='GET'){backendWrites++;throw Error('Unexpected database write');}
    const value=u.includes('/auth/v1/user')?{id:isManager?managerId:employeeId}:
      u.includes('/rest/v1/ops_members?')?[{user_id:isManager?managerId:employeeId,role:isManager?'manager':'employee',is_active:true}]:
      u.includes('/rest/v1/ai_p0_memories?')?(isManager?[draft]:[]):null;
    if(value===null)throw Error('Unexpected mock DB URL: '+u);
    return {ok:true,json:async()=>value};
  }
  if(u==='https://api.openai.com/v1/chat/completions'){
    modelCalls++;
    assert.equal(opts.method,'POST');
    const payload=JSON.parse(opts.body);
    assert.match(payload.messages[1].content,/1: 原文第一行已经复核/);
    return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({
      summary:'审核建议：需进一步核实第二行',
      evidence:[{line:1,quote:'原文第一行已经复核'}],
      questions:['第二行的原件证据在哪里？']
    })}}]})};
  }
  throw Error('External request blocked: '+u);
};

const contentTypes={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  try{
    if(req.url==='/api/kb-draft-summary'){
      let raw='';
      for await(const chunk of req){raw+=chunk;if(raw.length>2000)throw Error('body exceeds fixture limit');}
      req.body=raw;
      res.status=function(status){res.statusCode=status;return res};
      res.json=function(data){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return res};
      await handler(req,res);return;
    }
    const requested=new URL(req.url,ORIGIN).pathname;
    const normalized=path.posix.normalize(requested);
    if(normalized.includes('..')||normalized.startsWith('/api/')){res.writeHead(404);res.end();return}
    const file=path.join(process.cwd(),normalized==='/'?'index.html':normalized.slice(1));
    const content=await fs.readFile(file);
    res.setHeader('Content-Type',contentTypes[path.extname(file)]||'application/octet-stream');
    res.end(content);
  }catch(error){res.writeHead(500);res.end('fixture request failed');}
});
async function check(){
  await new Promise(resolve=>server.listen(PORT,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext();
    await context.addInitScript(({managerId})=>{
      localStorage.setItem('ynerp',JSON.stringify({user:{id:managerId},access_token:'mock-manager',refresh_token:'synthetic'}));
    },{managerId});
    const page=await context.newPage();
    await page.route(backend+'**',route=>{
      const url=route.request().url(),u=new URL(url),q=u.pathname+u.search;
      let payload=[];
      if(q.startsWith('/rest/v1/ops_members?'))payload=[{user_id:managerId,role:'manager',is_active:true,display_name:'Test Manager'}];
      else if(q.startsWith('/rest/v1/ai_p0_memories?')){
        payload=q.includes('status=eq.APPROVED')?[approved]:q.includes('status=eq.DRAFT')?[draft]:[];
      }else if(q.startsWith('/rest/v1/ops_tasks?')||q.startsWith('/rest/v1/stores?')||q.startsWith('/rest/v1/ai_p0_audit_log?'))payload=[];
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
    });
    await page.route(backend+'rest/v1/rpc/ops_list_members',route=>route.fulfill({
      status:200,contentType:'application/json',body:'[]'
    }));
    await page.goto(ORIGIN+'/index.html',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'AI 知识中心'}).click();
    await page.getByText('测试已批准知识').waitFor();
    await page.getByRole('button',{name:'查看待审核草稿'}).click();
    await page.getByText('AI 集成核验草稿').waitFor();
    await page.getByRole('button',{name:'生成 AI 草稿总结（试点）'}).click();
    await page.getByText('审核建议：需进一步核实第二行',{exact:false}).waitFor();
    await page.getByText('第 1 行：原文第一行已经复核',{exact:false}).waitFor();
    assert.equal(modelCalls,1);
    assert.equal(backendWrites,0);
    assert.equal(await page.getByRole('button',{name:'审核通过（待开放）'}).isDisabled(),true);
    const unauthorized=await context.request.post(ORIGIN+'/api/kb-draft-summary',{
      headers:{Authorization:'Bearer mock-employee','Content-Type':'application/json'},
      data:{memory_id:draftId}
    });
    assert.equal(unauthorized.status(),403);
    assert.equal(modelCalls,1,'Employee denial must not call AI');
    assert.equal(backendWrites,0,'No database writes allowed');
    await context.close();
    console.log('P2 integrated browser -> handler -> mock providers PASS; approval stays disabled.');
  }finally{await browser.close();}
}
check().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
  await new Promise(resolve=>server.close(resolve));global.fetch=nativeFetch;
});
