# 组织责任绑定 V1｜现有结构复用（设计文件，未写入生产）

## 实际数据库结构（只读核验）
- `ops_team_members(team_id,user_id,member_role,is_active)`：团队人员映射，现有 3 条。
- `ops_store_assignments(store_id,team_id,primary_user_id,updated_by)`：ERP 生效责任，现有 1 条。
- `ai_p0_store_claims(staff_id,store_id,responsibility,status,applied_to_ops,approved_by,approved_at)`：AI 认领记录，现有 4 条。
- `ops_store_change_history`：责任调整留痕。

## 数据边界
1. 已确认的 AI 责任配置不等于自动覆盖 ERP 的 `ops_store_assignments`；需要额外的审批和显式执行。
2. 待确认店铺维持未绑定，绝不能根据店铺名称猜测 `staff_id`。
3. 同名店铺必须依靠 `stores.id` 和可验证的别名，禁止直接文本模糊关联。
4. `applied_to_ops` 为执行标记，不能仅用 `status` 推断已进入 ERP 生产权限。
5. 知识 TEAM/STORE 授权必须依据已验证的成员关系和店铺责任；员工账号禁用时立即失去访问资格。

## 执行顺序
1. 生成只读组织映射审计报告：对应关系、未匹配员工、未匹配店铺、历史冲突。
2. 对 AI 责任认领做完整性检查，审批状态与执行状态分开。
3. 在隔离测试数据库验证 TEAM/STORE 访问控制矩阵。
4. 只有获得明确授权并经过自动测试，才考虑将权限策略迁移到生产。

## 禁止动作
不修改现有任务、员工权限、店铺归属或生产知识审批；不根据姓名相似度自动绑定。
