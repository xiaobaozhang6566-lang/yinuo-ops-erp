# AI 店铺责任只读审计｜2026-10-11

## 正确身份链
`ai_p0_store_claims.staff_id → ai_p0_staff_directory.id → ai_p0_staff_directory.account_user_id → ops_store_assignments.primary_user_id`。
不得直接比较 staff_id 和 primary_user_id；那会产生误报。

## 核验结果
| 店铺 | AI 确认责任人 | AI 状态 | 应用 ERP | ERP 对应 |
|---|---|---|---|---|
| 5号 | 宝哥 | SYSTEM_VERIFIED | 是 | 已建立且匹配 |
| 6号 | 宝哥 | USER_CONFIRMED | 否 | 未绑定 |
| 8号 | 宝哥 | USER_CONFIRMED | 否 | 未绑定 |
| E店铺 | 宝哥 | USER_CONFIRMED | 否 | 未绑定 |

上述 4 条均具有可映射的正式用户账号。没有证据表明已经应用的 5号存在责任人冲突。未应用的 3 条应保持 AI 目录已确认、ERP 生产未绑定的分离状态。

## 自动审计规则
1. 仅 `applied_to_ops=true` 的认领可参与 ERP 一致性核验；核验其账户绑定与正式责任人是否匹配。
2. `USER_CONFIRMED` 与 `applied_to_ops=false` 应列为待执行，而非数据错误。
3. `staff_id` 无有效 AI 目录记录、已停用、无 `account_user_id` 时，输出身份异常，禁止自动写入正式表。
4. 未出现于 claims 的其他店铺保持未绑定，不能猜测。
5. 仅只读核查，不更新 `ops_store_assignments`、`ops_members` 或 `ai_p0_store_claims`。

## 测试约束
本报告基于生产库只读查询；未来自动审计应验证映射有效性、冲突和待执行状态，并在隔离环境测试，不应自动覆盖生产权限。
