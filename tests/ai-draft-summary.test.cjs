const assert=require('node:assert/strict');
const handler=require('../api/kb-draft-summary.js');
const id='11111111-1111-4111-8111-111111111111';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={AI_SUMMARY_ENABLED:'true',OPENAI_API_KEY:'test-only',SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-only'};
function run(body,role='manager',opts={}){
  const saved={};for(const key of Object.keys(env)){saved[key]=process.env[key];process.env[key]=env[key];}
  if(opts.disabled)process.env.AI_SUMMARY_ENABLED='false';
  let calls=[];let draftReads=0;let authReads=0;let memberReads=0;
  const fetchOriginal=global.fetch;
  global.fetch=async(url,req={})=>{
    calls.push({url:String(url),method:req.method||'GET'});
    let data;
    if(String(url).includes('/auth/v1/user')){authReads++;data={id:opts.wrongUser||opts.sessionRevokedAfterAI&&authReads>1?'not-a-uuid':uid};}
    else if(String(url).includes('/ops_members?')){memberReads++;data=[{user_id:opts.wrongMemberId?'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':uid,role:opts.demotedAfterAI&&memberReads>1?'employee':role,is_active:!opts.inactive&&!(opts.disabledAfterAI&&memberReads>1)}];}
    else if(String(url).includes('/ai_p0_memories?')){draftReads++;data=[{id:opts.wrongDocument?'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':id,status:opts.approved||(opts.changedAfterAI&&draftReads>1)?'APPROVED':'DRAFT',version:2,title:'Test',source_type:'MANUAL',source_ref:opts.noSource?'':'DOC-1',content:{body:opts.emptySource?'':'First fact line\nSecond fact line'}}];}
    else if(String(url).includes('api.openai.com'))data={choices:[{message:{content:JSON.stringify(opts.ungrounded?{summary:'Test',evidence:[{line:2,quote:'invented claim'}],questions:[]}:{summary:'Test',evidence:[{line:1,quote:'First fact'}],questions:[]})}}]};
    else throw Error('Unexpected URL');
    return {ok:true,json:async()=>data};
  };
  const res={status(n){this.code=n;return this},json(o){this.data=o;return this},setHeader(){return this}};
  return Promise.resolve(handler({method:opts.method||'POST',body:body&&Object.keys(body).length?body:{memory_id:id},headers:{...(opts.noAuth?{}:{authorization:'Bearer fake.jwt'}),'content-type':opts.contentType||'application/json',...(opts.contentLength?{'content-length':opts.contentLength}:{})}},res))
    .then(()=>({res,calls})).finally(()=>{global.fetch=fetchOriginal;for(const key of Object.keys(env)){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key]}});
}
(async()=>{
 assert.throws(()=>handler._test.grounded({summary:'bad',evidence:[{line:3,quote:'fabricated'}],questions:[]},['Fact']),/unsupported_quote/);
 assert.throws(()=>handler._test.grounded({summary:'',evidence:[{line:1,quote:'First fact'}],questions:[]},['First fact line']),/invalid_ai_output/);
 assert.throws(()=>handler._test.grounded({summary:'Test',evidence:[{line:1,quote:'[待核实]'}],questions:[]},['[待核实]']),/unsupported_quote/);
 let result=await run({},'manager',{disabled:true});
 assert.equal(result.res.code,503);assert.equal(result.calls.length,0);
 result=await run({},'employee');
 assert.equal(result.res.code,403);assert.ok(!result.calls.some(x=>x.url.includes('api.openai.com')));
 result=await run({},'manager',{noSource:true});
 assert.equal(result.res.code,422);assert.ok(!result.calls.some(x=>x.url.includes('api.openai.com')));
 result=await run({},'manager',{ungrounded:true});
 assert.equal(result.res.code,502);
 result=await run({},'manager',{inactive:true});
 assert.equal(result.res.code,403);assert.ok(!result.calls.some(x=>x.url.includes('api.openai.com')));
 result=await run({},'manager',{wrongMemberId:true});
 assert.equal(result.res.code,403);
 result=await run({},'manager',{wrongUser:true});
 assert.equal(result.res.code,401);
 result=await run({},'manager',{approved:true});
 assert.equal(result.res.code,404);
 result=await run({},'manager',{wrongDocument:true});
 assert.equal(result.res.code,404);
 result=await run({},'manager',{emptySource:true});
 assert.equal(result.res.code,422);
 for(const opts of [{method:'GET'},{contentType:'text/plain'},{contentLength:'10000'}]){
   result=await run({},'manager',opts);assert.ok(result.res.code>=400);assert.equal(result.calls.length,0);
 }
 result=await run({memory_id:'not-a-uuid'},'manager');
 assert.equal(result.res.code,400);assert.equal(result.calls.length,0);
 result=await run({},'manager',{noAuth:true});
 assert.equal(result.res.code,401);assert.equal(result.calls.length,0);
 result=await run({},'manager',{sessionRevokedAfterAI:true});
 assert.equal(result.res.code,401);assert.equal(result.res.data.error,'SESSION_CHANGED_DURING_SUMMARY');
 result=await run({},'manager',{demotedAfterAI:true});
 assert.equal(result.res.code,403);assert.equal(result.res.data.error,'MANAGER_ACCESS_REVOKED');
 result=await run({},'manager',{disabledAfterAI:true});
 assert.equal(result.res.code,403);
 result=await run({},'manager',{changedAfterAI:true});
 assert.equal(result.res.code,409);
 assert.equal(result.res.data.error,'DRAFT_CHANGED_DURING_SUMMARY');
 result=await run({},'manager');
 assert.equal(result.res.code,200);assert.equal(result.res.data.status,'DRAFT');
 assert.ok(result.calls.every(x=>x.method==='GET'||x.url.includes('api.openai.com')));
 console.log('P2 server authorization, default-off, provenance, evidence checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
