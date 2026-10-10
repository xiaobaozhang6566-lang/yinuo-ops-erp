/* Presentation and client-side task discovery only; existing write handlers stay in V15. */
(function () {
  'use strict';
  const previousPage = window.page;
  const ui = { quick: 'all', query: '' };
  const ranges = { today: '今日', week: '本周', all: '全部' };
  const quicks = [['all', '全部状态'], ['open', '待完成'], ['overdue', '超期'], ['review', '待验收'], ['done', '已完成']];
  function isManager() { return S.member && S.member.role === 'manager'; }
  function localDate(date) { return date.toLocaleDateString('sv-SE'); }
  function inRange(task) {
    if (OPS14.range === 'all') return true;
    const now = new Date();
    if (OPS14.range === 'today') return task.task_date === localDate(now);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - (start.getDay() || 7) + 1);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return task.task_date >= localDate(start) && task.task_date <= localDate(end);
  }
  function matchesQuick(t) {
    return ui.quick === 'all' || (ui.quick === 'open' && t.status !== '已完成') ||
      (ui.quick === 'overdue' && over(t)) || (ui.quick === 'review' && t.status === '待验收') ||
      (ui.quick === 'done' && t.status === '已完成');
  }
  function periodTasks() {
    return S.tasks.filter(t => inRange(t) && (S.page === 'mine' || !isManager() ? t.assignee_user_id === S.member.user_id : true));
  }
  function visibleTasks(base) {
    const f = OPS14.filters;
    const query = ui.query.trim().toLocaleLowerCase();
    return base.filter(t => matchesQuick(t) &&
      (S.page !== 'tasks' || ((!f.assignee || t.assignee_user_id === f.assignee) && (!f.store || t.store_id === f.store) &&
        (!f.status || t.status === f.status) && (!f.priority || t.priority === f.priority))) &&
      (!query || [t.title, t.spu, t.assignee, sn(t.store_id), t.task_type, t.result, t.task_no].join(' ').toLocaleLowerCase().includes(query)));
  }
  function rangeSwitch() {
    return '<div class="range-switch" aria-label="任务日期范围">' + Object.entries(ranges).map(([key, label]) =>
      `<button type="button" aria-pressed="${OPS14.range === key}" class="${OPS14.range === key ? 'active' : ''}" onclick="setTaskRange('${key}')">${label}</button>`).join('') + '</div>';
  }
  function actions() {
    return isManager() ? '<button class="btn gray" onclick="openBulkTaskForm()">批量创建</button><button class="btn blue" onclick="openTaskForm()">+ 新建任务</button>' : '';
  }
  function selectField(label, key, options) {
    const value = OPS14.filters[key];
    return `<div class="filter-field"><label for="filter-${key}">${label}</label><select id="filter-${key}" class="input" onchange="setTaskFilter('${key}',this.value)"><option value="">全部${label}</option>` +
      options.map(([id, name]) => `<option value="${e(id)}" ${value === id ? 'selected' : ''}>${e(name)}</option>`).join('') + '</select></div>';
  }
  function filters(count) {
    const members = S.members.filter(m => m.role !== 'pending' && m.is_active);
    return '<div class="filter-panel">' + selectField('负责人', 'assignee', members.map(m => [m.user_id, m.display_name])) +
      selectField('店铺', 'store', S.stores.map(s => [s.id, s.store_name])) +
      selectField('状态', 'status', ['待处理', '处理中', '待验收', '已完成'].map(x => [x, x])) +
      selectField('优先级', 'priority', ['普通', '重要', '紧急'].map(x => [x, x])) +
      `<div class="filter-meta"><span aria-live="polite">当前显示 ${count} 条 · ${ranges[OPS14.range]}</span><button class="btn gray" onclick="resetWorkbenchFilters()">清除筛选</button></div></div>`;
  }
  function tools() {
    return '<div class="task-tools"><div class="quick-filters" aria-label="快捷状态筛选">' + quicks.map(([key, label]) =>
      `<button type="button" aria-pressed="${ui.quick === key}" onclick="setWorkbenchQuick('${key}')">${label}</button>`).join('') +
      '</div><form class="task-search" id="taskSearch"><input type="search" aria-label="搜索任务、SPU、负责人或店铺" placeholder="搜索任务 / SPU / 负责人 / 店铺" value="' + e(ui.query) + '"><button class="btn gray" type="submit">搜索</button></form></div>';
  }
  function cards(base) {
    const done = base.filter(t => t.status === '已完成').length;
    const overdue = base.filter(over).length;
    const metrics = [['all', ranges[OPS14.range] + '任务', base.length, '查看当前日期范围'], ['open', '待完成', base.length - done, '待处理、处理中及待验收'],
      ['done', '已完成', done, '已完成的任务'], ['overdue', '超期', overdue, '当前日期范围内未完成']];
    return '<div class="cards">' + metrics.map(([key, label, count, hint]) =>
      `<button type="button" class="card ${key === 'overdue' && count ? 'attention' : ''}" aria-pressed="${ui.quick === key}" onclick="setWorkbenchQuick('${key}')">${label}<span class="num">${count}</span><small>${hint}</small></button>`).join('') + '</div>';
  }
  function empty(base) {
    const hasFilters = ui.quick !== 'all' || ui.query || (S.page === 'tasks' && Object.values(OPS14.filters).some(Boolean));
    let title = '当前日期范围暂无任务';
    let hint = isManager() ? '可以创建任务并分配负责人，也可以切换日期范围查看已有任务。' : '可以切换日期范围查看已有任务；需要分配任务时，请联系管理员。';
    if (base.length && hasFilters) { title = '没有符合筛选条件的任务'; hint = '调整状态、负责人或关键词，或清除筛选后重新查看。'; }
    return `<div class="task-empty"><div class="empty-mark" aria-hidden="true">≡</div><h4>${title}</h4><p>${hint}</p>` +
      (hasFilters ? '<button class="btn gray" onclick="resetWorkbenchFilters()">清除筛选</button>' : '') +
      (OPS14.range !== 'all' ? '<button class="btn gray" onclick="setTaskRange(\'all\')">查看全部日期</button>' : '') + '</div>';
  }
  window.setWorkbenchQuick = function (key) {
    if (!quicks.some(q => q[0] === key)) return;
    ui.quick = key;
    // A quick status choice replaces the detailed status choice instead of silently conflicting.
    OPS14.filters.status = '';
    page();
  };
  const previousFilter = window.setTaskFilter;
  window.setTaskFilter = function (key, value) {
    if (key === 'status') ui.quick = 'all';
    previousFilter(key, value);
  };
  window.resetWorkbenchFilters = function () {
    ui.quick = 'all'; ui.query = '';
    OPS14.filters = { assignee: '', store: '', status: '', priority: '' };
    page();
  };
  window.page = function () {
    if (!S.member || !['home', 'mine', 'tasks'].includes(S.page) || (S.page === 'tasks' && !isManager())) return previousPage();
    const base = periodTasks(), tasks = visibleTasks(base);
    const titles = { home: '运营工作台', mine: '我的任务', tasks: '任务管理' };
    const descriptions = { home: '先看超期与待完成，再安排今天的工作。', mine: '查看分配给你的任务，记录处理动作与结果。', tasks: '按负责人、店铺与状态查找任务，跟进执行进度。' };
    const container = document.getElementById('c');
    container.innerHTML = `<div class="work-heading"><div><h1>${titles[S.page]}</h1><p>${descriptions[S.page]}</p></div><span class="work-date">${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span></div>` +
      (S.page === 'home' ? cards(base) : '') + '<section class="panel" aria-label="任务列表"><div class="head"><div class="head-title"><h3>' +
      (S.page === 'home' ? ranges[OPS14.range] + '任务' : titles[S.page]) + `</h3><span class="task-count">${tasks.length} 条</span></div><div class="v14-toolbar">` +
      rangeSwitch() + actions() + '</div></div>' + (S.page === 'tasks' ? filters(tasks.length) : '') + tools() +
      (tasks.length ? tab(tasks, S.page !== 'mine' && isManager(), isManager()) : empty(base)) +
      (tasks.length ? '<div class="table-footer">共 ' + tasks.length + ' 条任务 · 超期按截止时间判断 · 横向滚动可查看完整字段</div>' : '') + '</section>';
    container.querySelectorAll('.table tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      const offset = S.page !== 'mine' && isManager() ? 1 : 0;
      if (cells.length) { cells[offset + 1].classList.add('task-title'); cells[offset + 6].classList.add('task-result'); }
    });
    container.querySelectorAll('.pill').forEach(pill => pill.classList.toggle('review', pill.textContent === '待验收'));
    const search = document.getElementById('taskSearch');
    search.onsubmit = function (ev) { ev.preventDefault(); ui.query = search.querySelector('input').value; page(); document.querySelector('#taskSearch input').focus(); };
    const scroll = container.querySelector('.scroll');
    if (scroll) { scroll.tabIndex = 0; scroll.setAttribute('aria-label', '任务表格，可横向滚动'); }
  };
  if (S.member) draw();
})();
