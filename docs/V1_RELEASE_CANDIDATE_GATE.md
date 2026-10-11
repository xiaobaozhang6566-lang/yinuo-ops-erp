# 亦诺 AI 第二大脑 V1.0 — 发布候选验收记录 (P1/P2/P4)

**目标：** 先通过隔离回归和 Vercel Preview 验收，再经过独立生产授权与回滚审批；本文档本身不构成发布授权。

## 已核验证据（2026-10-11）

- 候选 SHA：`6f5c6478b34a4a77c44ae2d354ee3feef5bdee40`。
- GitHub Actions #38123876776：静态契约、服务端 P2 安全/变更并发测试、PostgreSQL 17 隔离集成、Playwright 模拟后端浏览器 E2E、HTTP 冒烟测试均 **SUCCESS**。
- 同 SHA Vercel Git Preview：`dpl_5vqDeiGPsn9sChi2eRZs5GTMYEex`，状态 **READY**（不等于真实登录联调通过）。
- P1：任务留痕及案例证据校验已纳入自动化回归。
- P2：管理员草稿的原文摘录、风险清单和只读 AI 总结接口已提交；`AI_SUMMARY_ENABLED` 默认不启用；审批仍被 `REVIEW_RELEASE_ENABLED=false` 锁定。
- P3 做图场景：按决定暂缓，不纳入 V1.0。

CI 证据：https://github.com/xiaobaozhang6566-lang/yinuo-ops-erp/actions/runs/38123876776

## 已执行的生产数据库 **只读** 预检（2026-10-11）

检查对象：前端 `app.js` 所指向的 Supabase 项目 `iscadepgzegrvcqzosso`。仅查询 PostgreSQL catalog；未执行写入、DDL 或实际知识审批。

| 项目 | 实际结果 | V1.0 审批上线要求 |
|---|---|---|
| `kb_review_memory_with_reason(uuid,boolean,text)` | **不存在** | 必须存在并通过 JWT/RLS 回归 |
| `ai_p0_review_memory(uuid,boolean)` | 存在 | 旧调用方兼容性评估 |
| `authenticated` 对旧审批 RPC 的 EXECUTE | **true** | 审批升级后必须撤销无原因旧入口 |
| `authenticated` 对新审批 RPC 的 EXECUTE | false（新函数不存在） | 新函数经授权可调用且服务端限制管理员 |
| `ai_p0_memories` RLS | true | 保持启用 |
| 管理员读策略（catalog 匹配） | 1 | 后续还需真实 JWT 权限测试 |

对应只读 SQL 在 `sql/p0_release_preflight_READ_ONLY.sql`。**P0 正式审批链当前确定未满足条件；不能通过修改前端按钮绕过。**

## 不能自动宣告通过的验收项

1. **P2 AI 真实请求**：需要 Preview 专用服务端配置、受控演示草稿及使用成本约束；目前仅通过模拟 API/AI 响应，不可宣称实际模型联调成功。
2. **P4 Hosted Preview 真实角色登录**：需要管理员与普通员工测试账号；要验证授权范围、草稿不可见、任务留痕与错误处理。现有 CI Playwright 使用模拟接口，不能替代真实 JWT 验收。
3. **P0 审批迁移及权限**：必须由授权数据库负责人确认备份/回滚、进行隔离真实 JWT 测试，然后审批迁移。禁止用生产 12 条草稿当测试样本。
4. **发布授权**：PR #3 保持 draft；最终 SHA 的 CI、Preview、数据库检查与负责人签核必须一致，再单独决定是否合并及发布。生产部署和数据库修改目前均不授权。

## 发布门禁原则

`tests/release-readiness.cjs --enforce` 是阻断门，不是部署命令。P0 生产签核和 P4 Hosted Preview 真实账号验证无法由模拟 CI 或单纯写一段文本证明。后续若引入可验签的外部证明，应把来源、候选 SHA、成功记录与签核人绑定，不能用硬编码“通过”或普通 PR 自填字段代替授权。

## 回滚

- 前端：恢复已核对的旧 Vercel Production 部署；正式发布前确认旧版本 ID 与可恢复权限。
- 数据库：先保存新旧函数定义、GRANT/RLS 及迁移快照。不得在回滚时重新开放无审核理由的旧 RPC。
- 业务知识：审批/拒绝属于业务状态变化，不能用简单回滚代码替代，须单独审批纠正。

**当前结论：** 开发候选可继续回归；正式 V1.0 **未获发布许可、未上线**。
