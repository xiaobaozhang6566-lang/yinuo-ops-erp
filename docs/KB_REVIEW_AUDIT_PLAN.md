# 知识审批意见留痕方案（未上线）

已核实 `ai_p0_audit_log.details` 为 jsonb 对象，可复用。

计划新增 `kb_review_memory_with_reason(memory_id, approve, reason)` RPC：先验证管理员权限及审核意见长度，在同一数据库事务内调用现有 `ai_p0_review_memory`，并将审核意见写入该次审批审计事件的 `details.review_reason`。若任一步失败，整体回滚。

上线前必须在隔离测试库验证并发审批、权限、审计绑定与事务回滚。旧接口不删除，需限制直接调用绕过审核意见的路径。生产数据库及原有 12 条草稿目前不变。
