# P0 正式审批发布执行清单（等待授权迁移）
## 已确认状态（2026-10-11）
- GitHub Actions run 38081957028：static-contract 和 postgres-integration 均 success。
- 生产新 RPC `kb_review_memory_with_reason(uuid,boolean,text)`：不存在。
- 旧 RPC `ai_p0_review_memory(uuid,boolean)`：authenticated 可调用，但服务端限制管理员。
- 生产 DRAFT：12 条。本流程禁止将它们用作验证数据。
- 当前自动数据库迁移被执行环境安全拦截，禁止改用绕过手段执行。

## 正式部署顺序
1. 数据库负责人通过被授权的 Supabase 迁移渠道审核 `sql/kb_review_with_reason_TEST_ONLY.sql`，检查与当前函数、审计日志和授权模型兼容；备份数据库定义与现有权限。
2. 安装新 RPC（仅 DDL，不能执行任何实际批准/拒绝）。只读确认新签名存在、authenticated 有执行权限。
3. 测试真实 Supabase JWT / RLS：匿名用户拒绝、普通员工拒绝、管理员身份可使用；需在隔离测试记录上执行。没有隔离测试记录时不得拿生产知识测试。
4. 检查全部旧 RPC 调用方，确认不会破坏其他生产客户端。执行 `sql/p0_review_release_gate_DO_NOT_RUN.sql`，撤销 authenticated 对旧 RPC 的直接调用，并验证。
5. 连接前端审核按钮到 `submitReviewedKnowledgeAfterRelease`，加入最终确认与并发状态检查；先部署 Vercel Preview，进行真实账号回归，再合并 main。
6. 确认审计、批准版本切换、任务导航、原有 ERP 工作流无回归后，执行正式发布。

## 上线阻断条件
- 没有 Supabase 实际 JWT/RLS 测试通过的证据
- 旧接口仍可绕过审核意见
- 前端没有锁定机制或审计写入不能保证原子性
- 无法确认生产数据库备份和回滚路径

## 回滚
- 前端：恢复上一次 Vercel 版本。
- 数据库：保留旧 RPC 函数定义用于恢复，但不能同时重新开放无审核意见的公网路径，除非经审批后指定回滚操作。
- 生产知识的批准/替代是业务状态变更，不能简单依赖代码回滚；必须另行审批修正。
