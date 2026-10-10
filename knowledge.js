/* AI Second Brain V1: read-only knowledge center, fail-closed on permissions. */
(function(){
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
    return r.status==='APPROVED'&&(!r.effective_at||new Date(r.effective_at).getTime()<=now)&&(!r.expires_at||new Date(r.expires_at).getTime()>now);
  }
  function renderShell(){
    const host=document.getElementById('c');if(!host)return;
    host.innerHTML='<div class="kb-header"><div><div class="kb-eyebrow">YINUO AI OS · V1</div><h2>企业知识中心</h2><p class="muted">仅展示当前账号有权限阅读的已批准、有效知识。</p></div><span class="pill">管理员草稿审核试点</span></div>'+
    (S.member.role==='manager'?'<div class="panel"><div class="body"><h3>知识管理 · 管理员</h3><p class="muted">新增知识默认保存为草稿，不会自动生效。</p><button class="btn blue" id="kb-new">录入知识草稿</button> <button class="btn gray" id="kb-review">查看待审核草稿</button><div id="kb-admin" aria-live="polite"></div></div></div>':'')+'<div class="panel"><div class="body"><div class="kb-search"><input id="kb-query" class="input" placeholder="输入标题、SOP 或商品关键词" value="'+esc(KB.query)+'"><select id="kb-category" class="input"><option value="">全部分类</option>'+Object.entries(labels).map(([k,v])=>'<option value="'+k+'" '+(KB.category===k?'selected':'')+'>'+v+'</option>').join('')+'</select><button id="kb-search-btn" class="btn blue">搜索</button></div><div class="kb-hint">如看不到知识，可能是尚未批准，或当前账号未获得授权。</div><div id="kb-results" aria-live="polite"></div></div></div>';
    document.getElementById('kb-query').oninput=ev=>KB.query=ev.target.value;
    document.getElementById('kb-query').onkeydown=ev=>{if(ev.key==='Enter')refresh()};
    document.getElementById('kb-category').onchange=ev=>{KB.category=ev.target.value;refresh()};
    document.getElementById('kb-search-btn').onclick=refresh;
    if(S.member.role==='manager'){
      document.getElementById('kb-new').onclick=showCreate;
      document.getElementById('kb-review').onclick=showDrafts;
    }
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
    host.querySelector('.kb-content').textContent=display;
    host.querySelector('#kb-close').onclick=()=>host.innerHTML='';
    host.querySelector('#kb-modal').onclick=ev=>{if(ev.target.id==='kb-modal')host.innerHTML=''};
  }
  async function refresh(){
    if(S.page!=='knowledge'||KB.busy)return;
    KB.busy=true;KB.error='';paint();
    try{
      const fields='id,scope,memory_key,version,category,title,content,status,effective_at,expires_at,source_type,source_ref';
      const rows=await api('/rest/v1/ai_p0_memories?select='+fields+'&status=eq.APPROVED&order=title.asc&limit=300');
      KB.items=Array.isArray(rows)?rows.filter(valid):[];
    }catch(err){
      KB.items=[];KB.error='当前账号暂不能读取正式知识：'+(err?.message||'访问受限')+'。请联系管理员配置知识检索权限。';
    }finally{KB.busy=false;paint()}
  }

  function showCreate(){
    const host=document.getElementById('kb-admin');if(!host||S.member.role!=='manager')return;
    host.innerHTML='<form id="kb-create-form" class="kb-form"><div class="form-grid"><div class="field"><label>知识编号（同编号生成新版本）</label><input class="input" name="key" required minlength="3" maxlength="160" placeholder="例如 VISUAL-HERO-SOP"></div><div class="field"><label>分类</label><select class="input" name="category">'+Object.entries(labels).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></div><div class="field"><label>适用范围</label><select class="input" name="scope"><option value="COMPANY">公司</option><option value="TEAM">团队</option><option value="STORE">店铺</option><option value="PRODUCT">商品</option></select></div><div class="field"><label>标题</label><input class="input" name="title" required minlength="2" maxlength="250"></div><div class="field wide"><label>知识正文</label><textarea class="input" name="body" required maxlength="20000" rows="8"></textarea></div><div class="field wide"><label>来源说明（可选）</label><input class="input" name="source" maxlength="300" placeholder="原始文件名、任务编号等"></div></div><div id="kb-form-msg" role="alert"></div><button class="btn blue" type="submit">保存为待审核草稿</button></form>';
    host.querySelector('form').onsubmit=async ev=>{
      ev.preventDefault();if(KB.adminBusy)return;
      const form=ev.currentTarget,btn=form.querySelector('button[type="submit"]'),msg=document.getElementById('kb-form-msg');
      const fd=new FormData(form),body=String(fd.get('body')||'').trim(),title=String(fd.get('title')||'').trim(),key=String(fd.get('key')||'').trim();
      if(!body||title.length<2||key.length<3){msg.textContent='请完整填写知识编号、标题和内容。';return}
      KB.adminBusy=true;btn.disabled=true;msg.textContent='正在保存草稿…';
      try{
        await api('/rest/v1/rpc/ai_p0_save_memory',{method:'POST',body:JSON.stringify({p_scope:fd.get('scope'),p_key:key,p_category:fd.get('category'),p_title:title,p_content:{body},p_source_type:'MANUAL',p_source_ref:String(fd.get('source')||'').trim()||null})});
        msg.textContent='草稿保存成功；尚未审核生效。';form.reset();
      }catch(err){msg.textContent='保存失败：'+(err?.message||'请检查权限')}
      finally{KB.adminBusy=false;btn.disabled=false}
    };
  }
  async function showDrafts(){
    const host=document.getElementById('kb-admin');if(!host||S.member.role!=='manager'||KB.adminBusy)return;
    KB.adminBusy=true;host.textContent='正在加载待审核草稿…';
    try{
      const rows=await api('/rest/v1/ai_p0_memories?select=id,title,category,scope,memory_key,version,content,created_at,status&status=eq.DRAFT&order=created_at.desc&limit=100');
      KB.drafts=Array.isArray(rows)?rows:[];
      host.innerHTML='<h4>待审核草稿（'+KB.drafts.length+'）</h4><p class="muted">批准会替换同编号当前已批准版本，请先核对内容和适用范围。</p>'+
        (KB.drafts.length?KB.drafts.map(x=>'<div class="kb-item"><h3>'+esc(x.title)+'</h3><div class="kb-meta">'+esc(labels[x.category]||x.category)+' · '+esc(x.scope)+' · '+esc(x.memory_key)+' · V'+esc(x.version)+'</div><pre class="kb-content"></pre><button class="btn gray" disabled title="审核接口升级后开放">审核通过（待开放）</button> <button class="btn gray" disabled title="审核接口升级后开放">退回草稿（待开放）</button></div>').join(''):'<p class="muted">当前没有待审核草稿。</p>');
      host.querySelectorAll('.kb-item').forEach((el,i)=>{const v=KB.drafts[i].content||{};el.querySelector('pre').textContent=Object.entries(v).map(([k,val])=>({summary:'核心规则',body:'正文',imported_date:'导入日期',review_required:'需要审核'}[k]||k)+'：'+(typeof val==='object'?JSON.stringify(val):String(val))).join('\n\n')});
      host.querySelectorAll('.kb-item').forEach((card,i)=>{
        const item=KB.drafts[i],form=document.createElement('div');
        form.className='kb-review-form';
        form.innerHTML='<label class="kb-review-label">审核意见（至少 10 字）</label><textarea class="input" maxlength="2000" rows="3" placeholder="说明规则依据、核对结果和批准或退回原因"></textarea><div class="kb-review-actions"><button type="button" class="btn gray" data-intent="approve">预览批准确认</button><button type="button" class="btn gray" data-intent="reject">预览退回确认</button></div><div class="kb-review-feedback" aria-live="polite"></div>';
        card.appendChild(form);
        form.querySelectorAll('[data-intent]').forEach(btn=>btn.onclick=()=>{
          const reason=form.querySelector('textarea').value.trim(),feedback=form.querySelector('.kb-review-feedback');
          if(reason.length<10){feedback.textContent='审核意见至少 10 个字符。';return}
          feedback.innerHTML='<strong>操作预览：'+(btn.dataset.intent==='approve'?'批准':'退回')+'</strong><p>知识：'+esc(item.title)+' · V'+esc(item.version)+'</p><p>审核意见：'+esc(reason)+'</p><p class="muted">当前为模拟确认，未提交数据库，知识状态不会改变。</p>';
        });
      });
      // Approval disabled until reason-bearing RPC has passed integration and permission tests.
    }catch(err){host.textContent='读取失败：'+(err?.message||'请检查管理员权限')}
    finally{KB.adminBusy=false}
  }

})();
