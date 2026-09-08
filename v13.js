(function(){
  var STATUS_PENDING='待处理';
  var STATUS_DOING='处理中';
  var STATUS_DONE='已完成';
  var QUICK=['已检查，无异常','已调整完成','已处理完成','需继续跟进'];
  function syncVersion(){document.querySelectorAll('.top small').forEach(function(n){if(n.textContent!=='V1.3')n.textContent='V1.3'});document.querySelectorAll('.box .muted').forEach(function(n){if(n.textContent.indexOf('V1.2')>=0)n.textContent=n.textContent.replace('V1.2','V1.3')})}
  var observer=new MutationObserver(syncVersion);observer.observe(document.documentElement,{childList:true,subtree:true});syncVersion();
  window.closeProcessForm=function(){modalRoot.innerHTML=''};
  function selectedStatus(){var checked=document.querySelector('input[name="process_status"]:checked');return checked?checked.value:''}
  function refreshStatusCards(){document.querySelectorAll('.status-choice').forEach(function(card){var input=card.querySelector('input[name="process_status"]');card.classList.toggle('selected',!!(input&&input.checked))})}
  window.pickQuickResult=function(text,el){var box=document.getElementById('processResult');if(!box)return;box.value=text;document.querySelectorAll('.quick-result').forEach(function(x){x.classList.remove('active')});if(el)el.classList.add('active')};
  window.editTask=function(id){
    var t=S.tasks.find(function(x){return x.id===id});if(!t)return;
    var status=t.status||STATUS_PENDING,result=t.result||'',store=sn(t.store_id);
    var statusOptions=[
      {value:STATUS_PENDING,key:'pending',title:STATUS_PENDING,desc:'任务暂未开始'},
      {value:STATUS_DOING,key:'doing',title:STATUS_DOING,desc:'正在执行或跟进'},
      {value:STATUS_DONE,key:'done',title:STATUS_DONE,desc:'任务已处理完成'}
    ];
    modalRoot.innerHTML='<div class="modal-backdrop" id="processBackdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="processTitle">'+
      '<div class="modal-head"><div><h2 id="processTitle">处理任务</h2><div class="muted" style="font-size:13px;margin-top:4px">直接选状态，不需要手动输入</div></div><button class="modal-close" type="button" onclick="closeProcessForm()">&times;</button></div>'+
      '<form id="processForm"><div class="modal-body">'+
      '<div class="task-summary"><div class="task-summary-title">'+e(t.title)+'</div><div class="task-summary-meta"><span>负责人：'+e(t.assignee||'--')+'</span><span>店铺：'+e(store)+'</span><span>当前：'+e(status)+'</span></div></div>'+
      '<div class="field"><label>任务状态 <span class="required">*</span></label><div class="status-choice-grid">'+
      statusOptions.map(function(o){return '<label class="status-choice '+(status===o.value?'selected':'')+'" data-status="'+o.key+'"><input type="radio" name="process_status" value="'+o.value+'" '+(status===o.value?'checked':'')+'><span class="status-choice-title">'+o.title+'</span><span class="status-choice-desc">'+o.desc+'</span></label>'}).join('')+
      '</div></div>'+
      '<div class="field"><label>快速处理结果</label><div class="quick-results">'+QUICK.map(function(q){return '<button type="button" class="quick-result" onclick="pickQuickResult(\''+q+'\',this)">'+q+'</button>'}).join('')+'</div><div class="result-note">点常用结果即可，也可以在下方补充详细说明。</div></div>'+
      '<div class="field"><label>处理结果 / 备注</label><textarea class="input" id="processResult" name="process_result" maxlength="1000" placeholder="可选：补充处理过程、调整内容或后续计划">'+e(result)+'</textarea></div>'+
      '<div id="processMsg"></div></div><div class="modal-actions"><button class="btn gray" type="button" onclick="closeProcessForm()">取消</button><button class="btn blue" id="processSubmit" type="submit">保存处理结果</button></div></form></div></div>';
    document.querySelectorAll('input[name="process_status"]').forEach(function(radio){radio.addEventListener('change',refreshStatusCards)});
    processBackdrop.addEventListener('click',function(ev){if(ev.target===processBackdrop)closeProcessForm()});
    processForm.onsubmit=async function(ev){
      ev.preventDefault();var newStatus=selectedStatus(),newResult=processResult.value.trim(),btn=document.getElementById('processSubmit'),msg=document.getElementById('processMsg');
      if(!newStatus){msg.innerHTML='<div class="msg">请选择任务状态。</div>';return}
      btn.disabled=true;btn.textContent='正在保存...';msg.innerHTML='';
      try{
        if(S.member.role==='manager'){
          await api('/rest/v1/rpc/ops_update_task_manager',{method:'POST',body:JSON.stringify({p_id:id,p_assignee_user_id:t.assignee_user_id,p_store_id:t.store_id,p_spu:t.spu||'',p_task_type:t.task_type,p_title:t.title,p_priority:t.priority,p_due_at:t.due_at,p_status:newStatus,p_result:newResult})});
        }else{
          await api('/rest/v1/rpc/ops_update_my_task',{method:'POST',body:JSON.stringify({p_id:id,p_status:newStatus,p_result:newResult})});
        }
        closeProcessForm();await load();draw();toast('任务已更新');
      }catch(z){msg.innerHTML='<div class="msg">'+e(z.message)+'</div>';btn.disabled=false;btn.textContent='保存处理结果'}
    };
  };
})();
