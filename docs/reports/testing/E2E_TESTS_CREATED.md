# 🧪 E2E Tests Created - Pre-Production Bug Hunt

**Date**: 2025-10-17
**Status**: Ready to run
**Goal**: Find bugs before production launch

---

## 📋 Summary

He creado un sistema completo de pruebas E2E automatizadas con Playwright para simular dos flujos de usuario end-to-end:

1. **Owner Flow**: Registro → Login → Publicar Auto → Verificar Marcador en Mapa
2. **Renter Flow**: Registro → Login → Buscar Autos → Reservar Auto

**Filosofía**: Encontrar errores ahora es una VICTORIA! 🎉

---

## 📁 Files Created

```
/home/edu/autorenta/e2e/
├── test_car_publication_and_booking.py  # Main test script (700+ lines)
├── run_tests.sh                         # Test runner with venv activation
├── README.md                            # Complete documentation
├── screenshots/                         # Auto-generated screenshots
└── venv/                                # Python virtual environment
```

---

## 🎯 Test Coverage

### Scenario 1: Owner Publishing Car

**Test 1: Owner Registration**
- Navigate to `/auth/register`
- Fill form: name, email, password
- Select "locador" role (if available)
- Submit and verify redirect
- **Screenshot**: `01_register_page.png`, `02_register_form_filled.png`, `03_after_registration.png`

**Test 2: Owner Login**
- Navigate to `/auth/login`
- Fill credentials
- Submit and verify successful login
- **Screenshot**: `04_login_page.png`, `05_login_form_filled.png`, `06_after_login.png`

**Test 3: Car Publication** ⭐ CRITICAL
- Navigate to `/cars/publish`
- Fill multi-step wizard:
  - **Step 1 - Vehicle**: Brand, model, year, title
  - **Step 2 - Specs**: Transmission, fuel type, color
  - **Step 3 - Location**: City, **COORDINATES** (lat/lng) ← CRITICAL FOR MAP
  - **Step 4 - Pricing**: Price per day, currency
- Submit form
- Verify publication success
- **Screenshots**: 24 screenshots covering every step
- **⚠️  Coordinates Validation**: Warns if coordinates not set (car won't appear on map)

**Test 4: Map Marker Verification** ⭐ CRITICAL
- Navigate to `/cars` (list with map)
- Wait for map to load (3s)
- Verify Mapbox container exists
- Check for markers (HTML or GeoJSON canvas)
- **Screenshot**: `14_cars_page_with_map.png`, `15_map_markers_check.png`
- **Validates**: Published car appears as marker

---

### Scenario 2: Renter Booking Car

**Test 5: Renter Registration**
- Logout previous user
- Register new renter user
- Select "locatario" role
- Verify success
- **Screenshot**: `16_renter_register_page.png`, `17_renter_form_filled.png`

**Test 6: Renter Login**
- Login with renter credentials
- Verify successful authentication
- **Screenshot**: `19_renter_logged_in.png`

**Test 7: Browse and Book Car**
- Navigate to `/cars`
- Find car cards
- Click first available car
- Navigate to detail page
- Find booking button
- Fill booking dates (7 days from today for 1 week)
- Submit booking request
- Verify booking flow
- **Screenshot**: `20_browse_cars.png`, `21_car_detail_page.png`, `22_booking_form.png`, `24_after_booking_submit.png`

---

## 🚀 How to Run

### Prerequisites

1. Dev server must be running:
```bash
cd /home/edu/autorenta/apps/web
npm run start
```

2. Server should be accessible at `http://localhost:4200`

### Running Tests

**Option 1: Using test runner (recommended)**
```bash
cd /home/edu/autorenta/e2e
./run_tests.sh
```

**Option 2: Manual execution**
```bash
cd /home/edu/autorenta/e2e
source venv/bin/activate
python3 test_car_publication_and_booking.py
```

**Option 3: Headless mode (CI/CD)**
```bash
cd /home/edu/autorenta/e2e
source venv/bin/activate
HEADLESS=true python3 test_car_publication_and_booking.py
```

---

## 📊 Expected Output

### Console Output

```
================================================================================
AUTORENTAR E2E TESTS - PRE-PRODUCTION BUG HUNT
================================================================================
Base URL: http://localhost:4200
Headless: False
Slow Motion: 500ms

[18:30:01] [TEST] 🧪 TEST START: Owner Registration
[18:30:02] [INFO] Navigating to http://localhost:4200/auth/register
[18:30:03] [INFO] Filling registration form...
[18:30:04] [INFO] Submitting registration form...
[18:30:05] [PASS] ✅ TEST PASS: Owner Registration

... (tests continue)

================================================================================
E2E TEST SUMMARY
================================================================================

📊 Total Tests: 7
✅ Passed: 7
❌ Failed: 0
⚠️  Warnings: 2
🐛 Errors: 0

========================================
All tests passed! ✅
========================================
```

### Screenshots

All screenshots saved to `/home/edu/autorenta/e2e/screenshots/`:
- Timestamped filename format: `20251017_183000_{step_name}.png`
- Full page screenshots at every major step
- Error screenshots on failures

---

## 🐛 Bug Detection

Tests are designed to catch:

### Critical Issues
- ❌ Registration/Login failures
- ❌ Car publication without coordinates (no map marker)
- ❌ Form validation errors
- ❌ Broken navigation/routing
- ❌ Map not rendering
- ❌ Markers not appearing

### Warnings
- ⚠️  Missing form fields
- ⚠️  Slow page loads
- ⚠️  Unexpected redirects
- ⚠️  Missing UI elements

### Captured in Logs
- All form submissions
- All navigation events
- All errors and warnings
- Timestamp for every action

---

## 🔍 Test Features

### Smart Selectors
Tests use flexible selectors to find elements:
```python
# Multiple selector strategies
await page.fill('input[formcontrolname="email"], input[type="email"]', EMAIL)
await page.click('button[type="submit"], button:has-text("Submit")')
```

### Automatic Screenshots
Screenshots taken at:
- Every major step
- Before/after form submissions
- On all errors
- On unexpected states

### Detailed Logging
Every action logged with:
- Timestamp
- Log level (INFO, WARNING, ERROR, TEST, PASS, FAIL)
- Descriptive message

### Failure Resilience
- Tests continue even if non-critical steps fail
- Warnings logged but don't fail tests
- Error screenshots for debugging

---

## 🎨 Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:4200` | Application URL |
| `HEADLESS` | `false` | Run browser in background |
| `SLOW_MO` | `500` | Delay between actions (ms) |

Example:
```bash
BASE_URL=https://staging.autorentar.com HEADLESS=true SLOW_MO=200 ./run_tests.sh
```

---

## 📈 Test Data

Tests use timestamped data to avoid conflicts:

```python
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")

# Owner
OWNER_EMAIL = f"owner_{TIMESTAMP}@test.com"
OWNER_PASSWORD = "Test1234!@"
OWNER_NAME = f"Juan Propietario {TIMESTAMP}"

# Renter
RENTER_EMAIL = f"renter_{TIMESTAMP}@test.com"
RENTER_PASSWORD = "Test1234!@"
RENTER_NAME = f"María Inquilina {TIMESTAMP}"

# Car
CAR_TITLE = f"Toyota Corolla {TIMESTAMP}"
CAR_PRICE = "2500"
```

**Note**: Test data persists in real Supabase database!

---

## ⚙️ Technical Details

### Stack
- **Language**: Python 3.13
- **Framework**: Playwright async API
- **Browser**: Chromium (headless capable)
- **Viewport**: 1920x1080

### Key Functions

**`test_owner_registration(page)`**
- Full registration flow
- Role selection
- Success verification

**`test_car_publication(page)`** ⭐
- Multi-step wizard navigation
- **CRITICAL**: Coordinates validation
- Form submission

**`test_car_appears_on_map(page)`** ⭐
- Map container verification
- Marker detection (HTML + Canvas)
- Visual confirmation

**`test_browse_and_book_car(page)`**
- Car browsing
- Detail page navigation
- Booking form submission

### Reporter Class
- Tracks all test results
- Generates summary report
- Collects errors and warnings
- Returns exit code (0 = success, 1 = failures)

---

## 🔧 Troubleshooting

### Test Fails: "Dev server not running"
**Solution**: Start dev server first:
```bash
cd /home/edu/autorenta/apps/web
npm run start
```

### Test Fails: "playwright not found"
**Solution**: Activate venv:
```bash
cd /home/edu/autorenta/e2e
source venv/bin/activate
```

### Want to see browser actions
**Solution**: Run with UI visible:
```bash
HEADLESS=false SLOW_MO=2000 ./run_tests.sh
```

### Debugging specific test
**Solution**: Check screenshot at failure step in `e2e/screenshots/`

---

## 🎯 Next Steps

1. **Run tests now**:
   ```bash
   cd /home/edu/autorenta/e2e
   ./run_tests.sh
   ```

2. **Review results**:
   - Check console output
   - Review screenshots
   - Read summary report

3. **Fix discovered bugs**:
   - Every error found = Victory!
   - Document issues
   - Create fixes
   - Re-run tests

4. **Iterate**:
   - Add more test scenarios
   - Improve selectors
   - Add assertions

---

## 📝 Files Reference

### Main Test Script
**File**: `/home/edu/autorenta/e2e/test_car_publication_and_booking.py`
**Lines**: 700+
**Functions**: 8 test functions + helpers
**Coverage**: Complete owner + renter flows

### Test Runner
**File**: `/home/edu/autorenta/e2e/run_tests.sh`
**Purpose**: Automated test execution with venv
**Features**: Server check, color output, exit code handling

### Documentation
**File**: `/home/edu/autorenta/e2e/README.md`
**Content**: Complete guide, troubleshooting, examples

---

## ✅ Test Readiness Checklist

- [x] ✅ Playwright installed in venv
- [x] ✅ Chromium browser installed
- [x] ✅ Test script created (700+ lines)
- [x] ✅ Test runner script created
- [x] ✅ Documentation complete
- [x] ✅ Screenshot directory ready
- [x] ✅ All 7 tests implemented
- [ ] ⏳ Dev server running (manual step)
- [ ] ⏳ Tests executed (manual step)
- [ ] ⏳ Bugs found and documented (TBD)

---

## 🏁 Summary

**Status**: ✅ Tests are ready to run!

**Command to start**:
```bash
cd /home/edu/autorenta/e2e && ./run_tests.sh
```

**What to expect**:
1. Browser will open (unless HEADLESS=true)
2. Tests will run automatically (slow motion for visibility)
3. Screenshots saved for every step
4. Summary report at the end
5. Exit code 0 = all pass, 1 = bugs found

**Remember**: Finding bugs is a VICTORY! 🎉 Better to find them now than in production.

---

**Created by**: Claude Code
**Date**: 2025-10-17
**Ready to run**: YES ✅
