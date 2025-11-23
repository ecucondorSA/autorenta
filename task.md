# Task: Stabilize Renter Flow V3

## Status
- [x] **Secure Current Work** <!-- id: 0 -->
    - [x] Commit pending changes in `feature/renter-flow-v3` <!-- id: 1 -->
    - [ ] Verify current build status <!-- id: 2 -->
- [x] **Sync & Foundation** <!-- id: 3 -->
    - [x] Check for updates in `main` (Tech Debt fixes) <!-- id: 4 -->
    - [x] Merge `main` into `feature/renter-flow-v3` <!-- id: 5 -->
    - [x] Resolve any conflicts <!-- id: 6 -->
    - [x] Run `npm run sync:types` to ensure type safety <!-- id: 7 -->
- [ ] **Audit & Fix (The Golden Path)** <!-- id: 8 -->
    - [ ] **Database**: Verify `bookings` and `wallets` tables have necessary constraints for the new flow <!-- id: 9 -->
    - [ ] **RLS**: Verify security policies for the new renter flow <!-- id: 10 -->
    - [ ] **Tests**: Fix or add E2E test for the critical path of Renter Flow V3 <!-- id: 11 -->
- [ ] **Verification** <!-- id: 12 -->
    - [ ] Run full E2E suite <!-- id: 13 -->
