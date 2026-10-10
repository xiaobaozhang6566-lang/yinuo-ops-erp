/* AI Second Brain V1: read-only knowledge center, fail-closed on permissions. */
(function(){
  const KB={query:'',category:'',items:[],selected:null,error:'',busy:false};
  const labels={POLICY:'公司规则',SOP:'岗位 SOP',PRODUCT:'商品知识',LESSON:'经验案例',DECISION:'经营决策',TEAM:'团队知识'};
  const esc=x=>e(x);
  const oldDraw=draw;
  draw=function(){
    oldDraw();
    if(!S.member)return;
    const nav=document.querySelector('.top .nav');
    if(!nav)return;
    const b=document.createElement('button');
    b.textContent='AI 知识中心';b.dataset.kbNav='1';
    if(S.page==='knowledge')b.className='on';
    b.onclick=()=>{S.page='knowledge';draw()};
    nav.appendChild(b);
    if(S.page==='knowledge')renderShell();
  };
  function valid(r){
    const now=Date.now();
    return r.status==='APPROVED'&&(!r.effective_at||new Date(r.effective_at).getTime()<=now)&&(!r.expires_at||new Date(r.expires_at).getTime()>now);
  }
  function renderShell(){
    const host=document.getElementById('c');if(!host)return;
    host.innerHTML='<div class="kb-header"><div><div class="kb-eyebrow">YINUO AI OS · V1</div><h2>企业知识中心</h2><p class="muted">仅展示当前账号有权限阅读的已批准、有效知识。</p></div><span class="pill">只读试点</span></div>'+
    '<div class="panel"><div class="body"><div class="kb-search"><input id="kb-query" class="input" placeholder="输入标题、SOP 或商品关键词" value="'+esc(KB.query)+'"><select id="kb-category" class="input"><option value="">全部分类</option>'+Object.entries(labels).map(([k,v])=>'<option value="'+k+'" '+(KB.category===k?'selected':'')+'>'+v+'</option>').join('')+'</select><button id="kb-search-btn" class="btn blue">搜索</button></div><div class="kb-hint">如看不到知识，可能是尚未批准，或当前账号未获得授权。</div><div id="kb-results" aria-live="polite"></div></div></div>';
    document.getElementById('kb-query').oninput=ev=>KB.query=ev.target.value;
    document.getElementById('kb-query').onkeydown=ev=>{if(ev.key==='Enter')refresh()};
    document.getElementById('kb-category').onchange=ev=>{KB.category=ev.target.value;refresh()};
    document.getElementById('kb-search-btn').onclick=refresh;
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
  /* No write endpoints; knowledge approval/write actions require separate audited server APIs. */
})();
