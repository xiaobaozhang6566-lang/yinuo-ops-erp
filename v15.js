(function(){
  var baseTab=window.tab;

  window.tab=function(ts,ass,del){
    ass=ass===undefined?1:ass;del=del===undefined?0:del;
    if(!ts.length)return '<div class="body muted">暂无任务</div>';
    var manager=S.member&&S.member.role==='manager';
    return '<div class="scroll"><table class="table"><tr>'+(ass?'<th>负责人</th>':'')+'<th>店铺</th><th>任务</th><th>类型</th><th>优先级</th><th>截止</th><th>状态</th><th>结果</th><th>提交时间</th><th>操作</th></tr>'+
      ts.map(function(t){
        var od=over(t);
        var canOperate=t.assignee_user_id===S.member.user_id;
        var primaryLabel=manager&&!canOperate?(t.status==='待验收'?'验收':'查看'):'处理';
        return '<tr class="'+(od?'row-overdue':'')+'">'+
          (ass?'<td><b>'+e(t.assignee)+'</b></td>':'')+
          '<td>'+e(sn(t.store_id))+'</td>'+
          '<td>'+e(t.title)+(t.spu?'<br><small class="muted">SPU '+e(t.spu)+'</small>':'')+'</td>'+
          '<td>'+e(t.task_type)+'</td>'+
          '<td><span class="pill '+(t.priority==='紧急'?'urgent':t.priority==='重要'?'important':'')+'">'+e(t.priority)+'</span></td>'+
          '<td class="'+(od?'over':'')+'">'+(typeof taskTime==='function'?taskTime(t.due_at):fmt(t.due_at))+(od?'<span class="over-badge">超期</span>':'')+'</td>'+
          '<td><span class="pill '+(t.status==='已完成'?'done':t.status==='处理中'?'doing':'')+'">'+e(t.status)+'</span></td>'+
          '<td>'+e(t.result||'—')+'</td>'+
          '<td><span class="time-small">'+(typeof taskTime==='function'?taskTime(t.result_submitted_at):fmt(t.result_submitted_at))+'</span></td>'+
          '<td><div class="action-group"><button class="btn gray" onclick="editTask(\''+t.id+'\')">'+primaryLabel+'</button>'+
          (manager?'<button class="btn gray" onclick="openAdminEditTask(\''+t.id+'\')">编辑</button>':'')+
          (del?'<button class="btn red" onclick="dropTask(\''+t.id+'\')">删</button>':'')+
          '</div></td></tr>';
      }).join('')+'</table></div>';
  };

  window.editTask=function(id){
    var t=S.tasks.find(function(x){return x.id===id});
    if(!t)return;

    var isOwner=t.assignee_user_id===S.member.user_id;

    if(S.member.role==='manager'){
      if(t.status==='待验收') return openReviewTask(t);
      if(isOwner) return openOperatorTask(t);
      return openManagerTaskStatusV15(t);
    }
    return openOperatorTask(t);
  };

  window.openManagerTaskStatusV15=function(t){
    modalRoot.innerHTML=
      '<div class="modal-backdrop"><div class="modal" style="width:min(720px,100%)">'+
      '<div class="modal-head"><div><h2>查看任务 #'+e(t.task_no)+'</h2><div class="muted">'+e(t.assignee)+' · '+e(t.status)+'</div></div><button class="modal-close" onclick="closeWorkModal()">×</button></div>'+
      '<div class="modal-body">'+
        '<div class="approval-box"><div class="approval-label">任务内容</div><div class="approval-text">'+e(t.title)+'</div>'+
        '<div style="height:12px"></div><div class="approval-label">当前结果</div><div class="approval-text" style="white-space:pre-wrap">'+e(t.result||'尚未提交执行动作')+'</div></div>'+
        '<div class="approval-note" style="margin-top:14px">当前负责人是 <b>'+e(t.assignee||'未分配')+'</b>。为保证执行记录可追溯，管理员不代替负责人提交动作；负责人提交后，AI 会自动读取并进入 24H / 72H / 7D 验证。</div>'+
      '</div>'+
      '<div class="modal-actions"><button class="btn gray" onclick="closeWorkModal()">关闭</button><button class="btn gray" onclick="previewOperatorFormV15(\''+t.id+'\')">预览运营提交表单</button></div>'+
      '</div></div>';
  };

  window.previewOperatorFormV15=function(id){
    var t=S.tasks.find(function(x){return x.id===id});if(!t)return;
    var oldRole=S.member.role;
    var oldUid=S.member.user_id;
    try{
      S.member.role='employee';
      S.member.user_id=t.assignee_user_id;
      openOperatorTask(t);
      var form=document.getElementById('workSubmitForm');
      if(form){
        form.onsubmit=function(ev){ev.preventDefault();alert('这是管理员预览模式，不能代替负责人提交。')};
        var btn=document.getElementById('workSubmitBtn');
        if(btn)btn.textContent='预览模式 · 不可提交';
        var head=document.querySelector('.modal-head .muted');
        if(head)head.textContent='管理员预览运营填写界面；不会写入任务记录';
      }
    } finally {
      S.member.role=oldRole;
      S.member.user_id=oldUid;
    }
  };

  if(S.member)draw();
})();