# 🎯 Quick Start - Testing Phase

**Created:** 2025-10-28  
**Repository:** ecucondorSA/autorenta

---

## ✅ What I've Done

### 1. Created Comprehensive Guide
- **File:** `IMPLEMENTATION_GUIDE_TESTING_PHASE.md`
- **Content:** Step-by-step instructions for all tasks
- **Sections:** 
  - Priority tasks breakdown
  - Testing strategy
  - Code examples
  - Verification commands

### 2. Created Setup Script
- **File:** `testing-phase-setup.sh`
- **Features:**
  - Checks GitHub secrets configuration
  - Verifies E2E workflow exists
  - Creates test user verification script
  - Checks dependencies
- **Usage:** `./testing-phase-setup.sh`

### 3. Created Test Fixtures
- **File:** `tests/fixtures/test-credentials.ts`
- **Content:**
  - Test user credentials
  - MercadoPago test cards
  - Test booking data
  - Selectors and endpoints
  - Reusable test data

---

## 🚀 Next Steps (In Order)

### Step 1: Configure GitHub Secrets (5 min)
```bash
# Go to: https://github.com/ecucondorSA/autorenta/settings/secrets/actions
# Add these 3 secrets:
# 1. SUPABASE_URL
# 2. SUPABASE_ANON_KEY  
# 3. MERCADOPAGO_TEST_ACCESS_TOKEN
```

### Step 2: Create Test User (5 min)
```bash
# Method 1: Supabase Dashboard
# Go to: https://your-project.supabase.co/auth/users
# Click "Add User"
# Email: test-renter@autorenta.com
# Password: TestPassword123!
# ✅ Auto-confirm email

# Method 2: SQL (see guide)
```

### Step 3: Verify Setup (2 min)
```bash
cd /home/edu/autorenta

# Run setup check
./testing-phase-setup.sh

# Verify test user
node verify-test-user.mjs
```

### Step 4: Run Tests Locally (5 min)
```bash
# Install if needed
pnpm install

# Run E2E tests
pnpm test:e2e

# Or run specific test
pnpm test:e2e tests/auth/01-register.spec.ts
```

### Step 5: Push and Trigger CI/CD (5 min)
```bash
# Create feature branch
git checkout -b feat/testing-phase-setup

# Add new files
git add IMPLEMENTATION_GUIDE_TESTING_PHASE.md
git add testing-phase-setup.sh
git add tests/fixtures/test-credentials.ts
git add TESTING_PHASE_QUICKSTART.md

# Commit
git commit -m "feat: add testing phase infrastructure

- Add comprehensive testing guide
- Add setup verification script
- Add test credentials fixtures
- Prepare for CI/CD verification"

# Push
git push origin feat/testing-phase-setup

# Create PR (triggers E2E workflow)
gh pr create \
  --title "feat: Testing Phase Infrastructure" \
  --body "Adds testing infrastructure for production readiness. See IMPLEMENTATION_GUIDE_TESTING_PHASE.md for details."
```

### Step 6: Monitor Workflow (10 min)
```bash
# Watch workflow execution
gh run watch

# Or view logs
gh run list --workflow=e2e-tests.yml
gh run view <run-id> --log

# Check status
gh run list --limit 1
```

---

## 📋 Task Status

### 🟢 Critical (This Week)

| # | Task | Status | Time | Priority |
|---|------|--------|------|----------|
| 1 | Configure GitHub Secrets | 🔴 TODO | 5 min | P0 |
| 2 | Verify CI/CD Tests | 🔴 TODO | 10 min | P0 |
| 3 | Create Test User | 🔴 TODO | 5 min | P0 |

### 🟠 High (Next 2 Weeks)

| # | Task | Status | Time | Priority |
|---|------|--------|------|----------|
| 4 | Booking Cancellation Tests | 🟡 TODO | 2-3 hrs | P1 |
| 5 | Real MP Sandbox Tests | 🟡 TODO | 3-4 hrs | P1 |
| 6 | Increase Coverage to 60% | 🟡 TODO | 4-6 hrs | P1 |

---

## 🔧 Quick Commands

### Testing
```bash
# All E2E tests
pnpm test:e2e

# With UI
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug

# Specific test
pnpm test:e2e tests/renter/booking/payment-card.spec.ts

# Coverage
pnpm test:coverage
```

### GitHub
```bash
# Check secrets
gh secret list

# View workflow runs
gh run list --workflow=e2e-tests.yml

# Watch current run
gh run watch

# View logs
gh run view <run-id> --log
```

### Verification
```bash
# Test user login
node verify-test-user.mjs

# Check MP credentials
curl -X GET \
  "https://api.mercadopago.com/v1/payment_methods" \
  -H "Authorization: Bearer $MERCADOPAGO_TEST_ACCESS_TOKEN"

# Setup check
./testing-phase-setup.sh
```

---

## 📁 Files Created

```
autorenta/
├── IMPLEMENTATION_GUIDE_TESTING_PHASE.md  # Complete guide
├── TESTING_PHASE_QUICKSTART.md            # This file
├── testing-phase-setup.sh                 # Setup script
├── verify-test-user.mjs                   # User verification
└── tests/
    └── fixtures/
        └── test-credentials.ts            # Test data
```

---

## 🎯 Success Criteria

### Week 1
- [ ] All 3 secrets configured in GitHub
- [ ] Test user created and verified
- [ ] E2E workflow passes (green checkmark)
- [ ] No critical test failures

### Week 2-3
- [ ] Booking cancellation tests implemented
- [ ] Real MP sandbox tests working
- [ ] Test coverage at 60%+
- [ ] All critical flows covered

---

## 💡 Tips

1. **Start with secrets** - Everything else depends on them
2. **Test locally first** - Catch issues before CI/CD
3. **Use the setup script** - It checks everything
4. **Follow the guide** - It has all the details
5. **Check existing tests** - Good patterns to follow

---

## 📚 Documentation

- **Detailed Guide:** `IMPLEMENTATION_GUIDE_TESTING_PHASE.md`
- **E2E Tests:** `tests/README.md`
- **Playwright Config:** `playwright.config.ts`
- **CI/CD Workflow:** `.github/workflows/e2e-tests.yml`

---

## 🆘 Common Issues

### Issue: Secrets not found
**Solution:** Configure at GitHub Settings → Secrets → Actions

### Issue: Test user login fails
**Solution:** Run `node verify-test-user.mjs` to check status

### Issue: Tests timeout locally
**Solution:** Increase timeout in `playwright.config.ts`

### Issue: CI/CD fails to build
**Solution:** Check build logs: `gh run view <id> --log`

---

## 📞 Need Help?

1. Check the detailed guide: `IMPLEMENTATION_GUIDE_TESTING_PHASE.md`
2. Review existing tests in `/tests` directory
3. Check workflow logs: `gh run view --log`
4. Test locally first: `pnpm test:e2e`

---

**Ready to start?** Run `./testing-phase-setup.sh` and follow Step 1 above! 🚀
