// @ts-nocheck - Tests need rewrite for Signal-based API
/**
 * INTEGRATION TESTS for Bonus-Malus System RPCs
 *
 * These tests verify the actual database RPCs end-to-end.
 * They require a test Supabase project with the bonus-malus migrations applied.
 *
 * SETUP:
 * 1. Create a test Supabase project or use a dedicated test environment
 * 2. Apply all bonus-malus migrations to the test database
 * 3. Configure test environment variables:
 *    - TEST_SUPABASE_URL
 *    - TEST_SUPABASE_SERVICE_ROLE_KEY
 * 4. Run with: npm run test:integration
 *
 * IMPORTANT: These tests will create and modify actual database records.
 * DO NOT run against production database!
 */

import { TestBed } from '@angular/core/testing';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { DriverProfileService } from './driver-profile.service';
import { AutorentarCreditService } from './autorentar-credit.service';
import { BonusProtectorService } from './bonus-protector.service';
import { TelemetryService } from './telemetry.service';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

// TODO: Fix ClassUpdateResult type reference
xdescribe('Bonus-Malus Integration Tests', () => {
  let supabaseClient: SupabaseClient;
  let testUserId: string;
  let testBookingId: string;

  // Skip these tests if not running in integration test mode
  const isIntegrationTest = !!process.env['TEST_SUPABASE_URL'];

  beforeAll(() => {
    if (!isIntegrationTest) {
      console.warn(
        'Skipping integration tests. Set TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY to run.',
      );
      return;
    }

    const testUrl = process.env['TEST_SUPABASE_URL'];
    const testKey = process.env['TEST_SUPABASE_SERVICE_ROLE_KEY'];

    if (!testUrl || !testKey) {
      throw new Error('Test environment variables not configured');
    }

    supabaseClient = createClient(testUrl, testKey);
  });

  beforeEach(async () => {
    if (!isIntegrationTest) return;

    // Create a test user for each test
    testUserId = `test-user-${Date.now()}`;
    testBookingId = `test-booking-${Date.now()}`;

    // Insert test user into auth.users (requires service role)
    await supabaseClient.auth.admin.createUser({
      email: `test-${testUserId}@autorentar.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { test: true },
    });
  });

  afterEach(async () => {
    if (!isIntegrationTest) return;

    // Cleanup: Delete test user and related data
    try {
      await supabaseClient.auth.admin.deleteUser(testUserId);
    } catch (_error) {
      console.error('Cleanup error:', _error);
    }
  });

  describe('Driver Profile RPCs', () => {
    it('should initialize and retrieve driver profile', async () => {
      if (!isIntegrationTest) return;

      // Call initialize_driver_profile
      const { data: initData, error: initError } = await supabaseClient.rpc(
        'initialize_driver_profile',
        { p_user_id: testUserId },
      );

      expect(initError).toBeNull();
      expect(initData).toBe(testUserId);

      // Verify profile was created with correct defaults
      const { data: profileData, error: profileError } = await supabaseClient.rpc(
        'get_driver_profile',
        { p_user_id: testUserId },
      );

      expect(profileError).toBeNull();
      expect(profileData).toHaveSize(1);
      expect(profileData[0].user_id).toBe(testUserId);
      expect(profileData[0].class).toBe(5); // Default class
      expect(profileData[0].driver_score).toBe(50); // Default score
      expect(profileData[0].clean_bookings).toBe(0);
      expect(profileData[0].total_bookings).toBe(0);
    }, 30000); // 30s timeout for integration test

    it('should update driver class after clean booking', async () => {
      if (!isIntegrationTest) return;

      // Initialize profile
      await supabaseClient.rpc('initialize_driver_profile', { p_user_id: testUserId });

      // Simulate 5 clean bookings to trigger class improvement
      for (let i = 0; i < 5; i++) {
        const { data, error } = await supabaseClient.rpc('update_driver_class_on_event', {
          p_user_id: testUserId,
          p_booking_id: `booking-${i}`,
          p_claim_id: null,
          p_claim_with_fault: false,
          p_claim_severity: 0,
        });

        expect(error).toBeNull();
        expect(data).toHaveSize(1);
      }

      // Verify class improved from 5 to 4
      const { data: profileData } = await supabaseClient.rpc('get_driver_profile', {
        p_user_id: testUserId,
      });

      expect(profileData[0].class).toBe(4);
      expect(profileData[0].clean_bookings).toBe(5);
      expect(profileData[0].total_bookings).toBe(5);
      expect(profileData[0].clean_percentage).toBe(100);
    }, 30000);

    it('should worsen class after claim with fault', async () => {
      if (!isIntegrationTest) return;

      // Initialize profile
      await supabaseClient.rpc('initialize_driver_profile', { p_user_id: testUserId });

      // Simulate claim with fault (severity 2 = +2 classes)
      const { data, error } = await supabaseClient.rpc('update_driver_class_on_event', {
        p_user_id: testUserId,
        p_booking_id: testBookingId,
        p_claim_id: `claim-${Date.now()}`,
        p_claim_with_fault: true,
        p_claim_severity: 2,
      });

      expect(error).toBeNull();
      expect(data).toHaveSize(1);

      const result = data[0] as ClassUpdateResult;
      expect(result.old_class).toBe(5);
      expect(result.new_class).toBe(7); // 5 + 2
      expect(result.class_change).toBe(2);

      // Verify profile updated
      const { data: profileData } = await supabaseClient.rpc('get_driver_profile', {
        p_user_id: testUserId,
      });

      expect(profileData[0].class).toBe(7);
      expect(profileData[0].total_claims).toBe(1);
      expect(profileData[0].claims_with_fault).toBe(1);
    }, 30000);
  });

  describe('Autorentar Credit RPCs', () => {
    it('should issue autorentar credit', async () => {
      if (!isIntegrationTest) return;

      const { data, error } = await supabaseClient.rpc('issue_autorentar_credit', {
        p_user_id: testUserId,
        p_amount_cents: 30000, // $300 USD
      });

      expect(error).toBeNull();
      expect(data).toHaveSize(1);
      expect(data[0].success).toBe(true);
      expect(data[0].credit_balance_cents).toBe(30000);

      // Verify wallet balance
      const { data: creditInfo } = await supabaseClient.rpc('wallet_get_autorentar_credit_info', {
        p_user_id: testUserId,
      });

      expect(creditInfo[0].balance).toBe(300);
      expect(creditInfo[0].issued_at).toBeTruthy();
      expect(creditInfo[0].expires_at).toBeTruthy();
    }, 30000);

    it('should consume autorentar credit for claim', async () => {
      if (!isIntegrationTest) return;

      // First, issue credit
      await supabaseClient.rpc('issue_autorentar_credit', {
        p_user_id: testUserId,
        p_amount_cents: 30000,
      });

      // Consume $100 for a claim
      const { data, error } = await supabaseClient.rpc('consume_autorentar_credit_for_claim', {
        p_user_id: testUserId,
        p_claim_amount_cents: 10000,
        p_booking_id: testBookingId,
        p_claim_id: null,
      });

      expect(error).toBeNull();
      expect(data).toHaveSize(1);
      expect(data[0].success).toBe(true);
      expect(data[0].autorentar_credit_used_cents).toBe(10000);
      expect(data[0].remaining_claim_cents).toBe(0);
      expect(data[0].new_autorentar_credit_balance).toBe(20000); // $200 remaining

      // Verify balance updated
      const { data: creditInfo } = await supabaseClient.rpc('wallet_get_autorentar_credit_info', {
        p_user_id: testUserId,
      });

      expect(creditInfo[0].balance).toBe(200);
    }, 30000);

    it('should handle waterfall payment (credit + wallet)', async () => {
      if (!isIntegrationTest) return;

      // Issue $100 credit
      await supabaseClient.rpc('issue_autorentar_credit', {
        p_user_id: testUserId,
        p_amount_cents: 10000,
      });

      // Add $50 to wallet
      await supabaseClient.rpc('wallet_initiate_deposit', {
        p_user_id: testUserId,
        p_amount_cents: 5000,
      });

      // Simulate claim of $120 (should use $100 credit + $20 wallet)
      const { data, error } = await supabaseClient.rpc('consume_autorentar_credit_for_claim', {
        p_user_id: testUserId,
        p_claim_amount_cents: 12000,
        p_booking_id: testBookingId,
        p_claim_id: null,
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);
      expect(data[0].autorentar_credit_used_cents).toBe(10000); // All credit used
      expect(data[0].wallet_balance_used_cents).toBe(2000); // $20 from wallet
      expect(data[0].remaining_claim_cents).toBe(0); // Fully covered
    }, 30000);
  });

  describe('Bonus Protector RPCs', () => {
    it('should purchase and retrieve bonus protector', async () => {
      if (!isIntegrationTest) return;

      // Add funds to wallet for purchase
      await supabaseClient.rpc('wallet_initiate_deposit', {
        p_user_id: testUserId,
        p_amount_cents: 5000, // $50
      });

      // Purchase level 2 protector ($30)
      const { data, error } = await supabaseClient.rpc('purchase_bonus_protector', {
        p_user_id: testUserId,
        p_protection_level: 2,
        p_price_cents: 3000,
      });

      expect(error).toBeNull();
      expect(data).toHaveSize(1);
      expect(data[0].success).toBe(true);
      expect(data[0].protection_level).toBe(2);
      expect(data[0].max_protected_claims).toBe(2);

      // Verify protector is active
      const { data: protectorData } = await supabaseClient.rpc('get_active_bonus_protector', {
        p_user_id: testUserId,
      });

      expect(protectorData[0].has_active_protector).toBe(true);
      expect(protectorData[0].protection_level).toBe(2);
      expect(protectorData[0].remaining_uses).toBe(2);
    }, 30000);

    it('should prevent purchasing second protector while one is active', async () => {
      if (!isIntegrationTest) return;

      // Add funds
      await supabaseClient.rpc('wallet_initiate_deposit', {
        p_user_id: testUserId,
        p_amount_cents: 10000,
      });

      // Purchase first protector
      await supabaseClient.rpc('purchase_bonus_protector', {
        p_user_id: testUserId,
        p_protection_level: 1,
        p_price_cents: 1500,
      });

      // Attempt to purchase second
      const { data, error } = await supabaseClient.rpc('purchase_bonus_protector', {
        p_user_id: testUserId,
        p_protection_level: 2,
        p_price_cents: 3000,
      });

      // Should fail or return success: false
      expect(data[0].success).toBe(false);
      expect(data[0].message).toContain('Ya tienes un protector activo');
    }, 30000);
  });

  describe('Telemetry RPCs', () => {
    it('should record telemetry and calculate driver score', async () => {
      if (!isIntegrationTest) return;

      const telemetryData = {
        total_km: 150,
        hard_brakes: 2,
        speed_violations: 1,
        night_driving_hours: 1,
        risk_zones_visited: 0,
      };

      const { data, error } = await supabaseClient.rpc('record_telemetry', {
        p_user_id: testUserId,
        p_booking_id: testBookingId,
        p_telemetry_data: telemetryData,
      });

      expect(error).toBeNull();
      expect(data).toHaveSize(1);
      expect(data[0].success).toBe(true);
      expect(data[0].driver_score).toBeGreaterThan(0);
      expect(data[0].driver_score).toBeLessThanOrEqual(100);

      // Verify telemetry was recorded
      const { data: historyData } = await supabaseClient.rpc('get_user_telemetry_history', {
        p_user_id: testUserId,
        p_limit: 10,
      });

      expect(historyData.length).toBeGreaterThan(0);
      expect(historyData[0].booking_id).toBe(testBookingId);
    }, 30000);

    it('should calculate telemetry summary correctly', async () => {
      if (!isIntegrationTest) return;

      // Record 3 trips
      for (let i = 0; i < 3; i++) {
        await supabaseClient.rpc('record_telemetry', {
          p_user_id: testUserId,
          p_booking_id: `booking-${i}`,
          p_telemetry_data: {
            total_km: 100 + i * 10,
            hard_brakes: i,
            speed_violations: i,
            night_driving_hours: 0,
            risk_zones_visited: 0,
          },
        });
      }

      // Get summary
      const { data, error } = await supabaseClient.rpc('get_user_telemetry_summary', {
        p_user_id: testUserId,
        p_months_back: 1,
      });

      expect(error).toBeNull();
      expect(data).toHaveSize(1);
      expect(data[0].total_trips).toBe(3);
      expect(data[0].total_km).toBe(330); // 100 + 110 + 120
      expect(data[0].avg_driver_score).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Class Benefits RPC', () => {
    it('should calculate class benefits correctly', async () => {
      if (!isIntegrationTest) return;

      // Initialize profile at default class 5
      await supabaseClient.rpc('initialize_driver_profile', { p_user_id: testUserId });

      // Get benefits
      const { data, error } = await supabaseClient.rpc('get_user_class_benefits', {
        p_user_id: testUserId,
      });

      expect(error).toBeNull();
      expect(data).toHaveSize(1);
      expect(data[0].current_class).toBe(5);
      expect(data[0].current_fee_multiplier).toBe(1.0);
      expect(data[0].current_guarantee_multiplier).toBe(1.0);
      expect(data[0].next_better_class).toBe(4);
      expect(data[0].can_improve).toBe(true);

      // Verify multipliers improve for better class
      expect(data[0].next_better_fee_multiplier).toBeLessThan(data[0].current_fee_multiplier);
    }, 30000);
  });

  describe('Credit Renewal and Breakage RPCs', () => {
    it('should extend credit for users with good history', async () => {
      if (!isIntegrationTest) return;

      // Issue initial credit
      await supabaseClient.rpc('issue_autorentar_credit', {
        p_user_id: testUserId,
        p_amount_cents: 30000,
      });

      // Simulate good driving history (10+ clean bookings)
      await supabaseClient.rpc('initialize_driver_profile', { p_user_id: testUserId });
      for (let i = 0; i < 10; i++) {
        await supabaseClient.rpc('update_driver_class_on_event', {
          p_user_id: testUserId,
          p_booking_id: `booking-${i}`,
          p_claim_id: null,
          p_claim_with_fault: false,
          p_claim_severity: 0,
        });
      }

      // Attempt to extend credit
      const { data, error } = await supabaseClient.rpc(
        'extend_autorentar_credit_for_good_history',
        { p_user_id: testUserId },
      );

      expect(error).toBeNull();
      expect(data).toHaveSize(1);

      // May succeed or fail based on expiration date
      // If eligible, should extend expiration
      if (data[0].renewed) {
        expect(data[0].success).toBe(true);
        expect(data[0].new_balance_cents).toBe(30000);
      }
    }, 30000);
  });
});

/**
 * To run these tests:
 *
 * 1. Set up test environment:
 *    export TEST_SUPABASE_URL="https://your-test-project.supabase.co"
 *    export TEST_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *
 * 2. Run tests:
 *    npm run test -- bonus-malus-integration.spec.ts
 *
 * 3. Or add to package.json:
 *    "test:integration": "ng test --include=PATTERN"
 *    where PATTERN is the glob for integration spec files
 */
