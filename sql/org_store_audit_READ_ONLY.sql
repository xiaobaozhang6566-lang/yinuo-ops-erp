-- Read-only AI/ERP store ownership audit. Execute as an authorized administrator.
-- Never infer staff IDs from names. Never UPDATE production assignments.
WITH claim_counts AS (
  SELECT store_id,COUNT(*) AS claim_count
  FROM public.ai_p0_store_claims GROUP BY store_id
),audit AS (
  SELECT s.id AS store_id,s.store_name,c.status AS claim_status,
   c.applied_to_ops,d.display_name AS ai_staff,
   d.account_user_id,a.primary_user_id,
   CASE
    WHEN COALESCE(cc.claim_count,0)>1 THEN 'MULTIPLE_CLAIMS'
    WHEN c.id IS NULL THEN 'UNCLAIMED'
    WHEN d.id IS NULL OR d.account_user_id IS NULL THEN 'IDENTITY_UNLINKED'
    WHEN c.applied_to_ops AND a.primary_user_id IS DISTINCT FROM d.account_user_id THEN 'OWNER_CONFLICT'
    WHEN NOT c.applied_to_ops THEN 'CONFIRMED_NOT_APPLIED'
    ELSE 'MATCHED'
   END AS audit_state
  FROM public.stores s
  LEFT JOIN claim_counts cc ON cc.store_id=s.id
  LEFT JOIN public.ai_p0_store_claims c ON c.store_id=s.id
  LEFT JOIN public.ai_p0_staff_directory d ON d.id=c.staff_id
  LEFT JOIN public.ops_store_assignments a ON a.store_id=s.id
)
SELECT store_name,ai_staff,claim_status,applied_to_ops,audit_state
FROM audit ORDER BY audit_state,store_name;
