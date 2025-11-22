#!/bin/bash
npx playwright test tests/e2e/renter/booking-history.spec.ts --project=chromium:e2e --reporter=list
