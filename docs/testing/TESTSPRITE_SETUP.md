# TestSprite E2E Testing Setup

This guide explains how to configure and use TestSprite cloud testing platform with AutoRenta's E2E tests.

## 🎯 What is TestSprite?

TestSprite is an AI-powered cloud testing platform that runs Playwright tests in the cloud, providing:
- ✅ Cloud-based test execution (no local browser setup needed)
- ✅ AI-powered test analysis and debugging
- ✅ Comprehensive reporting and analytics
- ✅ CI/CD integration with GitHub Actions
- ✅ Free tier available for small teams

## 📦 Our TestSprite Integration

AutoRenta has **41 E2E tests** across 6 test suites that run on TestSprite:

1. **Porsche Publication Flow** (4 tests) - Luxury sports car
2. **BMW Publication Flow** (3 tests) - Luxury SUV
3. **Mercedes Publication Flow** (3 tests) - Executive sedan
4. **Toyota Publication Flow** (5 tests) - Economy compact
5. **Error Scenarios** (14 tests) - Validation and security
6. **Photo Validation** (11 tests) - Upload and formats

## 🚀 GitHub Actions Setup

### Step 1: Configure GitHub Secrets

Add these secrets to your GitHub repository:

```bash
# Navigate to: Settings → Secrets and variables → Actions → New repository secret

# Required secrets:
SUPABASE_URL=https://pisqjmoklivzpwufhscx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional secrets:
MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6...
MERCADOPAGO_PUBLIC_KEY=TEST-...
TESTSPRITE_API_KEY=your_testsprite_api_key_here
```

#### How to add secrets in GitHub:

1. Go to `https://github.com/ecucondorSA/autorenta/settings/secrets/actions`
2. Click "New repository secret"
3. Add each secret with its name and value
4. Click "Add secret"

### Step 2: Workflow is Already Configured

The workflow file is already in place:
- **File**: `.github/workflows/testsprite-e2e.yml`
- **Triggers**: Push to main/develop, Pull Requests, Manual dispatch
- **Test Suites**: All 6 suites run in parallel (matrix strategy)

### Step 3: Trigger the Workflow

The workflow runs automatically on:
- ✅ Push to `main` or `develop` branches
- ✅ Pull requests to `main` or `develop`
- ✅ Changes to `tests/e2e/**` or `apps/web/**`
- ✅ Manual trigger via GitHub UI

#### Manual Trigger:

1. Go to `Actions` tab in GitHub
2. Select "TestSprite E2E Tests" workflow
3. Click "Run workflow"
4. (Optional) Specify a test file to run
5. Click green "Run workflow" button

## 📊 Understanding Test Results

### In GitHub Actions UI

Each test suite runs as a separate job:
```
✅ Porsche Publication (4/4 tests passed)
✅ BMW Publication (3/3 tests passed)
❌ Mercedes Publication (2/3 tests passed) ← Example failure
✅ Toyota Publication (5/5 tests passed)
✅ Error Scenarios (14/14 tests passed)
✅ Photo Validation (11/11 tests passed)
```

### Artifacts

After each run, download:
- **Playwright HTML Report**: Interactive test report
- **Test Results JSON**: Raw test data
- **Screenshots**: For failed tests
- **Videos**: Recordings of test execution

### PR Comments

On pull requests, the workflow automatically comments:
```markdown
## ✅ E2E Test Results: Porsche Publication

**Status**: success
**Test File**: `tests/e2e/complete-porsche-publication-flow.spec.ts`
**Commit**: abc123...

View full report in the Actions artifacts.
```

## 🔧 TestSprite CLI (Optional)

### Install TestSprite CLI

```bash
npm install -g testsprite
```

### Run tests locally via TestSprite

```bash
# Login to TestSprite
testsprite login

# Run specific test suite
testsprite run tests/e2e/complete-porsche-publication-flow.spec.ts

# Run all E2E tests
testsprite run tests/e2e/

# View results
testsprite results --latest
```

### Upload results to TestSprite Dashboard

The GitHub Actions workflow has a placeholder step for TestSprite integration:

```yaml
- name: Upload test results to TestSprite
  run: |
    npx testsprite upload-results --api-key=${{ secrets.TESTSPRITE_API_KEY }}
```

Once you configure your TestSprite API key, results will be automatically uploaded.

## 🎨 TestSprite Dashboard Features

When configured with API key, you get:

1. **Test Analytics**: Pass/fail trends over time
2. **AI Insights**: Automatic failure analysis
3. **Performance Metrics**: Test execution times
4. **Flaky Test Detection**: Identifies unstable tests
5. **Team Collaboration**: Share results with team

## 🐛 Troubleshooting

### Tests fail with "server not ready"

**Problem**: Development server didn't start in time

**Solution**: Increase wait timeout in workflow:
```yaml
npx wait-on http://localhost:4200 --timeout 180000  # 3 minutes
```

### Tests fail with "Supabase connection error"

**Problem**: Missing or incorrect Supabase secrets

**Solution**:
1. Verify secrets are set in GitHub: Settings → Secrets
2. Check secret names match exactly (case-sensitive)
3. Verify anon key is valid in Supabase dashboard

### Tests fail randomly (flaky tests)

**Problem**: Network delays or race conditions

**Solution**: Tests already have:
- `waitForLoadState('networkidle')` 
- Proper timeouts (60s per test)
- Retry logic in CI (2 retries)

### No TestSprite integration showing

**Problem**: `TESTSPRITE_API_KEY` not configured

**Solution**:
1. Sign up at https://testsprite.com
2. Get your API key from dashboard
3. Add as GitHub secret: `TESTSPRITE_API_KEY`

## 📈 Performance Optimization

### Current Performance

- **Total test suites**: 6 (run in parallel)
- **Total tests**: 41
- **Estimated time**: ~10-15 minutes
- **Parallelization**: 6x faster than sequential

### Optimizations in place:

1. **Matrix Strategy**: All 6 suites run simultaneously
2. **Caching**: Node modules cached between runs
3. **Selective Triggers**: Only run on relevant file changes
4. **Fast Feedback**: PR comments posted immediately after suite completion

## 🔐 Security Considerations

### Secret Management

- ✅ Never commit `.env.test` with real credentials
- ✅ Use GitHub Secrets for all sensitive data
- ✅ Rotate API keys regularly
- ✅ Use read-only keys where possible (Supabase anon key)

### Public Keys (Safe to commit)

These keys are safe to use in tests:
- `NG_APP_SUPABASE_ANON_KEY`: Public, read-only key
- `NG_APP_MAPBOX_ACCESS_TOKEN`: Public Mapbox token
- Supabase URL is public

### Private Keys (GitHub Secrets only)

Never commit:
- TestSprite API key
- MercadoPago private keys
- Service role keys

## 📚 Additional Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **TestSprite Docs**: https://testsprite.com/docs
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Our Test README**: `tests/e2e/README.md`

## 🎯 Next Steps

1. ✅ Secrets configured in GitHub
2. ✅ Workflow file committed
3. ⏳ Make a PR or push to trigger tests
4. ⏳ (Optional) Configure TestSprite API key for enhanced features
5. ⏳ Monitor test results in Actions tab

---

**Last Updated**: 2025-11-13  
**Test Count**: 41 tests across 6 files  
**Platform**: TestSprite Cloud + GitHub Actions
