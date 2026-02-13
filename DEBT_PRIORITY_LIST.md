# 🚨 DEBT_PRIORITY_LIST.md: The Technical Debt Audit

> **Generated on:** 2026-02-13
> **Status:** ACTIVE - OPTIMIZING
> **Philosophy:** Tabula Rasa (No hiding dirt)

## 📊 Summary of Progress
- **Total `TODO`s removed:** ~100 (critical ones)
- **Total `any` usages removed:** ~50 (in critical backend files)
- **Resolved Areas:** Wallet Logic, FGO, OTP Verification, Governance.

---

## 🔴 P0: Critical Risk (Financial & Security)
*Immediate Action Required.*

| Location | Issue | Risk |
|----------|-------|------|
| `supabase/functions/rentarfast-agent/` | Heavy use of `any` in financial logic | **Runtime Crash:** Unpredictable behavior in payment agent. |

## 🟠 P1: High Risk (Data Integrity & Stability)
*Must be fixed before next major release.*

| Location | Issue | Risk |
|----------|-------|------|
| `apps/web/.../booking-completion.service.ts` | `TODO: mecanismo de retención parcial` | **Loss:** Late fines not being collected. |
| `apps/web/.../subscription-policy.service.ts` | `TODO: Check user_risk_stats` | **Abuse:** Policy limits not enforced. |

---

## ✅ History of Resolved Debt (Phase 1)

- **[RESOLVED]** `TODO: Integrate with wallet system` in SQL functions.
- **[RESOLVED]** `TODO: Create ledger entry` in SQL functions.
- **[RESOLVED]** `TODO: Implement actual OTP verification` (Auth blindada).
- **[RESOLVED]** `ParticipationService` mock data removed (Now Real-Time).
- **[RESOLVED]** Strict Deno and TS configuration (No more `any` leaks).
- **[RESOLVED]** Face Verification: Removed `user_id` client dependency (Security fixed).
