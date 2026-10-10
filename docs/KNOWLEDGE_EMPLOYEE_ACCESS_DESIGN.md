# AI 第二大脑：员工知识读取权限方案（设计稿，未部署）
## 现状（已通过只读数据库核查）
- ai_p0_memories 当前只有管理员 SELECT RLS。
- ops_members 记录 user_id / role / is_active，无 team_id。
- ops_teams 存在但成员归属不在 ops_members 表内。
- ai_p0_memories 只有 scope 枚举，没有独立的 team_id/store_id/product_id 范围标识字段。
## 安全结论
不得直接允许所有 authenticated 用户读取 status=APPROVED 的整个表，因为 COMPANY/TEAM/STORE/PRODUCT 作用域尚无法在行级安全中可靠解析。也不能在前端做过滤后视为安全。
## 建议按阶段实施
1. 独立的知识授权关系表（memory_id, principal_type, principal_id, granted_by, granted_at）。数据库端约束与核验，默认无授权，管理员维护授权。普通员工永远无法读取 DRAFT/REJECTED/SUPERSEDED。
2. 定义 COMPANY、TEAM、STORE、PRODUCT 的精确映射与团队/店铺成员关系，禁止依赖 title、memory_key 的文本推断。
3. 增加 SECURITY INVOKER 的只读数据视图或受 RLS 约束的单独 RPC，返回经过审批、审核时间有效、未过期且授权匹配的最少字段。
4. 在隔离测试环境执行 manager/employee/inactive/other-team/other-store/expired/draft 的权限矩阵，禁止使用生产中的真实人员账号或知识进行破坏性测试。
5. 明确授权审批后再发布；在此之前员工无读取权限是预期行为。
## 上线阻断条件
- 未明确定义团队/店铺成员关系，不开放 TEAM/STORE/PRODUCT 权限。
- 旧审批 API 可绕过审核意见，不开放正式审核按钮。
- CI 和权限矩阵未完成，不合并 main / 不部署生产。
