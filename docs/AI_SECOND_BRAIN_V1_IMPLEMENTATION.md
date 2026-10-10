# 亦诺 AI 第二大脑 V1 — 实施基线

状态：开发规划 / 未发布

## 已核实的复用资产
- 前端：`index.html`、`app.js`、`v13.js`、`v14.js`，原 ERP V1.4，静态 HTML/JS。
- Supabase：`iscadepgzegrvcqzosso`，现有 `ops_members`、`ops_tasks`、`ops_task_events`、`ops_task_submissions`、`ops_task_attachments`、`ai_p0_memories`、`ai_p0_audit_log`。
- `ai_p0_memories` 的约束：状态仅 DRAFT/APPROVED/REJECTED/SUPERSEDED；类别仅 POLICY/SOP/DECISION/LESSON/PRODUCT/TEAM；`(scope,memory_key,version)` 唯一。
- 检查时 AI 记忆 12 条均为 DRAFT，不自动审核或发布。
- 部署：Vercel `yinuo-ops-erp` 当前可见生产部署仅是 `test` 占位页，正式源码不能直接覆盖上线。

## V1 产品闭环
知识草稿录入 -> 分类 -> 审核申请 -> 授权审批 -> 可追溯知识检索 -> 任务引用 -> 案例归档 -> AI 经验候选 -> 人工审核。

## 第一批实现优先级
1. 用现有 `ai_p0_memories` 做版本化知识来源，不新建平行主表。
2. 增量设计 `kb_review_requests`、`kb_documents`、`kb_cases`、`kb_case_evidence`、`kb_ai_insights`、`kb_usage_events`。
3. 新增的 API 先做只读知识查询，服务端检查角色/范围及 APPROVED 和时间有效性；默认不开放匿名查询。
4. 原静态前端后续以独立 `knowledge.js` / `knowledge.css` 模块渐进接入，不破坏既有 `app.js` 登录状态和任务流程。
5. AI 经验初始只能生成 DRAFT 候选，禁止自动批准和执行业务变更。

## 安全前置条件
- 在测试环境检查 RLS、函数 EXECUTE 权限、存储 Bucket 路径及审批事务。
- 不在浏览器暴露 secret/service_role。
- 严禁将用户输入或外部文档作为能修改权限和规则的系统指令。
- 只在测试/审核通过后合并 main；明确验证生产部署源码。
- 生产数据库和正式域名本阶段不修改。

## 验收标准
- 管理员可审查历史知识；未审批内容不可作为员工正式 SOP 被检索。
- 员工只能按授权范围查阅知识；越权查询返回拒绝。
- 一次知识审批可完整追溯审核人、版本、时间、原因。
- 问题案例能链接任务与具体图片版本。
- AI 经验的来源证据和审查状态可查询。

## 后续任务
- 先在开发分支构建知识界面，优先静态交互与接口适配层；
- 再以测试 Supabase 项目验证迁移、审批、RLS、安全；
- 最后评估部署到 Vercel 预览环境并在人工验收后推广。
