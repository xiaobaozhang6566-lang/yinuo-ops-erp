const U='https://iscadepgzegrvcqzosso.supabase.co';
const K='sb_publishable_9wdwV4dxsojsa89HV7fbnA_yh1MZTs2';
const S={session:null,user:null,member:null,members:[],stores:[],tasks:[],page:'home'};
const $=s=>document.querySelector(s);
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let refreshPromise=null;

function hs(auth=1){
  const h={apikey:K,'Content-Type':'application/json'};
  if(auth&&S.session?.access_token) h.Authorization='Bearer '+S.session.access_token;
  return h;
}

function ss(x){
  S.session=x;
  if(x) localStorage.setItem('ynerp',JSON.stringify(x));
  else localStorage.removeItem('ynerp');
}

function errMsg(d){
  return d?.message||d?.msg||d?.error_description||d?.error||d?.hint||'请求失败';
}

async function refreshSession(){
  if(!S.session?.refresh_token) throw new Error('登录已过期，请重新登录');
  if(refreshPromise) return refreshPromise;
  refreshPromise=(async()=>{
    const r=await fetch(U+'/auth/v1/token?grant_type=refresh_token',{
      method:'POST',
      headers:{apikey:K,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:S.session.refresh_token})
    });
    const t=await r.text();
    let d=null;
    if(t){try{d=JSON.parse(t)}catch{d=t}}
    if(!r.ok||!d?.access_token){
      ss(null);
      S.user=null;
      S.member=null;
      throw new Error(errMsg(d)||'登录已过期，请重新登录');
    }
    ss(d);
    S.user=d.user||S.user;
    return d;
  })().finally(()=>{refreshPromise=null});
  return refreshPromise;
}

async function api(p,o={},retried=false){
  const authRequired=o.auth!==0;
  const opts={...o};
  delete opts.auth;
  const r=await fetch(U+p,{...opts,headers:{...hs(authRequired),...(opts.headers||{})}});
  const t=await r.text();
  let d=null;
  if(t){try{d=JSON.parse(t)}catch{d=t}}
  if(!r.ok){
    const msg=errMsg(d);
    const expired=r.status===401||/jwt\s*expired|token.*expired|invalid.*jwt/i.test(String(msg));
    if(authRequired&&!retried&&expired&&S.session?.refresh_token){
      try{
        await refreshSession();
        return api(p,o,true);
      }catch(refreshErr){
        ss(null);
        S.member=null;
        auth('login','登录已过期，请重新登录。');
        throw refreshErr;
      }
    }
    throw new Error(msg);
  }
  return d;
}

async function login(email,password){
  const d=await api('/auth/v1/token?grant_type=password',{method:'POST',auth:0,body:JSON.stringify({email,password})});
  ss(d);S.user=d.user;await boot();
}

async function signup(name,email,password){
  const d=await api('/auth/v1/signup',{method:'POST',auth:0,body:JSON.stringify({email,password,data:{display_name:name}})});
  if(d.access_token){ss(d);S.user=d.user;await boot()}
  else auth('login','注册成功，请让管理员在团队页面启用账号后再登录。');
}

function auth(mode='login',ok=''){
  root.innerHTML=`<div class="login"><div class="box"><div class="logo">YN · 亦诺跨境 ERP</div><h2>${mode==='login'?'登录运营任务系统':'创建员工账号'}</h2><p class="muted">${mode==='login'?'运营任务 V1.1':'新员工注册后由管理员启用。'}</p><form id="af">${mode==='signup'?'<div class="field"><label>姓名</label><input class="input" name="name" required></div>':''}<div class="field"><label>邮箱</label><input class="input" type="email" name="email" required></div><div class="field"><label>密码</label><input class="input" type="password" name="password" minlength="6" required></div><button class="btn blue full">${mode==='login'?'登录':'注册'}</button><div id="am">${ok?`<p class="muted">${e(ok)}</p>`:''}</div></form><p class="muted" style="text-align:center">${mode==='login'?'<a id="sw">注册账号</a>':'<a id="sw">返回登录</a>'}</p></div></div>`;
  af.onsubmit=async x=>{
    x.preventDefault();
    const f=new FormData(af);
    try{
      if(mode==='login') await login(f.get('email'),f.get('password'));
      else await signup(f.get('name'),f.get('email'),f.get('password'));
    }catch(z){am.innerHTML=`<div class="msg">${e(z.message)}</div>`}
  };
  sw.onclick=()=>auth(mode==='login'?'signup':'login');
}

async function boot(){
  if(!S.session){try{S.session=JSON.parse(localStorage.getItem('ynerp'))}catch{}}
  if(!S.session) return auth();
  let uid=S.session.user?.id||S.user?.id;
  if(!uid){
    try{uid=JSON.parse(atob(S.session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub}
    catch{return auth()}
  }
  try{
    const m=await api('/rest/v1/ops_members?select=*&user_id=eq.'+uid);
    S.member=m[0];
    if(!S.member) return auth('login','账号未初始化，请重新登录');
    if(S.member.role==='pending'||!S.member.is_active) return pending();
    await load();draw();
  }catch(z){
    if(!S.session) auth('login','登录已过期，请重新登录');
    else auth('login','暂时无法加载，请重新登录。');
  }
}

async function load(){
  [S.stores,S.tasks]=await Promise.all([
    api('/rest/v1/stores?select=id,store_name&is_active=eq.true&order=store_name'),
    api('/rest/v1/ops_tasks?select=*&order=created_at.desc')
  ]);
  S.members=S.member.role==='manager'?await api('/rest/v1/rpc/ops_list_members',{method:'POST',body:'{}'}):[S.member];
}

function pending(){
  root.innerHTML=`<div class="login"><div class="box"><h2>账号等待启用</h2><p class="muted">${e(S.member.display_name)}，管理员启用后即可使用。</p><button class="btn gray" onclick="boot()">刷新</button> <button class="btn red" onclick="out()">退出</button></div></div>`;
}

async function out(){
  try{await api('/auth/v1/logout',{method:'POST'})}catch{}
  ss(null);S.member=null;S.user=null;auth();
}

function draw(){
  const manager=S.member.role==='manager';
  const nav=[['home','首页'],['mine','我的任务'],...(manager?[['tasks','任务管理'],['team','团队任务']]:[])];
  root.innerHTML=`<div class="app"><div class="top"><b>YN · 运营任务 ERP</b><div class="nav">${nav.map(n=>`<button data-p="${n[0]}" class="${S.page===n[0]?'on':''}">${n[1]}</button>`).join('')}</div><div>${e(S.member.display_name)} · ${manager?'管理员':'运营'} <button class="btn gray" onclick="out()">退出</button></div></div><div class="wrap" id="c"></div></div>`;
  document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{S.page=b.dataset.p;draw()});
  page();
}

const sn=id=>S.stores.find(x=>x.id===id)?.store_name||'—';
const fmt=x=>x?new Date(x).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'—';
const over=t=>t.status!=='已完成'&&t.due_at&&new Date(t.due_at)<new Date();

function tab(ts,ass=1,del=0){
  if(!ts.length) return '<div class="body muted">暂无任务</div>';
  return `<div class="scroll"><table class="table"><tr>${ass?'<th>负责人</th>':''}<th>店铺</th><th>任务</th><th>类型</th><th>优先级</th><th>截止</th><th>状态</th><th>结果</th><th>操作</th></tr>${ts.map(t=>`<tr>${ass?`<td><b>${e(t.assignee)}</b></td>`:''}<td>${e(sn(t.store_id))}</td><td>${e(t.title)}${t.spu?`<br><small class="muted">SPU ${e(t.spu)}</small>`:''}</td><td>${e(t.task_type)}</td><td><span class="pill ${t.priority==='紧急'?'urgent':t.priority==='重要'?'important':''}">${e(t.priority)}</span></td><td class="${over(t)?'over':''}">${fmt(t.due_at)}${over(t)?' 超期':''}</td><td><span class="pill ${t.status==='已完成'?'done':t.status==='处理中'?'doing':''}">${e(t.status)}</span></td><td>${e(t.result||'—')}</td><td><button class="btn gray" onclick="editTask('${t.id}')">处理</button>${del?` <button class="btn red" onclick="dropTask('${t.id}')">删</button>`:''}</td></tr>`).join('')}</table></div>`;
}

function page(){
  const manager=S.member.role==='manager';
  if(S.page==='home'){
    const d=new Date().toLocaleDateString('sv-SE');
    const ts=S.tasks.filter(t=>t.task_date===d&&(manager||t.assignee_user_id===S.member.user_id));
    const done=ts.filter(t=>t.status==='已完成').length;
    const od=S.tasks.filter(t=>over(t)&&(manager||t.assignee_user_id===S.member.user_id)).length;
    c.innerHTML=`<div class="cards"><div class="card">今日任务<div class="num">${ts.length}</div></div><div class="card">待完成<div class="num">${ts.length-done}</div></div><div class="card">已完成<div class="num">${done}</div></div><div class="card">超期<div class="num ${od?'over':''}">${od}</div></div></div><div class="panel"><div class="head"><h3>今日任务</h3>${manager?'<button class="btn blue" onclick="createTask()">+ 新建任务</button>':''}</div>${tab(ts,manager,manager)}</div>`;
  }else if(S.page==='mine'){
    c.innerHTML=`<div class="panel"><div class="head"><h3>我的任务</h3></div>${tab(S.tasks.filter(t=>t.assignee_user_id===S.member.user_id),0)}</div>`;
  }else if(S.page==='tasks'&&manager){
    c.innerHTML=`<div class="panel"><div class="head"><h3>全部任务</h3><button class="btn blue" onclick="createTask()">+ 新建任务</button></div>${tab(S.tasks,1,1)}</div>`;
  }else if(S.page==='team'&&manager){
    const pend=S.members.filter(m=>m.role==='pending');
    const act=S.members.filter(m=>m.role!=='pending');
    c.innerHTML=`${pend.length?`<div class="panel"><div class="head"><h3>待启用账号</h3></div><div class="body">${pend.map(m=>`<div class="member"><b>${e(m.display_name)}</b><span class="muted">${e(m.email)}</span><button class="btn blue" onclick="approve('${m.user_id}')">启用为运营</button></div>`).join('')}</div></div>`:''}<div class="panel"><div class="head"><h3>团队概览</h3></div><div class="body">${act.map(m=>{const ts=S.tasks.filter(t=>t.assignee_user_id===m.user_id),dn=ts.filter(t=>t.status==='已完成').length;return `<div class="member"><b>${e(m.display_name)}</b><span>任务 ${ts.length} · 已完成 ${dn}</span><span class="muted">${m.role==='manager'?'管理员':'运营'}</span></div>`}).join('')}</div></div>`;
  }else{S.page='home';draw()}
}

async function createTask(){
  const a=S.members.filter(m=>m.role!=='pending'&&m.is_active);
  const who=prompt('负责人：\n'+a.map((m,i)=>`${i+1}. ${m.display_name}`).join('\n'),'1');
  if(!who)return;
  const m=a[Number(who)-1];
  if(!m)return alert('负责人选择无效');
  const title=prompt('任务内容');
  if(!title)return;
  const type=prompt('任务类型：广告检查 / 商品检查 / 售后检查 / 新品跟进 / 其他任务','商品检查')||'其他任务';
  const priority=prompt('优先级：普通 / 重要 / 紧急','普通')||'普通';
  try{
    await api('/rest/v1/rpc/ops_create_task',{method:'POST',body:JSON.stringify({p_assignee_user_id:m.user_id,p_store_id:null,p_spu:'',p_task_type:type,p_title:title,p_priority:priority,p_due_at:null})});
    await load();draw();
  }catch(z){alert(z.message)}
}

async function editTask(id){
  const t=S.tasks.find(x=>x.id===id);
  const status=prompt('状态：待处理 / 处理中 / 已完成',t.status);
  if(!status)return;
  const result=prompt('处理结果',t.result||'')??'';
  try{
    await api('/rest/v1/rpc/ops_update_my_task',{method:'POST',body:JSON.stringify({p_id:id,p_status:status,p_result:result})});
    await load();draw();
  }catch(z){alert(z.message)}
}

async function dropTask(id){
  if(!confirm('确认删除？'))return;
  try{
    await api('/rest/v1/rpc/ops_delete_task',{method:'POST',body:JSON.stringify({p_id:id})});
    await load();draw();
  }catch(z){alert(z.message)}
}

async function approve(id){
  try{
    await api('/rest/v1/rpc/ops_set_member_access',{method:'POST',body:JSON.stringify({p_user_id:id,p_role:'employee',p_is_active:true})});
    await load();draw();
  }catch(z){alert(z.message)}
}

try{S.session=JSON.parse(localStorage.getItem('ynerp'))}catch{}
boot();
