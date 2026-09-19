(function(){
  window.editTask=function(id){
    var t=S.tasks.find(function(x){return x.id===id});
    if(!t)return;
    if(S.member.role==='manager'){
      if(t.status==='待验收') return openReviewTask(t);
      return openManagerTaskStatus(t);
    }
    return openOperatorTask(t);
  };
})();