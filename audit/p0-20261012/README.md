# P0 recovery and validation checklist (2026-10-12)

Scope: audit and test only. No database repair is authorized by this file.

## Deploy verification
- Deployed `publish-erp-static` version 6 via Supabase. Source requires POST, user session and manager membership. The built-in deployment readback was checked.
- Live HTTP verification of 405 for GET, 401 for unauthenticated POST, 403 for employee POST, and successful authorized manager POST is PENDING. Do not trigger a successful manager publish except during an approved release window.
- Before next redeploy, capture the deployed version/source into a restricted/private backup location; never commit service secrets or private production material in this public repository.

## Authorization review
- Do not automatically revoke EXECUTE on all SECURITY DEFINER functions.
- Review effective membership checks and ownership predicates for every authenticated-callable RPC; test negative authorization against isolated fixtures and real role sessions.
- Four internal reporting tables have RLS enabled, no policies and no direct SELECT grants to authenticated/anon; this is not by itself a security leak.

## Source integrity
- A shipping_fee import batch is marked processed with 1019 reported rows, but shipping_fee_ledger has zero rows; preserve the CRITICAL quality issue.
- Original shipping fee file is not present under a matching file name in Supabase Storage. Do NOT synthesize fee records or mark this batch as reconciled.
- Confirm raw original file and its checksum before any reimport; compare row count, parcel ID, currency, source sign, duplicates, and effective store.
- Cost master mapping table has 482 verified store+SPU identities, but only 12 of 22 daily fact rows match by store+SPU. Check source coverage before changing mapping keys.
- No current daily profit is release-ready: facts are partial.

## Gates
- Production change requires rollback or recoverable backup, staging test, review and live smoke check.
- Vercel team authorization remains blocked; no automatic production promotion.
