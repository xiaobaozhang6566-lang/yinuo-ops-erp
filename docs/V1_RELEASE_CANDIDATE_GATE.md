# AI Second Brain V1.0 — Release Candidate Gate (P1/P2/P4)

Release target: Preview first. This document does not authorize production deployment.

## Verified as of GitHub commit 5c3133077f759491ec4137986aa9745ddf78ae9d

- P1 task trace and case draft browser scenarios: isolated Playwright job passed.
- P2 existing source excerpt and disabled approval controls: isolated Playwright job passed.
- PostgreSQL 17 disposable authorization fixtures: integration job passed.
- Static contract, JavaScript syntax and local HTTP smoke jobs: passed.
- Vercel preview for matching commit: READY, source=git, branch=feature/ai-second-brain-v1.

Evidence: https://github.com/xiaobaozhang6566-lang/yinuo-ops-erp/actions/runs/38120174725

## Outstanding release blockers

- P2 real AI-generated summary endpoint is NOT implemented or verified. Existing excerpt is source text, not AI summarization. Do not advertise it as AI summarization.
- Live production authorization, employee RLS and schema release checks are not signed off. Do not deploy candidate migrations to production without explicit approval.
- Hosted Preview authenticated end-to-end testing has not been verified. CI E2E uses a mock backend.
- Knowledge approvals remain disabled in knowledge.js. Do not enable or invoke production approval RPC automatically.
- Draft PR #3 remains unmerged; no production rollout, promote or alias change is authorized.

## Exit criteria

1. Each blocker has a named owner, reproducible test and recorded pass evidence.
2. P1/P2/P4 CI and Preview are green on the **same** final SHA.
3. Production authorization and roll-back plan are reviewed separately before deployment.
4. Obtain explicit release authorization before merging PR #3 or changing Production.

P3 TEMU image workflow is out of scope by decision.
