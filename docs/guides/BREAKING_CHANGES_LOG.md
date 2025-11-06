# Breaking Changes Log

**Purpose:** Document breaking changes that affect API contracts, database schema, or cross-domain dependencies.

---

## Template for New Entries

```markdown
## [YYYY-MM-DD] - [Service/Component/Table Name]

**Change Type:** [Breaking Change | Database Migration | API Change | Refactoring]

**Description:**
Brief description of what changed and why.

**Affected Components/Services:**
- `Service1.method()` (line X in file.ts)
- `Component1.method()` (line Y in file.ts)
- `table_name` (database table)

**Breaking Changes:**
1. Method signature changed from `old()` to `new()`
2. Removed property `xyz` from interface
3. Database column renamed from `old_name` to `new_name`

**Migration Guide:**

**Before:**
\```typescript
// Old code
service.oldMethod(param1, param2);
\```

**After:**
\```typescript
// New code
service.newMethod({ param1, param2 });
\```

**Database Migration (if applicable):**
\```sql
-- Migration up
ALTER TABLE table_name ADD COLUMN new_column TEXT;

-- Migration down (rollback)
ALTER TABLE table_name DROP COLUMN new_column;
\```

**Testing Checklist:**
- [ ] Unit tests updated
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

**Rollback Plan:**
If issues occur:
1. Revert commit: `git revert <commit-hash>`
2. Run down migration: `supabase migration down`
3. Deploy reverted code

**Related Documentation:**
- See `docs/flows/FLOW_NAME.md` for updated flow
- See `docs/architecture/DEPENDENCY_GRAPH.md` for dependency changes
```

---

## Change History

### [2025-11-06] - Initial Documentation

**Change Type:** Documentation

**Description:**
Created comprehensive architectural documentation for surgical code changes.

**Deliverables:**
- `docs/architecture/DEPENDENCY_GRAPH.md`
- `docs/architecture/LAYER_SEPARATION.md`
- `docs/architecture/DOMAIN_BOUNDARIES.md`
- `docs/architecture/DOMAIN_DEPENDENCY_MATRIX.md`
- `docs/flows/FLOW_*.md` (5 flow documents)
- `docs/guides/SAFE_CHANGE_CHECKLIST.md`
- `tools/analyze-dependencies.sh`
- `tools/validate-change.sh`

**Impact:** No breaking changes (documentation only)

---

## Example Entry

### [2025-10-28] - Cash Deposits Non-Withdrawable Fix

**Change Type:** Database Migration + RPC Change

**Description:**
Fixed wallet deposit logic to mark cash deposits (Pago Fácil/Rapipago) as non-withdrawable while still allowing them for bookings.

**Affected Components/Services:**
- `WalletService.initiateDeposit()` (apps/web/src/app/core/services/wallet.service.ts:136)
- `wallet_confirm_deposit_admin()` RPC (apps/web/database/wallet/rpc_wallet_confirm_deposit_admin.sql:11)
- `wallet_get_balance()` RPC (apps/web/database/wallet/rpc_wallet_get_balance.sql:13)
- `user_wallets` table (added `non_withdrawable_floor` column)

**Breaking Changes:**
1. Added `non_withdrawable_floor` column to `user_wallets` table
2. Modified `wallet_confirm_deposit_admin()` RPC to detect cash deposits
3. Modified `wallet_get_balance()` RPC to return `withdrawable_balance` separately

**Migration Guide:**

**Database Migration:**
\```sql
-- Migration up
ALTER TABLE user_wallets ADD COLUMN non_withdrawable_floor NUMERIC(10, 2) DEFAULT 0;

-- Migration down
ALTER TABLE user_wallets DROP COLUMN non_withdrawable_floor;
\```

**RPC Changes:**
- `wallet_confirm_deposit_admin()`: Now detects `payment_type_id = 'ticket'` and increments `non_withdrawable_floor`
- `wallet_get_balance()`: Now returns separate `withdrawable_balance` and `non_withdrawable_balance`

**Testing Checklist:**
- [x] Unit tests updated for WalletService
- [x] RPC tests pass
- [x] E2E wallet deposit flow tested (cash + card)
- [x] Verified cash deposits marked as non-withdrawable

**Rollback Plan:**
1. Revert migration: `supabase migration down`
2. Revert RPC changes: Deploy previous RPC versions
3. Revert frontend: `git revert <commit-hash>`

**Related Documentation:**
- See `docs/flows/FLOW_WALLET_DEPOSIT.md` for updated flow
- See `CASH_DEPOSITS_NON_WITHDRAWABLE_FIX.md` for complete analysis

---

_Add new entries above this line, most recent first._
