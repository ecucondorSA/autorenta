# Stagehand QA Failure Investigation (2026-01-13)

Source artifacts: `apps/web/e2e/reports` (failure screenshots + network logs).
Note: JSON summary reports show last run passed, but failure screenshots indicate intermittent failures in specific modules/tests.

## Module failure counts (by failure screenshots)
- payment: 19 failure screenshots
- auth: 17 failure screenshots
- booking: 17 failure screenshots
- rentarfast: 14 failure screenshots
- marketplace: 4 failure screenshots

## Top failing tests
- booking-reservation-creates-and-navigates-to-checkout: 17 failures | logs=17 | failedReqLogs=16 | zeroReqLogs=1
- payment-card-form-filling: 6 failures | logs=6 | failedReqLogs=3 | zeroReqLogs=0
- payment-missing-parameters: 4 failures | logs=4 | failedReqLogs=2 | zeroReqLogs=0
- payment-mp-brick-initializes: 4 failures | logs=4 | failedReqLogs=3 | zeroReqLogs=0
- auth-forgot-password-link: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- auth-login-form-input: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- auth-login-invalid-credentials: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- auth-login-page-loads: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- auth-login-scenic-background-animates: 2 failures | logs=2 | failedReqLogs=2 | zeroReqLogs=0
- auth-login-submission: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- auth-register-link: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- marketplace-car-card-content: 2 failures | logs=2 | failedReqLogs=1 | zeroReqLogs=0
- payment-login-works: 2 failures | logs=2 | failedReqLogs=2 | zeroReqLogs=0
- rentarfast-clear-chat: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- rentarfast-loading-state: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- rentarfast-long-message: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- rentarfast-search-cars-suggestions: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- rentarfast-self-booking-alternatives: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- rentarfast-suggestion-click: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- rentarfast-suggestions-real-data: 2 failures | logs=2 | failedReqLogs=0 | zeroReqLogs=0
- auth-logout: 1 failures | logs=1 | failedReqLogs=0 | zeroReqLogs=1
- auth-protected-route-redirect: 1 failures | logs=1 | failedReqLogs=0 | zeroReqLogs=1
- auth-session-persistence: 1 failures | logs=1 | failedReqLogs=0 | zeroReqLogs=1
- marketplace-marketplace-loads: 1 failures | logs=1 | failedReqLogs=1 | zeroReqLogs=0
- marketplace-multiple-car-cards: 1 failures | logs=1 | failedReqLogs=0 | zeroReqLogs=0
- payment-marketplace-has-cars: 1 failures | logs=1 | failedReqLogs=1 | zeroReqLogs=0
- payment-payment-mode-toggle: 1 failures | logs=1 | failedReqLogs=0 | zeroReqLogs=0
- payment-payment-page-loads: 1 failures | logs=1 | failedReqLogs=0 | zeroReqLogs=0

## Network failure signals (status >= 400)
- booking-reservation-creates-and-navigates-to-checkout: 57 failed responses | statuses={400: 35, 404: 22}
  - 34x https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/reviews?select=*%2Creviewer%3Aprofiles%21reviews_reviewer_id_fkey%28id%2Cfull_name%2Cavatar_url%29&car_id=eq.4da4c7ed-33e9-4a30-92b8-342332d660a9&is_visible=eq.true&review_type=eq.renter_to_owner&order=created_at.desc
  - 22x https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/car_stats?select=*&car_id=eq.4da4c7ed-33e9-4a30-92b8-342332d660a9
  - 1x https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/rpc/request_booking
- auth-login-scenic-background-animates: 1 failed responses | statuses={400: 1}
  - 1x https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/token?grant_type=refresh_token
- marketplace-car-card-content: 1 failed responses | statuses={404: 1}
  - 1x http://patchright-init-script-inject.internal/
- marketplace-car-card-navigation: 1 failed responses | statuses={404: 1}
  - 1x http://patchright-init-script-inject.internal/
- marketplace-marketplace-loads: 1 failed responses | statuses={404: 1}
  - 1x http://patchright-init-script-inject.internal/
- payment-login-works: 1 failed responses | statuses={400: 1}
  - 1x https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/token?grant_type=password

## Likely failing modules (based on artifacts)
- booking: repeated failures in `booking-reservation-creates-and-navigates-to-checkout` with 400/404 responses from Supabase REST and RPC `request_booking`.
- payment: failures around `mp-brick-initializes`, `card-form-filling`, `missing-parameters` and `login-works` (auth token 400 in logs).
- auth: multiple UI flow failures (login page loads, form input, register link, etc.); one log shows refresh token 400.
- marketplace: intermittent failures (car card content/navigation, marketplace loads) with patchright init script 404 in logs (likely harness artifact).
- rentarfast: failures in suggestion flows and chat interactions (no HTTP errors in logs, likely UI/selector flakiness).

## Gaps / needs to reproduce
- Most logs show 0 pageErrors and no failed responses; failures are likely due to UI assertions/locators or timing.
- To pinpoint, rerun the failing tests with step tracing and screenshot-on-failure, then capture console errors.

## Suggested next actions with Stagehand
1. Run Stagehand on the top 3 flaky tests (booking checkout, payment mp brick, auth login page) with `observe()` to capture DOM diffs.
2. Add Stagehand screenshots + DOM snapshots to the report for each failure.
3. Replace fragile locators in those flows or add `data-testid` for stability.

## Latest Stagehand run summary (2026-01-13T03:58:50Z)
- Report: `apps/web/e2e/reports/stagehand/stagehand-report-2026-01-13T03-58-50-511Z.md`
- Public pages: ok (home, marketplace, register).
- Auth: login ok; wallet/bookings/profile/publish ok.
- Booking: failed to find `#book-now` on car detail. CTA exists but has no stable selector.
- Payment: redirected to profile verification (`/profile/verification?reason=booking_verification_required&requiredLevel=2`), so payment UI was not reached.

## Latest Stagehand run summary (2026-01-13T04:10:17Z)
- Report: `apps/web/e2e/reports/stagehand/stagehand-report-2026-01-13T04-10-17-523Z.md`
- Booking CTA: fixed via `data-testid="book-now"`; booking flow reached `after_book` successfully.
- Payment: failed early because marketplace had no cars available to build the payment URL.
