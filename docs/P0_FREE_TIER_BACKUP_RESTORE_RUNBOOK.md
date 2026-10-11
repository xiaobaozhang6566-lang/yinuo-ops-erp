# 亦诺 AI OS — Free 版 Supabase 生产备份与恢复验收

适用：项目 `iscadepgzegrvcqzosso`，仅在得到数据库负责人授权后执行。**本文件不是备份文件，也不证明当前拥有可恢复备份。**

## 操作前检查

1. 从 Supabase 项目 Dashboard → Connect 获取专用数据库连接字符串，在受信任的电脑或 CI 受保护密钥环境使用，禁止上传到 ChatGPT、GitHub 仓库、PR、终端共享日志。
2. 验证已安装与生产 PostgreSQL 主版本兼容的 Supabase CLI、Docker、psql；运行各自 `--help` 确认当前可用参数。
3. 明确备份密钥保管、加密存储位置、恢复演练设备、恢复点时间、责任人与授权。Free 项目不能默认依靠平台每日自动备份。

## 官方支持的逻辑备份方式

官方参考：https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

在**只有授权人员能访问的可信环境**，通过 Supabase CLI `db dump --db-url` 分别导出 schema、roles 和数据（参考官方实时文档的 `--role-only`、`--data-only`、`--use-copy`）。连接字符串须由本机安全密钥管理提供，不能硬编码到脚本、GitHub Actions 配置或聊天内容。

注意：Supabase CLI 默认忽略 `auth`、`storage` 等托管 schema；以上三份导出**不是包含 Auth 用户、对象存储文件、Edge Functions 的完整平台快照**。必须另外依据官方恢复文档评估 Auth、Storage、数据库扩展和服务端密钥的恢复范围。严禁把 `service_role` 密钥或真实 JWT 写入备份报告。

## 恢复验证（必须完成）

- 使用**单独的隔离 PostgreSQL / Supabase 目标**还原，绝不直接对生产执行恢复测试；目标必须无业务数据。
- 记录导出 SHA-256、数据库版本、导出完成时间、加密存储位置的引用（非真实路径和密钥）、恢复测试日志 ID、恢复耗时、负责人签核。
- 校验 schema、角色与权限、关键函数及索引；验证 `ai_p0_memories`、`ops_members`、`ops_tasks` 的数据行数与相应 RLS 策略是否与备份时的**只读快照**一致。
- 如果需要完整 ERP 业务恢复能力，还必须演练 Auth 会话/用户与 Storage 对象的恢复或提供相应的正式灾备方案。不能仅凭恢复三个 SQL 导出认定整套 ERP 可恢复。

## 当前上线门禁

备份尚未执行、也未验证成功；生产迁移保持阻断。完成上述步骤之后，需额外通过两角色真实 JWT 只读访问测试与旧审批 RPC 切换授权。生产 DDL、PR 合并、AI 模型联调目前均不在自动执行范围。
