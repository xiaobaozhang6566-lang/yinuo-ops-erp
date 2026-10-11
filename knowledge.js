/* AI Second Brain V1: read-only knowledge center, fail-closed on permissions. */
(function(){
  const REVIEW_RELEASE_ENABLED=false; // Explicit release gate; never auto-enable from RPC availability.
  const KB={query:'',category:'',items:[],drafts:[],selected:null,error:'',busy:false,adminBusy:false};
  const labels={POLICY:'公司规则',SOP:'岗位 SOP',PRODUCT:'商品知识',LESSON:'经验案例',DECISION:'经营决策',TEAM:'团队知识'};
  const esc=x=>e(x);
  const previousPage=page;
  page=function(){
    if(S.page==='knowledge')renderShell();
    else previousPage();
  };
  function valid(r){
    const now=Date.now();
    return r.status==='APPROVED'&&Boolean(r.reviewed_at)&&Boolean(r.effective_at)&&Number.isFinite(Date.parse(r.effective_at))&&Date.parse(r.effective_at)<=now&&(!r.expires_at||(Number.isFinite(Date.parse(r.expires_at))&&Date.parse(r.expires_at)>now));
  }
  function renderShell(){
    const host=document.getElementById('c');if(!host)return;
    host.innerHTML='<div class="kb-header"><div><div class="kb-eyebrow">YINUO AI OS · V1</div><h2>企业知识中心</h2><p class="muted">仅展示当前账号有权限阅读的已批准、有效知识。</p></div><span class="pill">管理员草稿审核试点</span></div>'+
    (S.member.role==='manager'?'<div class="panel"><div class="body"><h3>知识管理 · 管理员</h3><p class="muted">新增知识默认保存为草稿，不会自动生效。</p><button class="btn blue" id="kb-new">录入知识草稿</button> <button class="btn gray" id="kb-review">查看待审核草稿</button><div id="kb-admin" aria-live="polite"></div></div></div>':'')+'<div class="panel"><div class="body"><h3>任务执行留痕 · P1</h3><p class="muted">只读展示 ERP 任务事件及提交记录，数据按当前账号权限筛选。</p><button id="kb-task-trace-load" class="btn gray" type="button">查看任务留痕</button><div id="kb-task-trace-results" aria-live="polite"></div></div></div>'+'<div class="panel"><div class="body"><div class="kb-search"><input id="kb-query" class="input" placeholder="输入标题、SOP 或商品关键词" value="'+esc(KB.query)+'"><select id="kb-category" class="input"><option value="">全部分类</option>'+Object.entries(labels).map(([k,v])=>'<option value="'+k+'" '+(KB.category===k?'selected':'')+'>'+v+'</option>').join('')+'</select><button id="kb-search-btn" class="btn blue">搜索</button></div><div class="kb-hint">如看不到知识，可能是尚未批准，或当前账号未获得授权。</div><div id="kb-results" aria-live="polite"></div></div></div>';
    document.getElementById('kb-query').oninput=ev=>KB.query=ev.target.value;
    document.getElementById('kb-query').onkeydown=ev=>{if(ev.key==='Enter')refresh()};
    document.getElementById('kb-category').onchange=ev=>{KB.category=ev.target.value;refresh()};
    document.getElementById('kb-search-btn').onclick=refresh;
    if(S.member.role==='manager'){
      document.getElementById('kb-new').onclick=showCreate;
      document.getElementById('kb-review').onclick=showDrafts;
    }
    const traceBtn=document.getElementById('kb-task-trace-load');if(traceBtn)traceBtn.onclick=showTaskTrace;
    paint();if(!KB.busy)refresh();
  }
  function paint(){
    const el=document.getElementById('kb-results');if(!el)return;
    if(KB.busy){el.innerHTML='<p class="muted">正在加载已授权知识…</p>';return}
    if(KB.error){el.innerHTML='<div class="msg" role="alert">'+esc(KB.error)+'</div>';return}
    let data=KB.items.filter(valid).filter(x=>!KB.category||x.category===KB.category);
    const q=KB.query.trim().toLocaleLowerCase();
    if(q)data=data.filter(x=>(x.title+' '+JSON.stringify(x.content||{})).toLocaleLowerCase().includes(q));
    el.innerHTML='<div class="kb-count">共 '+data.length+' 条有效知识</div>'+(data.length?data.map(x=>
      '<article class="kb-item"><div class="kb-meta"><span class="pill">'+esc(labels[x.category]||x.category)+'</span><span>V'+esc(x.version)+'</span><span>已批准</span></div><h3>'+esc(x.title)+'</h3><div class="kb-preview">'+esc(summary(x.content))+'</div><button class="btn gray" data-kb-id="'+esc(x.id)+'">查看知识</button></article>'
    ).join(''):'<div class="kb-empty">未找到符合条件的有效知识。</div>');
    el.querySelectorAll('[data-kb-id]').forEach(b=>b.onclick=()=>openDetail(b.dataset.kbId));
  }
  function summary(content){
    if(typeof content==='string')return content.slice(0,160);
    if(!content||typeof content!=='object')return '暂无摘要';
    const s=content.summary||content.body||content.description||content.text;
    return (typeof s==='string'?s:JSON.stringify(content)).slice(0,160);
  }
  function openDetail(id){
    const x=KB.items.find(y=>y.id===id&&valid(y));if(!x)return;
    const host=document.getElementById('modalRoot');if(!host)return;
    const display=JSON.stringify(x.content||{},null,2);
    host.innerHTML='<div class="modal-backdrop" id="kb-modal"><div class="modal"><div class="modal-head"><h2>'+esc(x.title)+'</h2><button class="modal-close" id="kb-close" aria-label="关闭">×</button></div><div class="modal-body"><div class="kb-meta">分类：'+esc(labels[x.category]||x.category)+' · 版本 V'+esc(x.version)+' · 已批准</div><pre class="kb-content"></pre><p class="muted">来源：'+esc(x.source_type||'未标注')+' · 来源编号：'+esc(x.source_ref||'无')+'</p></div></div></div>';
    host.querySelector('.kb-content').textContent=detailText(x.content);
    host.querySelector('#kb-close').onclick=()=>host.innerHTML='';
    host.querySelector('#kb-modal').onclick=ev=>{if(ev.target.id==='kb-modal')host.innerHTML=''};
  }
  async function refresh(){
    if(S.page!=='knowledge'||KB.busy)return;
    KB.busy=true;KB.error='';paint();
    try{
      const fields='id,scope,memory_key,version,category,title,content,status,effective_at,expires_at,source_type,source_ref,reviewed_at';
      const rows=await api('/rest/v1/ai_p0_memories?select='+fields+'&status=eq.APPROVED&order=title.asc&limit=300');
      KB.items=Array.isArray(rows)?rows.filter(valid):[];
    }catch(err){
      KB.items=[];KB.error='当前账号暂不能读取正式知识：'+(err?.message||'访问受限')+'。请联系管理员配置知识检索权限。';
    }finally{KB.busy=false;paint()}
  }

  // P1 read-only task evidence explorer: task/event RLS is enforced server-side.
  async function showTaskTrace(){
    const host=document.getElementById('kb-task-trace-results');
    if(!host)return;
    host.textContent='正在读取有权限的任务…';
    try{
      const rows=await api('/rest/v1/ops_tasks?select=id,task_no,title,status,task_date&order=task_date.desc&limit=30');
      if(!Array.isArray(rows)){host.textContent='任务接口未返回列表。';return;}
      host.innerHTML='<p class="muted">仅显示当前账号有权查看的最近 '+rows.length+' 条任务；点击查询事件与提交记录。</p>'+
        (rows.length?rows.map(t=>'<div class="kb-item"><div><strong>任务 #'+esc(t.task_no||'—')+'</strong> · '+esc(t.title||'未命名任务')+' · '+esc(t.status||'')+'</div><button type="button" class="btn gray" data-task-trace-id="'+esc(t.id)+'">查看留痕</button><div class="kb-task-events" aria-live="polite"></div></div>').join(''):'<p class="muted">暂无可读取任务。</p>');
      host.querySelectorAll('[data-task-trace-id]').forEach(btn=>btn.onclick=async()=>{
        const slot=btn.closest('.kb-item').querySelector('.kb-task-events');
        btn.disabled=true;slot.textContent='正在读取任务留痕…';
        try{
          const id=encodeURIComponent(btn.dataset.taskTraceId);
          const [events,submissions]=await Promise.all([
            api('/rest/v1/ops_task_events?select=id,event_type,detail,created_at&task_id=eq.'+id+'&order=created_at.desc&limit=40'),
            api('/rest/v1/ops_task_submissions?select=id,attempt_no,result,note,review_status,submitted_at&task_id=eq.'+id+'&order=submitted_at.desc&limit=20')
          ]);
          const ev=Array.isArray(events)?events:[],sub=Array.isArray(submissions)?submissions:[];
          slot.innerHTML='<h4>事件（'+ev.length+'）</h4>'+(ev.map(x=>'<div class="kb-audit-event"><strong>'+esc(x.event_type||'任务事件')+'</strong> · '+esc(x.created_at||'')+'<pre class="kb-content"></pre></div>').join('')||'<p class="muted">暂无事件。</p>')+
            '<h4>提交（'+sub.length+'）</h4>'+(sub.map(x=>'<div class="kb-audit-event"><strong>第 '+esc(x.attempt_no)+' 次提交</strong> · '+esc(x.review_status||'待审核')+' · '+esc(x.submitted_at||'')+'<p>'+esc(x.result||'')+'</p><p>'+esc(x.note||'')+'</p></div>').join('')||'<p class="muted">暂无提交。</p>');
          slot.querySelectorAll('.kb-audit-event pre').forEach((el,i)=>{el.textContent=JSON.stringify(ev[i].detail||{},null,2)});
          if(S.member?.role==='manager'){
            const draftButton=document.createElement('button');
            draftButton.type='button';draftButton.className='btn gray';
            draftButton.textContent='整理为经验案例草稿';
            slot.appendChild(draftButton);
            draftButton.onclick=()=>{
              const last=sub[0]||{};
              const body=[
                '关联任务：#'+(rows.find(t=>t.id===btn.dataset.taskTraceId)?.task_no||''),
                '任务标题：'+(rows.find(t=>t.id===btn.dataset.taskTraceId)?.title||''),
                '问题描述：[请填写真实问题与影响]',
                '执行结果：'+String(last.result||'待补充'),
                '处理过程：'+ev.slice(0,12).map(x=>x.event_type+' '+(x.created_at||'')).join('；'),
                '复盘原因：[请填写已核验的根因]',
                '防复发措施：[请填写可执行的措施]',
                '证据链接：[请补充]',
                '说明：此文本为任务记录辅助整理，须核对后保存为草稿，未经审批不得生效。'
              ].join('\n');
              showCreate({category:'LESSON',scope:'COMPANY',key:'TASK-CASE-'+String(rows.find(t=>t.id===btn.dataset.taskTraceId)?.task_no||'').trim(),title:'任务案例：'+String(rows.find(t=>t.id===btn.dataset.taskTraceId)?.title||''),body,source:'TASK:'+btn.dataset.taskTraceId});
            };
          }
        }catch(err){slot.textContent='留痕读取失败：'+(err?.message||'当前账号无权访问');}
        finally{btn.disabled=false;}
      });
    }catch(err){host.textContent='任务列表读取失败：'+(err?.message||'权限不足')}
  }
  function showCreate(seed){
    const host=document.getElementById('kb-admin');if(!host||S.member.role!=='manager')return;
    host.innerHTML='<form id="kb-create-form" class="kb-form"><div class="form-grid"><div class="field"><label>知识编号（同编号生成新版本）</label><input class="input" name="key" required minlength="3" maxlength="160" placeholder="例如 VISUAL-HERO-SOP"></div><div class="field"><label>分类</label><select class="input" name="category">'+Object.entries(labels).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></div><div class="field"><label>适用范围</label><select class="input" name="scope"><option value="COMPANY">公司</option><option value="TEAM">团队</option><option value="STORE">店铺</option><option value="PRODUCT">商品</option></select></div><div class="field"><label>标题</label><input class="input" name="title" required minlength="2" maxlength="250"></div><div class="field wide"><label>知识正文</label><textarea class="input" name="body" required maxlength="20000" rows="8"></textarea></div><div class="field wide"><label>来源说明（可选）</label><input class="input" name="source" maxlength="300" placeholder="原始文件名、任务编号等"></div></div><div id="kb-form-msg" role="alert"></div><button class="btn blue" type="submit">保存为待审核草稿</button></form>';
    if(seed){
      const form=host.querySelector('form');
      form.dataset.caseSource=seed.source?.startsWith('TASK:')?'TASK_CASE':'';
      for(const [key,value] of Object.entries(seed)){
        const field=form.elements.namedItem(key);
        if(field)field.value=String(value??'');
      }
      host.scrollIntoView({behavior:'smooth',block:'start'});
    }
    host.querySelector('form').onsubmit=async ev=>{
      ev.preventDefault();if(KB.adminBusy)return;
      const form=ev.currentTarget,btn=form.querySelector('button[type="submit"]'),msg=document.getElementById('kb-form-msg');
      const fd=new FormData(form),body=String(fd.get('body')||'').trim(),title=String(fd.get('title')||'').trim(),key=String(fd.get('key')||'').trim();
      if(!body||title.length<2||key.length<3){msg.textContent='请完整填写知识编号、标题和内容。';return}
      if(form.dataset.caseSource==='TASK_CASE'){
        const required=['问题描述','复盘原因','防复发措施','证据链接'];
        const lines=body.split(/\r?\n/);
        const missing=required.filter(label=>{
          const line=lines.find(x=>x.startsWith(label+'：'));
          const value=line?.slice((label+'：').length).trim()||'';
          return !value||/^\[[^\]]*\]$/.test(value)||/\[(请填写|请补充)[^\]]*\]/.test(value);
        });
        if(missing.length||!/^TASK:[0-9a-f-]{36}$/i.test(String(fd.get('source')||'').trim())){
          msg.textContent='案例缺少有效的'+(missing.join('、')||'关联任务来源')+'；请补齐真实证据并核对任务编号后保存。';return;
        }
      }
      KB.adminBusy=true;btn.disabled=true;msg.textContent='正在保存草稿…';
      try{
        await api('/rest/v1/rpc/ai_p0_save_memory',{method:'POST',body:JSON.stringify({p_scope:fd.get('scope'),p_key:key,p_category:fd.get('category'),p_title:title,p_content:{body},p_source_type:form.dataset.caseSource==='TASK_CASE'?'TASK_CASE':'MANUAL',p_source_ref:String(fd.get('source')||'').trim()||null})});
        msg.textContent='草稿保存成功；尚未审核生效。';form.reset();
      }catch(err){msg.textContent='保存失败：'+(err?.message||'请检查权限')}
      finally{KB.adminBusy=false;btn.disabled=false}
    };
  }
  function detailText(data){
    if(!data||typeof data!=='object')return String(data||'暂无内容');
    const names={summary:'核心规则',body:'知识正文',description:'说明',imported_date:'导入日期',review_required:'需要审核'};
    return Object.entries(data).map(([k,v])=>(names[k]||k)+'：'+(typeof v==='boolean'?(v?'是':'否'):typeof v==='object'?JSON.stringify(v):String(v))).join('\n\n');
  }
  async function showVersionHistory(item,card){
    const host=card.querySelector('.kb-version-history');if(!host)return;
    host.textContent='正在读取版本历史…';
    try{
      const filters='&scope=eq.'+encodeURIComponent(item.scope)+'&memory_key=eq.'+encodeURIComponent(item.memory_key);
      const rows=await api('/rest/v1/ai_p0_memories?select=id,title,version,status,created_at,reviewed_at,effective_at&order=version.desc&limit=50'+filters);
      if(!Array.isArray(rows)||!rows.length){host.textContent='暂无版本记录。';return}
      host.innerHTML='<h4>版本历史（'+rows.length+'）</h4>'+rows.map(v=>'<div class="kb-audit-event"><strong>V'+esc(v.version)+'</strong> · '+esc(({APPROVED:'已批准',DRAFT:'草稿',SUPERSEDED:'已被替代',REJECTED:'已拒绝'}[v.status]||v.status))+'<p>创建时间：'+esc(v.created_at?new Date(v.created_at).toLocaleString('zh-CN'):'未记录')+'</p></div>').join('');
    }catch(err){host.textContent='版本历史暂不可读取：'+(err?.message||'权限不足')}
  }
  async function showAuditHistory(id,card){
    const host=card.querySelector('.kb-audit-history');if(!host)return;
    host.textContent='正在读取审核历史…';
    try{
      const records=await api('/rest/v1/ai_p0_audit_log?select=id,actor_user_id,actor_type,event_type,details,created_at&memory_id=eq.'+encodeURIComponent(id)+'&order=created_at.desc&limit=50');
      if(!Array.isArray(records)||!records.length){host.textContent='暂无审核历史记录。';return}
      host.innerHTML='<h4>审核历史（'+records.length+'）</h4>'+records.map(x=>'<div class="kb-audit-event"><strong>'+esc(({MEMORY_APPROVED:'批准',MEMORY_REJECTED:'拒绝'}[x.event_type]||x.event_type))+'</strong> · '+esc(x.created_at?new Date(x.created_at).toLocaleString('zh-CN'):'时间未知')+'<p>审核人编号：'+esc(x.actor_user_id||'未记录')+'</p><p>审核意见：'+esc(x.details?.review_reason||'旧记录未填写意见')+'</p></div>').join('');
    }catch(err){host.textContent='审核历史暂不可读取（可能缺少数据库只读授权）：'+(err?.message||'权限限制')}
  }
  // This implementation is intentionally unreachable until a separately verified release.
  // Keep it detached from user controls while the production RPC is absent.
  async function submitReviewedKnowledgeAfterRelease(item,approve,reason){
    if(!REVIEW_RELEASE_ENABLED)throw new Error('正式审批尚未通过上线验收');
    if(KB.adminBusy)throw new Error('已有审核操作正在执行');
    if(S.member?.role!=='manager')throw new Error('仅管理员可审核');
    if(!item||item.status!=='DRAFT')throw new Error('知识草稿状态已变更');
    if(typeof reason!=='string'||reason.trim().length<10||reason.length>2000)throw new Error('审核意见需填写 10-2000 字');
    KB.adminBusy=true;
    try{
    const result=await api('/rest/v1/rpc/kb_review_memory_with_reason',{
      method:'POST',body:JSON.stringify({
        p_memory_id:item.id,p_approve:Boolean(approve),p_reason:reason.trim()
      })
    });
    return result;
    }finally{KB.adminBusy=false}
  }
  // P2 source-grounded pre-review excerpt; no AI judgment, approvals, or writes.
  function reviewEvidencePreview(item){
    const content=item?.content||{};
    const raw=typeof content==='string'?content:typeof content?.body==='string'?content.body:typeof content?.summary==='string'?content.summary:'';
    const lines=raw.split(/\r?\n/);
    const evidence=lines.map((text,index)=>({line:index+1,text:text.trim()})).filter(x=>x.text);
    const excerpts=evidence.slice(0,5).map(x=>'第 '+x.line+' 行：'+x.text.slice(0,220)+(x.text.length>220?'…（本行已截断）':''));
    const sourceType=String(item?.source_type||'').trim(),sourceRef=String(item?.source_ref||'').trim();
    const missingSource=!sourceType||!sourceRef;
    return ['审核前原文摘录（非 AI 结论，未经核验）',
      '编号：'+String(item?.memory_key||'未提供')+' · V'+String(item?.version||'?'),
      '范围：'+String(item?.scope||'未提供')+' · 状态：'+String(item?.status||'未知'),
      '来源：'+(sourceType||'未提供')+' / '+(sourceRef||'未提供'),
      ...(missingSource?['警示：缺少来源类型或来源编号，必须先补充来源证据。']:[]),
      '原文行数：'+evidence.length+'，当前展示前 '+excerpts.length+' 行。',
      '原文：',...(excerpts.length?excerpts:['（正文为空，需人工补齐）']),
      ...(evidence.length>5?['提示：已省略 '+(evidence.length-5)+' 行，审核前必须阅读完整原文。']:[]),
      '人工核对：来源真实性、适用范围、生效时间、旧版本冲突。',
      '不得据此直接批准或发布 SOP。'].join('\n');
  }
  async function showDrafts(){
    const host=document.getElementById('kb-admin');if(!host||S.member.role!=='manager'||KB.adminBusy)return;
    KB.adminBusy=true;host.textContent='正在加载待审核草稿…';
    try{
      const rows=await api('/rest/v1/ai_p0_memories?select=id,title,category,scope,memory_key,version,content,created_at,status&status=eq.DRAFT&order=created_at.desc&limit=100');
      KB.drafts=Array.isArray(rows)?rows:[];
      host.innerHTML='<h4>待审核草稿（'+KB.drafts.length+'）</h4><p class="muted">批准会替换同编号当前已批准版本，请先核对内容和适用范围。</p>'+
        (KB.drafts.length?KB.drafts.map(x=>'<div class="kb-item"><h3>'+esc(x.title)+'</h3><div class="kb-meta">'+esc(labels[x.category]||x.category)+' · '+esc(x.scope)+' · '+esc(x.memory_key)+' · V'+esc(x.version)+'</div><pre class="kb-content"></pre><button class="btn gray" disabled title="审核接口升级后开放">审核通过（待开放）</button> <button class="btn gray" disabled title="审核接口升级后开放">退回草稿（待开放）</button></div>').join(''):'<p class="muted">当前没有待审核草稿。</p>');
      host.querySelectorAll('.kb-item').forEach((el,i)=>{const v=KB.drafts[i].content||{};el.querySelector('pre').textContent=Object.entries(v).map(([k,val])=>({summary:'核心规则',body:'正文',imported_date:'导入日期',review_required:'需要审核'}[k]||k)+'：'+(typeof val==='boolean'?(val?'是':'否'):typeof val==='object'?JSON.stringify(val):String(val))).join('\n\n')});
      host.querySelectorAll('.kb-item').forEach((card,i)=>{
        const item=KB.drafts[i],form=document.createElement('div');
        form.className='kb-review-form';
        form.innerHTML='<label class="kb-review-label">审核意见（至少 10 字）</label><div class="kb-char-count">已输入 0 字，还需 10 字</div><textarea class="input" maxlength="2000" rows="3" placeholder="说明规则依据、核对结果和批准或退回原因"></textarea><div class="kb-review-actions"><button type="button" class="btn gray" data-intent="approve">预览批准确认</button><button type="button" class="btn gray" data-intent="reject">预览退回确认</button></div><div class="kb-review-feedback" aria-live="polite"></div>';
        const reviewNote=document.createElement('p');
        reviewNote.className='kb-hint';
        reviewNote.textContent='正式审批尚未启用；以下操作仅预览，不会写入数据库。';
        card.appendChild(reviewNote);
        const details=document.createElement('div');
        details.className='kb-detail-panel';
        details.innerHTML='<h4>知识详情</h4><p>适用范围：'+esc(item.scope)+' · 分类：'+esc(labels[item.category]||item.category)+'</p><p>知识编号：'+esc(item.memory_key)+' · 版本：V'+esc(item.version)+'</p><button type="button" class="btn gray kb-audit-toggle">查看审核历史</button> <button type="button" class="btn gray kb-version-toggle">查看版本历史</button><div class="kb-audit-history" aria-live="polite"></div><div class="kb-version-history" aria-live="polite"></div>';
        card.appendChild(details);
        details.querySelector('.kb-audit-toggle').onclick=()=>showAuditHistory(item.id,details);
        details.querySelector('.kb-version-toggle').onclick=()=>showVersionHistory(item,details);
        card.appendChild(form);
        const evidenceButton=document.createElement('button');
        evidenceButton.type='button';evidenceButton.className='btn gray';
        evidenceButton.textContent='生成审核前原文摘录（只读）';
        const evidenceOutput=document.createElement('pre');evidenceOutput.className='kb-content';
        evidenceButton.onclick=()=>{evidenceOutput.textContent=reviewEvidencePreview(item);};
        card.appendChild(evidenceButton);card.appendChild(evidenceOutput);
        const field=form.querySelector('textarea'),counter=form.querySelector('.kb-char-count');
        field.addEventListener('input',()=>{const n=field.value.trim().length;counter.textContent=n>=10?'已输入 '+n+' 字，可进行模拟预览':'已输入 '+n+' 字，还需 '+(10-n)+' 字';form.querySelector('.kb-review-feedback').textContent='';});
        form.querySelectorAll('[data-intent]').forEach(btn=>btn.onclick=()=>{
          const reason=form.querySelector('textarea').value.trim(),feedback=form.querySelector('.kb-review-feedback');
          if(reason.length<10){feedback.textContent='无法预览：当前只有 '+reason.length+' 字，请再输入至少 '+(10-reason.length)+' 字。';feedback.classList.add('kb-review-error');return}feedback.classList.remove('kb-review-error');
          feedback.innerHTML='<strong>操作预览：'+(btn.dataset.intent==='approve'?'批准':'退回')+'</strong><p>知识：'+esc(item.title)+' · V'+esc(item.version)+'</p><p>审核意见：'+esc(reason)+'</p><p class="muted">当前为模拟确认，未提交数据库，知识状态不会改变。</p>';
        });
      });
      // Approval disabled until reason-bearing RPC has passed integration and permission tests.
    }catch(err){host.textContent='读取失败：'+(err?.message||'请检查管理员权限')}
    finally{KB.adminBusy=false}
  }

})();
