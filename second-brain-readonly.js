/* 亦诺 AI 第二大脑 V1.0 — 阶段一：只读。禁止 AI 外传、创建草稿和审批。 */
(function () {
  'use strict';
  const savedPage=window.page;
  const brain={approved:[],drafts:[],loaded:false,loading:false};
  const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
  const safe=x=>e(x==null?'':typeof x==='string'?x:String(x));
  const lines=x=>JSON.stringify(x==null?{}:x,null,2);
  const stamp=x=>x?new Date(x).toLocaleString('zh-CN'):'未记录';
  const member=()=>S.member&&S.member.is_active===true;
  const manager=()=>member()&&S.member.role==='manager';
  const get=path=>api(path); // All requests are HTTP GET; no RPC and no writes.

  window.page=function(){
    if(S.page==='second-brain')return render();
    return savedPage();
  };

  function render(){
    const host=document.getElementById('c');
    if(!host||!member()){if(host)host.textContent='账号尚未获得 AI 第二大脑访问权限。';return}
    host.innerHTML=
      '<section class="sb-heading"><div><div class="sb-kicker">YINUO · AI OS</div><h2>AI 第二大脑 <span class="sb-pill">基础只读版</span></h2>'+
      '<p class="muted">第一阶段仅开放知识查阅、管理员草稿预览和任务执行留痕。外部 AI、知识创建、正式审批均未开放。</p></div></section>'+
      '<section class="panel"><div class="head"><h3>任务执行留痕</h3><button type="button" class="btn gray" id="sb-trace-refresh">刷新任务</button></div>'+
      '<div class="body"><p class="muted">只显示当前账号有权限访问的任务；可查看事件和提交证据，不改变任务状态。</p><div id="sb-tasks" aria-live="polite"></div></div></section>'+
      '<section class="panel"><div class="head"><h3>企业知识查询</h3><button type="button" class="btn gray" id="sb-knowledge-refresh">刷新知识</button></div>'+
      '<div class="body"><p class="muted">仅展示当前账号被授权读取、已审核且在有效期内的知识。</p>'+
      '<label class="sb-search-label" for="sb-search">查找 SOP / 公司规则</label><input class="input" id="sb-search" placeholder="关键词筛选已授权知识">'+
      '<div id="sb-approved" aria-live="polite"></div></div></section>'+
      (manager()?'<section class="panel"><div class="head"><h3>知识草稿与审核证据 · 管理员预览</h3>'+
      '<button class="btn gray" type="button" id="sb-draft-refresh">读取待审核草稿</button></div>'+
      '<div class="body"><p class="muted">草稿不会自动生效。这里仅提供来源、版本、内容和历史审计记录供核对；无保存或审批动作。</p>'+
      '<div id="sb-drafts" aria-live="polite">点击读取待审核草稿。</div><div id="sb-draft-detail" aria-live="polite"></div></div></section>':'');
    document.getElementById('sb-trace-refresh').onclick=showTasks;
    document.getElementById('sb-knowledge-refresh').onclick=loadApproved;
    document.getElementById('sb-search').oninput=paintApproved;
    if(manager())document.getElementById('sb-draft-refresh').onclick=loadDrafts;
    showTasks();
    if(!brain.loaded&&!brain.loading)loadApproved();else paintApproved();
  }

  function approvedValid(x){
    const now=Date.now();
    return x.status==='APPROVED' && !!x.reviewed_at && !!x.effective_at &&
      Number.isFinite(Date.parse(x.effective_at)) && Date.parse(x.effective_at)<=now &&
      (!x.expires_at||(Number.isFinite(Date.parse(x.expires_at))&&Date.parse(x.expires_at)>now));
  }

  function showTasks(){
    const host=document.getElementById('sb-tasks');if(!host)return;
    const tasks=(Array.isArray(S.tasks)?S.tasks:[]).slice().sort((a,b)=>
      String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,30);
    if(!tasks.length){host.innerHTML='<p class="muted">当前账号暂无可读取任务。</p>';return}
    host.innerHTML=tasks.map(t=>'<div class="sb-entry"><strong>任务 #'+safe(t.task_no||'—')+
      '</strong><div>'+safe(t.title||'未命名任务')+' · '+safe(t.status||'')+'</div>'+
      '<button type="button" class="btn gray sb-event-button" data-task="'+safe(t.id)+'">查看执行记录</button>'+
      '<div class="sb-trace-slot" aria-live="polite"></div></div>').join('');
    host.querySelectorAll('button[data-task]').forEach(btn=>btn.onclick=()=>showTrace(btn));
  }

  async function showTrace(btn){
    const slot=btn.parentElement.querySelector('.sb-trace-slot'),id=btn.dataset.task;
    if(!uuid.test(id)||!S.tasks.some(t=>t.id===id)){slot.textContent='无权读取该任务。';return}
    btn.disabled=true;slot.textContent='正在读取执行记录…';
    try{
      const [ev,sub]=await Promise.all([
        get('/rest/v1/ops_task_events?select=id,event_type,detail,created_at&task_id=eq.'+encodeURIComponent(id)+'&order=created_at.desc&limit=40'),
        get('/rest/v1/ops_task_submissions?select=id,attempt_no,result,note,review_status,submitted_at&task_id=eq.'+encodeURIComponent(id)+'&order=submitted_at.desc&limit=20')
      ]);
      if(!Array.isArray(ev)||!Array.isArray(sub))throw Error('数据格式不正确');
      slot.innerHTML='<div class="sb-trace-columns"><div><h4>事件记录（'+ev.length+'）</h4>'+
        (ev.map(x=>'<div class="sb-event"><strong>'+safe(x.event_type||'事件')+'</strong> · '+safe(stamp(x.created_at))+
          '<pre class="sb-json"></pre></div>').join('')||'<p class="muted">暂无事件。</p>')+
        '</div><div><h4>任务提交（'+sub.length+'）</h4>'+
        (sub.map(x=>'<div class="sb-event"><strong>第 '+safe(x.attempt_no||'—')+' 次提交</strong> · '+safe(x.review_status||'未审核')+
          '<pre class="sb-json"></pre></div>').join('')||'<p class="muted">暂无提交。</p>')+'</div></div>';
      const blocks=slot.querySelectorAll('pre.sb-json');
      [...ev.map(x=>x.detail),...sub.map(x=>({result:x.result,note:x.note,submitted_at:x.submitted_at}))].forEach((obj,i)=>{
        if(blocks[i])blocks[i].textContent=lines(obj).slice(0,2400)
      });
    }catch(err){slot.textContent='读取失败（未进行任何修改）：'+(err&&err.message||'请稍后重试')}
    finally{btn.disabled=false}
  }

  async function loadApproved(){
    const host=document.getElementById('sb-approved');if(!host||brain.loading)return;
    brain.loading=true;host.textContent='正在读取授权知识…';
    try{
      const fields='id,category,title,content,version,status,reviewed_at,effective_at,expires_at,source_type,source_ref';
      const rows=await get('/rest/v1/ai_p0_memories?select='+fields+'&status=eq.APPROVED&order=title.asc&limit=200');
      if(!Array.isArray(rows))throw Error('知识接口未返回列表');
      brain.approved=rows.filter(approvedValid);brain.loaded=true;paintApproved();
    }catch(err){brain.approved=[];brain.loaded=false;host.textContent='当前账号暂无法查询知识：'+(err&&err.message||'权限受限')}
    finally{brain.loading=false}
  }

  function paintApproved(){
    const host=document.getElementById('sb-approved');if(!host)return;
    const term=(document.getElementById('sb-search')?.value||'').trim().toLowerCase();
    const rows=brain.approved.filter(x=>!term||String(x.title+' '+lines(x.content)).toLowerCase().includes(term));
    if(!rows.length){host.innerHTML='<p class="muted sb-empty">当前没有可阅读的已批准知识。草稿不会展示给普通员工。</p>';return}
    host.innerHTML=rows.map(x=>'<div class="sb-entry"><strong>'+safe(x.title)+'</strong> · '+
      safe(x.category||'知识')+' · V'+safe(x.version)+
      '<button class="btn gray" type="button" data-doc="'+safe(x.id)+'">阅读</button></div>').join('');
    host.querySelectorAll('button[data-doc]').forEach(btn=>btn.onclick=()=>{
      const doc=brain.approved.find(x=>x.id===btn.dataset.doc&&approvedValid(x));if(doc)openDetail(doc,false)
    });
  }

  async function loadDrafts(){
    if(!manager())return;
    const host=document.getElementById('sb-drafts');if(!host)return;
    host.textContent='正在读取草稿…';
    try{
      const fields='id,scope,memory_key,version,category,title,content,source_type,source_ref,status,created_at';
      const rows=await get('/rest/v1/ai_p0_memories?select='+fields+'&status=eq.DRAFT&order=created_at.desc&limit=100');
      if(!Array.isArray(rows))throw Error('草稿接口未返回列表');
      brain.drafts=rows.filter(x=>x.status==='DRAFT');
      host.innerHTML=brain.drafts.map(x=>'<div class="sb-entry"><strong>'+safe(x.title)+'</strong> · V'+safe(x.version)+
        ' · '+safe(x.scope||'')+'<button type="button" class="btn gray" data-draft="'+safe(x.id)+'">预览来源与风险</button></div>').join('')||
        '<p class="muted">当前暂无待审核草稿。</p>';
      host.querySelectorAll('button[data-draft]').forEach(btn=>btn.onclick=()=>{
        const doc=brain.drafts.find(x=>x.id===btn.dataset.draft);
        if(doc&&manager())openDetail(doc,true)
      });
    }catch(err){host.textContent='草稿只读查询失败：'+(err&&err.message||'权限受限')}
  }

  function openDetail(doc,isDraft){
    if(isDraft&&!manager())return;
    const host=isDraft?document.getElementById('sb-draft-detail'):document.getElementById('modalRoot');
    if(!host)return;
    const container=isDraft?'sb-review-detail':'modal-backdrop';
    const warnings=[];
    if(isDraft){
      if(!doc.source_type||!doc.source_ref)warnings.push('来源信息不完整');
      if(!doc.content||lines(doc.content)==='{}')warnings.push('内容为空');
      warnings.push('尚未完成正式审核，禁止作为生效公司规则使用');
    }
    host.innerHTML=isDraft?
      '<div class="'+container+'"><h4>草稿原文及审核证据 · 只读</h4><p>标题：'+safe(doc.title)+' · 版本 V'+safe(doc.version)+'</p>'+
      '<p>来源：'+safe(doc.source_type||'未填写')+' / '+safe(doc.source_ref||'未填写')+'</p>'+
      '<p class="sb-warn">风险检查：'+safe(warnings.join('；'))+'</p><pre class="sb-json sb-body"></pre>'+
      '<div id="sb-audit-evidence" aria-live="polite">尚未读取审计历史。</div></div>':
      '<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>'+safe(doc.title)+
      '</h3><button type="button" class="modal-close" id="sb-close-detail" aria-label="关闭">×</button></div>'+
      '<div class="modal-body"><p>分类：'+safe(doc.category||'')+' · V'+safe(doc.version)+'</p>'+
      '<pre class="sb-json sb-body"></pre><p>来源：'+safe(doc.source_type||'未记录')+' / '+safe(doc.source_ref||'未记录')+'</p></div></div>';
    host.querySelector('.sb-body').textContent=lines(doc.content).slice(0,20000);
    if(!isDraft){host.classList.add('sb-modal-backdrop');host.querySelector('#sb-close-detail').onclick=()=>{host.innerHTML='';host.classList.remove('sb-modal-backdrop')};return}
    loadAudit(doc.id);
  }

  async function loadAudit(id){
    const host=document.getElementById('sb-audit-evidence');
    if(!host||!manager()||!uuid.test(id))return;
    host.textContent='正在读取审核历史…';
    try{
      const rows=await get('/rest/v1/ai_p0_audit_log?select=id,event_type,actor_type,details,created_at&memory_id=eq.'+encodeURIComponent(id)+'&order=created_at.desc&limit=30');
      if(!Array.isArray(rows))throw Error('审计接口未返回列表');
      host.innerHTML='<h4>历史审计（'+rows.length+'）</h4>'+(rows.map(x=>
        '<div class="sb-event"><strong>'+safe(x.event_type)+'</strong> · '+safe(stamp(x.created_at))+
        '<pre class="sb-json"></pre></div>').join('')||'<p class="muted">尚无审计记录。</p>');
      host.querySelectorAll('pre').forEach((pre,i)=>pre.textContent=lines(rows[i].details).slice(0,2400));
    }catch(err){host.textContent='审计读取失败：'+(err&&err.message||'权限受限')}
  }
})();
