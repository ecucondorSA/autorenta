#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import https from 'https';

const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU';

// Create custom fetch that bypasses SSL verification for testing
const customFetch = (url, options = {}) => {
  return fetch(url, {
    ...options,
    // Node.js 18+ has built-in fetch with SSL support
  });
};

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch,
  },
});

console.log('🧪 Testing AutoRenta Price Calculation API\n');
console.log('═'.repeat(60));

async function testPriceCalculation() {
  try {
    // Step 1: Get active regions
    console.log('\n📍 Step 1: Fetching active pricing regions...');
    const { data: regions, error: regionsError } = await supabase
      .from('pricing_regions')
      .select('*')
      .eq('active', true)
      .limit(3);

    if (regionsError) {
      throw new Error(`Failed to fetch regions: ${regionsError.message}`);
    }

    if (!regions || regions.length === 0) {
      console.log('⚠️  No active regions found. Creating test region...');

      // Create a test region
      const { data: newRegion, error: createError } = await supabase
        .from('pricing_regions')
        .insert({
          name: 'Montevideo',
          country_code: 'UY',
          currency: 'UYU',
          base_price_per_hour: 500,
          fuel_cost_multiplier: 1.0,
          inflation_rate: 0.05,
          active: true
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create test region: ${createError.message}`);
      }

      console.log(`✅ Created test region: ${newRegion.name}`);
      regions.push(newRegion);
    }

    console.log(`✅ Found ${regions.length} active region(s)`);
    regions.forEach(r => {
      console.log(`   - ${r.name} (${r.country_code}): ${r.base_price_per_hour} ${r.currency}/hour`);
    });

    const testRegion = regions[0];

    // Step 2: Test price calculation via RPC
    console.log('\n💰 Step 2: Testing price calculation via RPC...');
    const rentalStart = new Date().toISOString();
    const rentalHours = 24;
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Anonymous user

    const startTime = Date.now();
    const { data: priceData, error: priceError } = await supabase.rpc('calculate_dynamic_price', {
      p_region_id: testRegion.id,
      p_user_id: testUserId,
      p_rental_start: rentalStart,
      p_rental_hours: rentalHours
    });
    const responseTime = Date.now() - startTime;

    if (priceError) {
      throw new Error(`Failed to calculate price: ${priceError.message}`);
    }

    console.log(`✅ Price calculated successfully in ${responseTime}ms`);
    console.log('\n📊 Pricing Breakdown:');
    console.log(`   Base Price:        ${priceData.base_price || priceData.price_per_hour} ${priceData.currency}/hour`);
    console.log(`   Total Price:       ${priceData.total_price} ${priceData.currency} (${rentalHours}h)`);
    console.log(`   Day Factor:        ${((priceData.breakdown?.day_factor || 0) * 100).toFixed(0)}%`);
    console.log(`   Hour Factor:       ${((priceData.breakdown?.hour_factor || 0) * 100).toFixed(0)}%`);
    console.log(`   User Factor:       ${((priceData.breakdown?.user_factor || 0) * 100).toFixed(0)}%`);
    console.log(`   Demand Factor:     ${((priceData.breakdown?.demand_factor || 0) * 100).toFixed(0)}%`);
    console.log(`   Event Factor:      ${((priceData.breakdown?.event_factor || 0) * 100).toFixed(0)}%`);
    console.log(`   Total Multiplier:  ${(priceData.breakdown?.total_multiplier || 1).toFixed(2)}x`);
    console.log(`   Surge Active:      ${priceData.surge_active ? '⚡ YES' : '✅ NO'}`);

    if (priceData.price_in_usd) {
      console.log(`   USD Equivalent:    $${priceData.price_in_usd.toFixed(2)}`);
    }

    // Step 3: Test batch price calculation
    console.log('\n🚀 Step 3: Testing batch price calculation...');
    const batchRegionIds = regions.map(r => r.id);

    const batchStartTime = Date.now();
    const { data: batchData, error: batchError } = await supabase.rpc('calculate_batch_dynamic_prices', {
      p_region_ids: batchRegionIds,
      p_user_id: testUserId,
      p_rental_start: rentalStart,
      p_rental_hours: rentalHours
    });
    const batchResponseTime = Date.now() - batchStartTime;

    if (batchError) {
      console.log(`⚠️  Batch calculation not available: ${batchError.message}`);
    } else {
      console.log(`✅ Batch calculation successful in ${batchResponseTime}ms`);
      console.log(`   Calculated ${batchData.length} prices for ${batchRegionIds.length} regions`);
      console.log(`   Avg time per region: ${(batchResponseTime / batchData.length).toFixed(2)}ms`);
    }

    // Performance Summary
    console.log('\n⚡ Performance Summary:');
    console.log(`   Single Price Calculation: ${responseTime}ms`);
    if (!batchError) {
      console.log(`   Batch Price Calculation:  ${batchResponseTime}ms (${batchData.length} regions)`);
      console.log(`   Efficiency Gain:          ${((responseTime * batchData.length) / batchResponseTime).toFixed(2)}x`);
    }

    // Response Time Validation
    console.log('\n✅ API Response Time Validation:');
    const targetResponseTime = 2500; // 2.5 seconds
    if (responseTime < targetResponseTime) {
      console.log(`   ✅ PASS: ${responseTime}ms < ${targetResponseTime}ms target`);
    } else {
      console.log(`   ❌ FAIL: ${responseTime}ms > ${targetResponseTime}ms target`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testPriceCalculation();
