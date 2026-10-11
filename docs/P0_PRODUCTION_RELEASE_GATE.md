# P0 审批发布：实际权限和分阶段生产迁移（2026-10-11）

本流程仅覆盖权限和审批迁移。真实 AI 联调暂停，P3 暂缓。**禁止将预检通过解释为自动批准上线。**

## 目前核验结果

- GitHub CI：隔离 PostgreSQL 完成新增 RPC → 撤回 → 重新新增，及管理/员工权限回归测试。最新结果以同 SHA CI 为准。
- Supabase 生产库：存在启用的 manager 1 名、employee 1 名，二者均在 `auth.users` 中有账户，并有会话记录；**会话记录不是实际 JWT**。
- 生产 RLS 角色上下文的只读测试：manager 可读取 12 条草稿，employee 读取 0 条；任务读取仍受原 RLS 控制。
- 真实 JWT 只读验证：脚本 `tests/real-jwt-roles-readonly.cjs` 已创建，但未提供两个有效临时会话令牌，**尚未执行**。
- 生产新 RPC `kb_review_memory_with_reason(uuid,boolean,text)` 不存在。旧 RPC 存在，`authenticated` 和 `service_role` 仍有 EXECUTE，且旧调用方尚未充分确认。
- 目前 12 条 DRAFT、0 APPROVED，不能用生产草稿充当测试样本。

## 真实 JWT 验收（只读，不上传令牌）

在受信任的执行端本地设置临时环境变量 `SUPABASE_PUBLISHABLE_KEY`、`YINUO_MANAGER_TEST_JWT`、`YINUO_EMPLOYEE_TEST_JWT`，执行 `node tests/real-jwt-roles-readonly.cjs`。只查询 `auth/v1/user`、`ops_members`、草稿的最小字段和任务 ID。脚本不记录令牌，不调用审批、不写知识。结束后销毁临时令牌环境。遇到账号授权信息不一致停止，不扩大授权。

## 生产迁移顺序

1. 确认备份恢复点、记录当前函数定义与权限、负责人签核及已有 RPC 调用方。
2. **仅在单独授权后**通过受控 Supabase 迁移渠道安装 `sql/kb_review_additive_STAGED_REVOKED.sql`，新 RPC 对 `PUBLIC`、`anon`、`authenticated`、`service_role` 默认不可执行，旧 RPC 不动。
3. 只读 catalog 核对新签名与 ACL；`tests/p0_staged_rollback_roundtrip.sql` 已在隔离库验证安装/回滚/再安装。
4. 完成真实 JWT/RLS 和新 RPC 的受控测试。需要隔离测试记录，不得审批真实知识。
5. 排查全部旧调用方；先部署保护的 Preview，并确认员工权限及旧 ERP 回归。
6. 经过**新的明确生产切换授权**后，才允许 `sql/p0_review_release_gate_DO_NOT_RUN.sql` 修改新旧 RPC 执行授权。此时还须单独核查 `service_role` 旁路访问风险。
7. 正式审核按钮在真实环境签核前保持 `REVIEW_RELEASE_ENABLED=false`；不可仅因为 SQL 已安装就开启。

## 回滚和发布阻断

- 仅在新 RPC **未对任何 API 角色开放权限**时才可执行 `sql/kb_review_staged_ROLLBACK_DO_NOT_RUN.sql`；如已经切换权限，必须重新制定回滚方案。
- **阻断**：缺少真实 JWT 验收；没有授权迁移渠道或备份；旧接口使用者未确认；新旧授权并存可能绕过审核意见；管理员审核和审计链未完成端到端测试；最终 CI/Preview 与发布 SHA 不一致。
- 本文件不授权生产 DDL、不授权审批真实知识、不授权合并 PR #3、不授权正式发布 ERP。
