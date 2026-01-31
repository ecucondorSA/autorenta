# Stress Tests for AutoRenta

High-load E2E stress tests using **Patchright** to simulate real-world heavy usage scenarios.

## Overview

These tests are designed to identify performance bottlenecks, memory leaks, and stability issues under load.

## Test Suites

### 1. Marketplace Stress Tests (`marketplace-stress.spec.ts`)
Tests car browsing functionality under heavy load:
- **Concurrent Users**: Simulates 5+ users browsing simultaneously
- **Rapid Filter Changes**: 20+ rapid filter applications
- **Rapid Car Navigation**: Quick navigation between car details
- **Map/List Toggle Stress**: Repeated view switching
- **Search Input Stress**: Rapid search queries
- **Memory Usage Under Load**: Heap monitoring during intensive operations

**Environment Variables:**
- `STRESS_CONCURRENT_USERS` - Number of concurrent users (default: 5)
- `STRESS_RAPID_ITERATIONS` - Number of rapid actions (default: 20)
- `STRESS_RAPID_DELAY` - Delay between actions in ms (default: 100)
- `STRESS_MEMORY_THRESHOLD` - Max memory increase in MB (default: 50)

### 2. Authentication Stress Tests (`auth-stress.spec.ts`)
Tests authentication system under pressure:
- **Concurrent Logins**: Multiple simultaneous login attempts
- **Rapid Auth Cycles**: 10+ login/logout cycles
- **Failed Login Stress**: Repeated failed attempts
- **Session Persistence Under Stress**: Session validation during navigation
- **Token Refresh Stress**: Frequent token clearing/refreshing
- **Password Input Stress**: Rapid input changes

**Environment Variables:**
- `AUTH_STRESS_CONCURRENT` - Concurrent login sessions (default: 5)
- `AUTH_STRESS_CYCLES` - Login/logout cycles (default: 10)
- `AUTH_STRESS_DELAY` - Delay between actions (default: 500ms)
- `AUTH_STRESS_MAX_FAIL` - Max failed attempts (default: 10)

### 3. Navigation Stress Tests (`navigation-stress.spec.ts`)
Tests routing and browser history under load:
- **Rapid Page Navigation**: 100+ quick route changes
- **Back/Forward Navigation**: Rapid history navigation
- **Concurrent Navigation**: Multiple users navigating simultaneously
- **Deep Link Navigation**: Direct URL access stress
- **Page Reload Stress**: Frequent page reloads
- **Route Parameter Stress**: Various query parameter combinations

**Environment Variables:**
- `NAV_STRESS_ITERATIONS` - Number of navigations (default: 100)
- `NAV_STRESS_CONCURRENT` - Concurrent sessions (default: 3)
- `NAV_STRESS_DELAY` - Delay between navigations (default: 50ms)
- `NAV_STRESS_MAX_TIME` - Max acceptable navigation time (default: 3000ms)

### 4. API Stress Tests (`api-stress.spec.ts`)
Tests API endpoints and rate limiting:
- **Rapid API Requests**: 200+ sequential API calls
- **Concurrent API Requests**: Multiple simultaneous API callers
- **Rate Limiting Detection**: Burst requests to trigger limits
- **Supabase API Stress**: Database query load testing
- **API Error Handling**: Invalid request handling
- **Network Interruptions**: Offline/online simulation

**Environment Variables:**
- `API_STRESS_ITERATIONS` - Number of API calls (default: 200)
- `API_STRESS_CONCURRENT` - Concurrent API sessions (default: 5)
- `API_STRESS_DELAY` - Delay between calls (default: 50ms)
- `API_STRESS_MAX_TIME` - Max response time (default: 2000ms)
- `API_STRESS_MAX_ERROR_RATE` - Max acceptable error % (default: 10)

## Quick Start

```bash
# Install dependencies
cd apps/web/e2e
npm install

# Run all stress tests
npm run test:stress

# Run individual stress test suites
npm run test:stress:marketplace
npm run test:stress:auth
npm run test:stress:navigation
npm run test:stress:api

# Run with visible browser (debugging)
npm run test:stress:headed

# Run with custom configuration
STRESS_CONCURRENT_USERS=10 STRESS_RAPID_ITERATIONS=50 npm run test:stress:marketplace

# Heavy load test
npm run test:stress:heavy

# CI mode (headless, optimized for CI/CD)
npm run test:stress:ci
```

## Configuration Examples

### Heavy Load Test
```bash
# Simulate 20 concurrent users with 500 rapid actions
STRESS_CONCURRENT_USERS=20 \
STRESS_RAPID_ITERATIONS=500 \
API_STRESS_ITERATIONS=1000 \
NAV_STRESS_ITERATIONS=500 \
npm run test:stress
```

### Quick Smoke Test
```bash
# Fast test with minimal load
STRESS_CONCURRENT_USERS=2 \
STRESS_RAPID_ITERATIONS=5 \
API_STRESS_ITERATIONS=20 \
npm run test:stress
```

### Memory Leak Detection
```bash
# Extended test for memory leak detection
STRESS_RAPID_ITERATIONS=100 \
STRESS_MEMORY_THRESHOLD=100 \
npm run test:stress:marketplace
```

## Reports

All stress tests generate JSON reports in `reports/`:
- Individual suite reports: `{suite}-stress-report.json`
- Combined report: `stress-report-{timestamp}.json`
- Screenshots on failure in `reports/`

## Interpreting Results

### Performance Metrics
- **Average Response Time**: Should be under configured thresholds
- **Max Response Time**: Watch for outliers indicating bottlenecks
- **Error Rate**: Should be under configured thresholds (typically <10%)

### Memory Metrics
- **Memory Increase**: Monitors heap growth during tests
- **Threshold Violations**: Indicates potential memory leaks

### Concurrency Metrics
- **Concurrent Session Success Rate**: Should be >90%
- **Individual Session Performance**: Watch for degraded performance under load

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Stress Tests
  run: npm run test:stress:ci
  env:
    BASE_URL: http://localhost:4200
    TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}

- name: Upload Stress Test Reports
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: stress-test-reports
    path: apps/web/e2e/reports/*-stress-*.json
```

## Troubleshooting

### Tests timing out
- Increase `*_STRESS_DELAY` environment variables
- Reduce `*_STRESS_ITERATIONS` for faster execution
- Check server response times

### High memory usage
- Increase `STRESS_MEMORY_THRESHOLD` if needed
- Check for memory leaks in application
- Run tests individually to isolate issues

### Browser crashes
- Reduce `*_STRESS_CONCURRENT` settings
- Ensure sufficient system memory
- Use headless mode for stability

### Rate limiting triggered
- Expected behavior - verifies rate limiting works
- Increase `API_STRESS_DELAY` to avoid triggering limits
- Tests will report if rate limiting is NOT detected (may be unexpected)

## Architecture

Each stress test suite follows this pattern:
1. **Configuration**: Environment-variable based settings
2. **Test Definitions**: Individual stress test functions
3. **Test Runner**: Orchestrates test execution with setup/teardown
4. **Reporting**: JSON reports with detailed metrics
5. **Error Handling**: Graceful failure with screenshots/logs

The tests use Patchright's anti-bot capabilities to ensure realistic browser behavior even under heavy load.
