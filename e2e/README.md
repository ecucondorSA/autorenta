# E2E Tests - AutorentA

## Overview

These End-to-End (E2E) tests simulate complete user workflows to find bugs before production launch.

**Goal**: Finding errors is a VICTORY! We want to discover issues now, not after deployment.

## Test Scenarios

### Scenario 1: Owner Publishing a Car
1. Owner user registration
2. Owner login
3. Publish a car with all required fields
4. **CRITICAL**: Verify car appears as a marker on the map

### Scenario 2: Renter Booking a Car
1. Renter user registration
2. Renter login
3. Browse available cars
4. View car details
5. Create a booking

## Requirements

- Python 3.13+
- Playwright
- Running dev server at http://localhost:4200

## Installation

```bash
# Install Playwright
pip3 install playwright

# Install browser (Chromium)
playwright install chromium
```

## Running Tests

### Default (with UI visible, slow motion)
```bash
cd /home/edu/autorenta/e2e
python3 test_car_publication_and_booking.py
```

### Headless mode (faster, no UI)
```bash
HEADLESS=true python3 test_car_publication_and_booking.py
```

### Custom configuration
```bash
# Set base URL
BASE_URL=https://staging.autorent.com HEADLESS=true python3 test_car_publication_and_booking.py

# Adjust slow motion (ms between actions)
SLOW_MO=1000 python3 test_car_publication_and_booking.py
```

## Output

Tests generate:
1. **Console output**: Real-time test progress with timestamps
2. **Screenshots**: Saved to `e2e/screenshots/{timestamp}_{step}.png`
3. **Test summary**: Pass/fail report with discovered errors

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:4200` | App URL to test |
| `HEADLESS` | `false` | Run without browser UI |
| `SLOW_MO` | `500` | Milliseconds between actions |

## Expected Errors (To Find)

Common issues we're looking for:

### Critical (Must Fix)
- [ ] Registration failures due to validation
- [ ] Login failures (auth flow)
- [ ] Car publication without coordinates (won't appear on map)
- [ ] Map markers not rendering
- [ ] Booking form errors

### Warning (Should Fix)
- [ ] Form fields missing or misnamed
- [ ] Slow page loads
- [ ] Redirect issues
- [ ] Missing error messages

### Nice to Have
- [ ] UI/UX improvements
- [ ] Performance optimizations

## Test Results

After running tests, check:
1. Console output for errors
2. Screenshots in `e2e/screenshots/` folder
3. Exit code (0 = success, 1 = failures)

## CI/CD Integration

To run in CI pipelines:

```yaml
# GitHub Actions example
- name: Run E2E Tests
  run: |
    cd e2e
    HEADLESS=true python3 test_car_publication_and_booking.py
```

## Debugging Failed Tests

1. Check screenshot at failure point
2. Run with `HEADLESS=false SLOW_MO=2000` to watch step-by-step
3. Review console output for error messages
4. Check network tab for API failures

## Current Test Coverage

- ✅ Owner registration
- ✅ Owner login
- ✅ Car publication (full wizard)
- ✅ Map marker verification
- ✅ Renter registration
- ✅ Renter login
- ✅ Car browsing
- ✅ Booking flow

## Known Limitations

- Tests use real Supabase database (test data persists)
- Email addresses are timestamped (unique per run)
- Requires manual cleanup of test data

## Future Improvements

- [ ] Add database cleanup after tests
- [ ] Test payment flow
- [ ] Test admin panel
- [ ] Mobile viewport tests
- [ ] Accessibility tests
- [ ] Performance metrics

---

**Remember**: Every bug found here is a victory! 🎉
