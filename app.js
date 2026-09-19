const U='https://iscadepgzegrvcqzosso.supabase.co';
const K='sb_publishable_9wdwV4dxsojsa89HV7fbnA_yh1MZTs2';
const S={session:null,user:null,member:null,members:[],stores:[],tasks:[],page:'home'};
const $=s=>document.querySelector(s);
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let refreshPromise=null;
function hs(auth=1){const h={apikey:K,'Content-Type':'application/json'};if(auth&&S.session?.access_token)h.Authorization='Bearer '+S.session.access_token;return h}
function ss(x){S.session=x;x?localStorage.setItem('ynerp',JSON.stringify(x)):localStorage.removeItem('ynerp')}
function errMsg(d){return d?.message||d?.msg||d?.error_description||d?.error||d?.hint||'请求失败'}
function toast(text){const old=$('.toast');if(old)old.remove();const n=document.createElement('div');n.className='toast';n.textContent=text;document.body.appendChild(n);setTimeout(()=>n.remove(),2200)}
async function refreshSession(){if(!S.session?.refresh_token)throw new Error('登录已过期，请重新登录');if(refreshPromise)return refreshPromise;refreshPromise=(async()=>{const r=await fetch(U+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:K,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:S.session.refresh_token})});const t=await r.text();let d=null;if(t){try{d=JSON.parse(t)}catch{d=t}}if(!r.ok||!d?.access_token){ss(null);S.user=null;S.member=null;throw new Error(errMsg(d)||'登录已过期，请重新登录')}ss(d);S.user=d.user||S.user;return d})().finally(()=>{refreshPromise=null});return refreshPromise}
async function api(p,o={},retried=false){const authRequired=o.auth!==0,opts={...o};delete opts.auth;const r=await fetch(U+p,{...opts,headers:{...hs(authRequired),...(opts.headers||{})}});const t=await r.text();let d=null;if(t){try{d=JSON.parse(t)}catch{d=t}}if(!r.ok){const msg=errMsg(d),expired=r.status===401||/jwt\s*expired|token.*expired|invalid.*jwt/i.test(String(msg));if(authRequired&&!retried&&expired&&S.session?.refresh_token){try{await refreshSession();return api(p,o,true)}catch(x){ss(null);S.member=null;auth('login','登录已过期，请重新登录。');throw x}}throw new Error(msg)}return d}
async function login(email,password){const d=await api('/auth/v1/token?grant_type=password',{method:'POST',auth:0,body:JSON.stringify({email,password})});ss(d);S.user=d.user;await boot()}
async function signup(name,email,password){const d=await api('/auth/v1/signup',{method:'POST',auth:0,body:JSON.stringify({email,password,data:{display_name:name}})});if(d.access_token){ss(d);S.user=d.user;await boot()}else auth('login','注册成功，请让管理员在团队页面启用账号后再登录。')}
function auth(mode='login',ok=''){root.innerHTML=`<div class="login"><div class="box"><div class="logo">YN · 亦诺跨境 ERP</div><h2>${mode==='login'?'登录运营任务系统':'创建员工账号'}</h2><p class="muted">${mode==='login'?'运营任务 V1.2':'新员工注册后由管理员启用。'}</p><form id="af">${mode==='signup'?'<div class="field"><label>姓名</label><input class="input" name="name" required></div>':''}<div class="field"><label>邮箱</label><input class="input" type="email" name="email" required></div><div class="field"><label>密码</label><input class="input" type="password" name="password" minlength="6" required></div><button class="btn blue full">${mode==='login'?'登录':'注册'}</button><div id="am">${ok?`<p class="muted">${e(ok)}</p>`:''}</div></form><p class="muted" style="text-align:center">${mode==='login'?'<a id="sw">注册账号</a>':'<a id="sw">返回登录</a>'}</p></div></div>`;af.onsubmit=async x=>{x.preventDefault();const f=new FormData(af);try{mode==='login'?await login(f.get('email'),f.get('password')):await signup(f.get('name'),f.get('email'),f.get('password'))}catch(z){am.innerHTML=`<div class="msg">${e(z.message)}</div>`}};sw.onclick=()=>auth(mode==='login'?'signup':'login')}
async function boot(){if(!S.session){try{S.session=JSON.parse(localStorage.getItem('ynerp'))}catch{}}if(!S.session)return auth();let uid=S.session.user?.id||S.user?.id;if(!uid){try{uid=JSON.parse(atob(S.session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub}catch{return auth()}}try{const m=await api('/rest/v1/ops_members?select=*&user_id=eq.'+uid);S.member=m[0];if(!S.member)return auth('login','账号未初始化，请重新登录');if(S.member.role==='pending'||!S.member.is_active)return pending();await load();draw()}catch(z){if(!S.session)auth('login','登录已过期，请重新登录');else auth('login','暂时无法加载，请重新登录。')}}
async function load(){[S.stores,S.tasks]=await Promise.all([api('/rest/v1/stores?select=id,store_name&is_active=eq.true&order=store_name'),api('/rest/v1/ops_tasks?select=*&order=created_at.desc')]);S.members=S.member.role==='manager'?await api('/rest/v1/rpc/ops_list_members',{method:'POST',body:'{}'}):[S.member]}
function pending(){root.innerHTML=`<div class="login"><div class="box"><h2>账号等待启用</h2><p class="muted">${e(S.member.display_name)}，管理员启用后即可使用。</p><button class="btn gray" onclick="boot()">刷新</button> <button class="btn red" onclick="out()">退出</button></div></div>`}
async function out(){try{await api('/auth/v1/logout',{method:'POST'})}catch{}ss(null);S.member=null;S.user=null;auth()}
function draw(){const manager=S.member.role==='manager',nav=[['home','首页'],['mine','我的任务'],...(manager?[['tasks','任务管理'],['team','团队任务']]:[])];root.innerHTML=`<div class="app"><div class="top"><b>YN · 运营任务 ERP <small style="opacity:.65">V1.2</small></b><div class="nav">${nav.map(n=>`<button data-p="${n[0]}" class="${S.page===n[0]?'on':''}">${n[1]}</button>`).join('')}</div><div>${e(S.member.display_name)} · ${manager?'管理员':'运营'} <button class="btn gray" onclick="out()">退出</button></div></div><div class="wrap" id="c"></div></div>`;document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{S.page=b.dataset.p;draw()});page()}
const sn=id=>S.stores.find(x=>x.id===id)?.store_name||'—';const fmt=x=>x?new Date(x).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'—';const over=t=>t.status!=='已完成'&&t.due_at&&new Date(t.due_at)<new Date();
function tab(ts,ass=1,del=0){if(!ts.length)return '<div class="body muted">暂无任务</div>';return `<div class="scroll"><table class="table"><tr>${ass?'<th>负责人</th>':''}<th>店铺</th><th>任务</th><th>类型</th><th>优先级</th><th>截止</th><th>状态</th><th>结果</th><th>操作</th></tr>${ts.map(t=>`<tr>${ass?`<td><b>${e(t.assignee)}</b></td>`:''}<td>${e(sn(t.store_id))}</td><td>${e(t.title)}${t.spu?`<br><small class="muted">SPU ${e(t.spu)}</small>`:''}</td><td>${e(t.task_type)}</td><td><span class="pill ${t.priority==='紧急'?'urgent':t.priority==='重要'?'important':''}">${e(t.priority)}</span></td><td class="${over(t)?'over':''}">${fmt(t.due_at)}${over(t)?' 超期':''}</td><td><span class="pill ${t.status==='已完成'?'done':t.status==='处理中'?'doing':''}">${e(t.status)}</span></td><td>${e(t.result||'—')}</td><td><button class="btn gray" onclick="editTask('${t.id}')">处理</button>${del?` <button class="btn red" onclick="dropTask('${t.id}')">删</button>`:''}</td></tr>`).join('')}</table></div>`}
function page(){const manager=S.member.role==='manager';if(S.page==='home'){const d=new Date().toLocaleDateString('sv-SE'),ts=S.tasks.filter(t=>t.task_date===d&&(manager||t.assignee_user_id===S.member.user_id)),done=ts.filter(t=>t.status==='已完成').length,od=S.tasks.filter(t=>over(t)&&(manager||t.assignee_user_id===S.member.user_id)).length;c.innerHTML=`<div class="cards"><div class="card">今日任务<div class="num">${ts.length}</div></div><div class="card">待完成<div class="num">${ts.length-done}</div></div><div class="card">已完成<div class="num">${done}</div></div><div class="card">超期<div class="num ${od?'over':''}">${od}</div></div></div><div class="panel"><div class="head"><h3>今日任务</h3>${manager?'<button class="btn blue" onclick="openTaskForm()">+ 新建任务</button>':''}</div>${tab(ts,manager,manager)}</div>`}else if(S.page==='mine'){c.innerHTML=`<div class="panel"><div class="head"><h3>我的任务</h3></div>${tab(S.tasks.filter(t=>t.assignee_user_id===S.member.user_id),0)}</div>`}else if(S.page==='tasks'&&manager){c.innerHTML=`<div class="panel"><div class="head"><h3>全部任务</h3><button class="btn blue" onclick="openTaskForm()">+ 新建任务</button></div>${tab(S.tasks,1,1)}</div>`}else if(S.page==='team'&&manager){const pend=S.members.filter(m=>m.role==='pending'),act=S.members.filter(m=>m.role!=='pending');c.innerHTML=`${pend.length?`<div class="panel"><div class="head"><h3>待启用账号</h3></div><div class="body">${pend.map(m=>`<div class="member"><b>${e(m.display_name)}</b><span class="muted">${e(m.email)}</span><button class="btn blue" onclick="approve('${m.user_id}')">启用为运营</button></div>`).join('')}</div></div>`:''}<div class="panel"><div class="head"><h3>团队概览</h3></div><div class="body">${act.map(m=>{const ts=S.tasks.filter(t=>t.assignee_user_id===m.user_id),dn=ts.filter(t=>t.status==='已完成').length;return `<div class="member"><b>${e(m.display_name)}</b><span>任务 ${ts.length} · 已完成 ${dn}</span><span class="muted">${m.role==='manager'?'管理员':'运营'}</span></div>`}).join('')}</div></div>`}else{S.page='home';draw()}}
function openTaskForm(){const members=S.members.filter(m=>m.role!=='pending'&&m.is_active);const today=new Date().toLocaleDateString('sv-SE');modalRoot.innerHTML=`<div class="modal-backdrop" id="taskBackdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="taskFormTitle"><div class="modal-head"><div><h2 id="taskFormTitle">新建运营任务</h2><div class="muted" style="font-size:13px;margin-top:4px">任务日期：${today}</div></div><button class="modal-close" type="button" onclick="closeTaskForm()">×</button></div><form id="taskForm"><div class="modal-body"><div class="form-grid"><div class="field"><label>负责人 <span class="required">*</span></label><select class="input" name="assignee_user_id" required><option value="">请选择负责人</option>${members.map(m=>`<option value="${e(m.user_id)}">${e(m.display_name)}${m.role==='manager'?'（管理员）':''}</option>`).join('')}</select></div><div class="field"><label>店铺</label><select class="input" name="store_id"><option value="">不指定店铺</option>${S.stores.map(s=>`<option value="${e(s.id)}">${e(s.store_name)}</option>`).join('')}</select></div><div class="field"><label>SPU / 父体</label><input class="input" name="spu" maxlength="100" placeholder="可选，例如 A12345"><div class="helper">涉及具体商品时填写，便于后续按商品追踪。</div></div><div class="field"><label>截止时间</label><input class="input" type="datetime-local" name="due_at"><div class="helper">不填写则任务不设明确截止时间。</div></div><div class="field"><label>任务类型 <span class="required">*</span></label><select class="input" name="task_type" required><option>广告检查</option><option selected>商品检查</option><option>售后检查</option><option>新品跟进</option><option>其他任务</option></select></div><div class="field"><label>优先级 <span class="required">*</span></label><select class="input" name="priority" required><option selected>普通</option><option>重要</option><option>紧急</option></select></div><div class="field wide"><label>任务内容 <span class="required">*</span></label><textarea class="input" name="title" maxlength="500" required placeholder="写清楚：发现什么问题、需要处理什么、预期结果是什么"></textarea><div class="helper">建议包含：问题 → 动作 → 预计什么时候看结果。</div></div><div id="taskFormMsg" class="wide"></div></div></div><div class="modal-actions"><button class="btn gray" type="button" onclick="closeTaskForm()">取消</button><button class="btn blue" id="taskSubmit" type="submit">创建任务</button></div></form></div></div>`;taskBackdrop.addEventListener('click',ev=>{if(ev.target===taskBackdrop)closeTaskForm()});taskForm.onsubmit=submitTaskForm;setTimeout(()=>taskForm.assignee_user_id.focus(),0)}
function closeTaskForm(){modalRoot.innerHTML=''}
async function submitTaskForm(ev){ev.preventDefault();const f=ev.currentTarget,btn=$('#taskSubmit'),msg=$('#taskFormMsg');const due=f.due_at.value?new Date(f.due_at.value).toISOString():null;if(f.due_at.value&&Number.isNaN(new Date(f.due_at.value).getTime())){msg.innerHTML='<div class="msg">截止时间格式不正确。</div>';return}btn.disabled=true;btn.textContent='正在创建...';msg.innerHTML='';try{await api('/rest/v1/rpc/ops_create_task',{method:'POST',body:JSON.stringify({p_assignee_user_id:f.assignee_user_id.value,p_store_id:f.store_id.value||null,p_spu:f.spu.value.trim(),p_task_type:f.task_type.value,p_title:f.title.value.trim(),p_priority:f.priority.value,p_due_at:due})});closeTaskForm();await load();draw();toast('任务已创建')}catch(z){msg.innerHTML=`<div class="msg">${e(z.message)}</div>`;btn.disabled=false;btn.textContent='创建任务'}}
async function editTask(id){
  const t=S.tasks.find(x=>x.id===id);if(!t)return;
  if(S.member.role==='manager'){
    if(t.status==='待验收') return openReviewTask(t);
    return openManagerTaskStatus(t);
  }
  return openOperatorTask(t);
}
function closeWorkModal(){modalRoot.innerHTML=''}
function openOperatorTask(t){
  if(t.status==='已完成'||t.status==='待验收'){
    modalRoot.innerHTML=`<div class="modal-backdrop" id="workBackdrop"><div class="modal"><div class="modal-head"><div><h2>任务 #${e(t.task_no)}</h2><div class="muted">${e(t.status)}</div></div><button class="modal-close" onclick="closeWorkModal()">×</button></div><div class="modal-body"><div class="approval-box"><div class="approval-label">任务内容</div><div class="approval-text">${e(t.title)}</div><div style="height:12px"></div><div class="approval-label">已提交结果</div><div class="approval-text" style="white-space:pre-wrap">${e(t.result||'—')}</div></div></div><div class="modal-actions"><button class="btn gray" onclick="closeWorkModal()">关闭</button></div></div></div>`;return;
  }
  if(t.status==='待处理'){
    modalRoot.innerHTML=`<div class="modal-backdrop" id="workBackdrop"><div class="modal" style="width:min(620px,100%)"><div class="modal-head"><div><h2>开始处理任务 #${e(t.task_no)}</h2><div class="muted">${e(sn(t.store_id))} · ${e(t.spu||'未指定商品')}</div></div><button class="modal-close" onclick="closeWorkModal()">×</button></div><div class="modal-body"><div class="approval-box"><div class="approval-label">任务内容</div><div class="approval-text">${e(t.title)}</div></div></div><div class="modal-actions"><button class="btn gray" onclick="closeWorkModal()">取消</button><button class="btn blue" onclick="startOperatorTask('${t.id}')">开始处理</button></div></div></div>`;return;
  }

  const actionTypes=['投产比目标调整','预算调整','价格调整','优惠券调整','活动调整','主图/图片调整','库存/尺码处理','其他运营动作'];
  const syncItems=['投产比目标','预算','售价','优惠券','活动','库存/尺码','主图/图片','其他'];
  modalRoot.innerHTML=`<div class="modal-backdrop" id="workBackdrop"><div class="modal"><div class="modal-head"><div><h2>提交执行动作 · 任务 #${e(t.task_no)}</h2><div class="muted">结构化记录后，AI 将关联 24H / 72H / 7D 效果</div></div><button class="modal-close" onclick="closeWorkModal()">×</button></div><form id="workSubmitForm"><div class="modal-body"><div class="form-grid">
    <div class="field wide"><label>实际动作类型 <span class="required">*</span></label><select class="input" name="action_type" id="actionType" required>${actionTypes.map(x=>`<option>${e(x)}</option>`).join('')}</select></div>
    <div class="field wide" id="actionFields"></div>
    <div class="field wide"><label>同步调整项 <span class="muted">（可多选；没有则不选）</span></label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${syncItems.map(x=>`<label style="display:flex;align-items:center;gap:6px;border:1px solid #dbe2ec;border-radius:9px;padding:8px 10px;cursor:pointer;background:#fff"><input type="checkbox" name="sync_item" value="${e(x)}"> ${e(x)}</label>`).join('')}</div><div class="helper">这里专门记录“主动作之外”同时发生的变化。只要勾选，AI 会降低单一动作归因置信度。</div></div>
    <div class="field wide"><label>额外操作明细</label><textarea class="input" name="extra_detail" maxlength="1000" placeholder="只填写上面选项没有覆盖的实际操作，例如：仅调整某个颜色/尺码、特殊活动位变化等。"></textarea></div>
    <div class="field wide"><label>补充说明</label><textarea class="input" name="note" maxlength="1000" placeholder="可选，例如：核心尺码库存正常、前端优惠券无变化。"></textarea></div>
    <div class="helper wide">原则：能选择的不要手写；额外操作明细只用于记录选项中没有覆盖的内容。</div>
    <div id="workSubmitMsg" class="wide"></div>
  </div></div><div class="modal-actions"><button class="btn gray" type="button" onclick="closeWorkModal()">取消</button><button class="btn blue" id="workSubmitBtn" type="submit">提交验收并进入AI验证</button></div></form></div></div>`;
  actionType.onchange=()=>renderActionFields(actionType.value);
  renderActionFields(actionType.value);
  workSubmitForm.onsubmit=ev=>submitOperatorAction(ev,t);
}

function renderActionFields(type){
  const box=$('#actionFields');if(!box)return;
  const num=(name,label,ph)=>`<div class="field"><label>${label} <span class="required">*</span></label><input class="input" type="number" step="0.01" name="${name}" required placeholder="${ph}"></div>`;
  if(type==='投产比目标调整'){
    box.innerHTML=`<div class="form-grid">${num('old_roi','旧ROI','例如 7')}${num('new_roi','新ROI','例如 6.5')}</div>`;
  }else if(type==='预算调整'){
    box.innerHTML=`<div class="form-grid">${num('old_budget','旧预算','例如 100')}${num('new_budget','新预算','例如 150')}</div>`;
  }else if(type==='价格调整'){
    box.innerHTML=`<div class="form-grid">${num('old_price','旧售价','例如 17.45')}${num('new_price','新售价','例如 16.99')}</div>`;
  }else if(type==='优惠券调整'){
    box.innerHTML=`<div class="form-grid"><div class="field"><label>原优惠券状态 <span class="required">*</span></label><select class="input" name="old_coupon_state" required><option>关闭</option><option>开启</option></select></div><div class="field"><label>新优惠券状态 <span class="required">*</span></label><select class="input" name="new_coupon_state" required><option>关闭</option><option>开启</option></select></div>${num('old_coupon_amount','原优惠券金额','例如 3')}${num('new_coupon_amount','新优惠券金额','例如 5')}</div>`;
  }else if(type==='活动调整'){
    const opts='<option>未参加</option><option>已参加</option><option>活动暂停</option><option>活动恢复</option><option>活动价格调整</option>';
    box.innerHTML=`<div class="form-grid"><div class="field"><label>原活动状态 <span class="required">*</span></label><select class="input" name="old_campaign_state" required>${opts}</select></div><div class="field"><label>新活动状态 <span class="required">*</span></label><select class="input" name="new_campaign_state" required>${opts}</select></div></div>`;
  }else if(type==='主图/图片调整'){
    box.innerHTML=`<div class="field"><label>图片操作 <span class="required">*</span></label><select class="input" name="image_action" required><option>更换主图</option><option>更换轮播图</option><option>更换场景图</option><option>A+详情调整</option><option>调整图片排序</option><option>其他图片动作</option></select></div>`;
  }else if(type==='库存/尺码处理'){
    box.innerHTML=`<div class="field"><label>库存/尺码操作 <span class="required">*</span></label><select class="input" name="inventory_action" required><option>补货</option><option>恢复断码</option><option>清理滞销库存</option><option>调整库存分配</option><option>暂停补货</option><option>其他库存动作</option></select></div>`;
  }else{
    box.innerHTML='<div class="helper">请选择“额外操作明细”填写具体动作；该项为其他固定选项无法覆盖时使用。</div>';
  }
}

async function startOperatorTask(id){
  try{await api('/rest/v1/rpc/ops_update_my_task',{method:'POST',body:JSON.stringify({p_id:id,p_status:'处理中',p_result:''})});closeWorkModal();await load();draw();toast('已开始处理')}catch(z){alert(z.message)}
}

function structuredActionLines(f){
  const type=f.action_type.value;
  const lines=['表单版本：ACTION_V2','实际动作类型：'+type];
  if(type==='投产比目标调整'){
    lines.push('旧ROI：'+f.old_roi.value,'新ROI：'+f.new_roi.value);
  }else if(type==='预算调整'){
    lines.push('旧预算：'+f.old_budget.value,'新预算：'+f.new_budget.value);
  }else if(type==='价格调整'){
    lines.push('旧售价：'+f.old_price.value,'新售价：'+f.new_price.value);
  }else if(type==='优惠券调整'){
    lines.push('原优惠券状态：'+f.old_coupon_state.value,'新优惠券状态：'+f.new_coupon_state.value,'原优惠券金额：'+f.old_coupon_amount.value,'新优惠券金额：'+f.new_coupon_amount.value);
  }else if(type==='活动调整'){
    lines.push('原活动状态：'+f.old_campaign_state.value,'新活动状态：'+f.new_campaign_state.value);
  }else if(type==='主图/图片调整'){
    lines.push('图片操作：'+f.image_action.value);
  }else if(type==='库存/尺码处理'){
    lines.push('库存尺码操作：'+f.inventory_action.value);
  }
  const sync=[...f.querySelectorAll('input[name="sync_item"]:checked')].map(x=>x.value);
  lines.push('同步调整项：'+(sync.length?sync.join('、'):'无'));
  const extra=f.extra_detail.value.trim();
  lines.push('额外操作明细：'+(extra||'无'));
  return {lines,sync,extra};
}

async function submitOperatorAction(ev,t){
  ev.preventDefault();const f=ev.currentTarget,btn=$('#workSubmitBtn'),msg=$('#workSubmitMsg');
  const built=structuredActionLines(f);
  const note=f.note.value.trim();
  const result=built.lines.join('\n');
  const fullNote=(note?note+'\n':'')+'AI验证标记：'+(built.sync.length?'存在同步调整项':'主动作单独执行');
  btn.disabled=true;btn.textContent='正在提交...';msg.innerHTML='';
  try{
    await api('/rest/v1/rpc/ops_submit_task',{method:'POST',body:JSON.stringify({p_id:t.id,p_result:result,p_note:fullNote})});
    closeWorkModal();await load();draw();toast('已提交验收，AI将跟踪后续效果');
  }catch(z){msg.innerHTML='<div class="msg">'+e(z.message)+'</div>';btn.disabled=false;btn.textContent='提交验收并进入AI验证'}
}
function openReviewTask(t){
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(680px,100%)"><div class="modal-head"><div><h2>验收任务 #${e(t.task_no)}</h2><div class="muted">${e(t.assignee)} · ${e(sn(t.store_id))}</div></div><button class="modal-close" onclick="closeWorkModal()">×</button></div><div class="modal-body"><div class="approval-box"><div class="approval-label">运营提交内容</div><div class="approval-text" style="white-space:pre-wrap">${e(t.result||'—')}</div></div><div class="field" style="margin-top:14px"><label>验收备注</label><textarea id="reviewNote" class="input" maxlength="1000" placeholder="可选；退回时必须填写原因"></textarea></div></div><div class="modal-actions"><button class="btn red" onclick="reviewOperatorTask('${t.id}','退回')">退回整改</button><button class="btn blue" onclick="reviewOperatorTask('${t.id}','通过')">验收通过</button></div></div></div>`;
}
async function reviewOperatorTask(id,action){
  const note=$('#reviewNote')?.value.trim()||'';if(action==='退回'&&!note){alert('退回时请填写原因');return}
  try{await api('/rest/v1/rpc/ops_review_task',{method:'POST',body:JSON.stringify({p_id:id,p_action:action,p_review_note:note})});closeWorkModal();await load();draw();toast(action==='通过'?'验收已通过':'已退回整改')}catch(z){alert(z.message)}
}
function openManagerTaskStatus(t){
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(620px,100%)"><div class="modal-head"><div><h2>任务 #${e(t.task_no)}</h2><div class="muted">${e(t.assignee)} · ${e(t.status)}</div></div><button class="modal-close" onclick="closeWorkModal()">×</button></div><div class="modal-body"><div class="approval-box"><div class="approval-label">任务内容</div><div class="approval-text">${e(t.title)}</div><div style="height:12px"></div><div class="approval-label">当前结果</div><div class="approval-text" style="white-space:pre-wrap">${e(t.result||'—')}</div></div></div><div class="modal-actions"><button class="btn gray" onclick="closeWorkModal()">关闭</button></div></div></div>`;
}
async function dropTask(id){if(!confirm('确认删除？'))return;try{await api('/rest/v1/rpc/ops_delete_task',{method:'POST',body:JSON.stringify({p_id:id})});await load();draw();toast('任务已删除')}catch(z){alert(z.message)}}
async function approve(id){try{await api('/rest/v1/rpc/ops_set_member_access',{method:'POST',body:JSON.stringify({p_user_id:id,p_role:'employee',p_is_active:true})});await load();draw();toast('运营账号已启用')}catch(z){alert(z.message)}}
try{S.session=JSON.parse(localStorage.getItem('ynerp'))}catch{}boot();
