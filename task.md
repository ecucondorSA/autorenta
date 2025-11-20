# Task: Stabilize Renter Flow V3

## Status
- [ ] **Secure Current Work** <!-- id: 0 -->
    - [ ] Commit pending changes in `feature/renter-flow-v3` <!-- id: 1 -->
    - [ ] Verify current build status <!-- id: 2 -->
- [ ] **Sync & Foundation** <!-- id: 3 -->
    - [ ] Check for updates in `main` (Tech Debt fixes) <!-- id: 4 -->
    - [ ] Merge `main` into `feature/renter-flow-v3` <!-- id: 5 -->
    - [ ] Resolve any conflicts <!-- id: 6 -->
    - [ ] Run `npm run sync:types` to ensure type safety <!-- id: 7 -->
- [ ] **Audit & Fix (The Golden Path)** <!-- id: 8 -->
    - [ ] **Database**: Verify `bookings` and `wallets` tables have necessary constraints for the new flow <!-- id: 9 -->
    - [ ] **RLS**: Verify security policies for the new renter flow <!-- id: 10 -->
    - [ ] **Tests**: Fix or add E2E test for the critical path of Renter Flow V3 <!-- id: 11 -->
- [ ] **Verification** <!-- id: 12 -->
    - [ ] Run full E2E suite <!-- id: 13 -->
