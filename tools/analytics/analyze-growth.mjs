#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getEnvConfig() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    process.env.NG_APP_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NG_APP_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ Missing Supabase credentials. Set SUPABASE_URL/NG_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/NG_APP_SUPABASE_ANON_KEY.');
    process.exit(1);
  }

  return { url, key };
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const { url, key } = getEnvConfig();
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('📊 Analyzing Project Growth...');

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const startDate = threeMonthsAgo.toISOString();

  // 1. User Growth (Profiles)
  console.log('   Fetching User Growth...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', startDate)
    .order('created_at', { ascending: true });

  if (profilesError) console.error('Error fetching profiles:', profilesError);

  // 2. Booking Growth
  console.log('   Fetching Booking Growth...');
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('created_at, status, total_amount_cents')
    .gte('created_at', startDate)
    .order('created_at', { ascending: true });

  if (bookingsError) console.error('Error fetching bookings:', bookingsError);

  // 3. Supply Growth (Cars)
  console.log('   Fetching Supply Growth...');
  const { data: cars, error: carsError } = await supabase
    .from('cars')
    .select('created_at, status')
    .gte('created_at', startDate)
    .order('created_at', { ascending: true });

  if (carsError) console.error('Error fetching cars:', carsError);

  // 4. Analytics Events (Conversion)
  console.log('   Fetching Analytics Events...');
  const { data: events, error: eventsError } = await supabase
    .from('analytics_events')
    .select('created_at, event_type')
    .gte('created_at', startDate)
    .in('event_type', ['booking_initiated', 'booking_completed'])
    .order('created_at', { ascending: true });

  if (eventsError) console.error('Error fetching events:', eventsError);

  // Aggregation
  const weeklyStats = {};

  function processItem(item, type) {
    const date = new Date(item.created_at);
    const weekStart = getWeekStart(date).toISOString().split('T')[0];

    if (!weeklyStats[weekStart]) {
      weeklyStats[weekStart] = {
        week: weekStart,
        new_users: 0,
        new_bookings: 0,
        booking_value: 0,
        new_cars: 0,
        booking_initiated: 0,
        booking_completed: 0
      };
    }

    if (type === 'user') weeklyStats[weekStart].new_users++;
    if (type === 'booking') {
      weeklyStats[weekStart].new_bookings++;
      weeklyStats[weekStart].booking_value += (item.total_amount_cents || 0);
    }
    if (type === 'car') weeklyStats[weekStart].new_cars++;
    if (type === 'event') {
      if (item.event_type === 'booking_initiated') weeklyStats[weekStart].booking_initiated++;
      if (item.event_type === 'booking_completed') weeklyStats[weekStart].booking_completed++;
    }
  }

  profiles?.forEach(p => processItem(p, 'user'));
  bookings?.forEach(b => processItem(b, 'booking'));
  cars?.forEach(c => processItem(c, 'car'));
  events?.forEach(e => processItem(e, 'event'));

  const sortedWeeks = Object.values(weeklyStats).sort((a, b) => a.week.localeCompare(b.week));

  console.log('\n📈 Weekly Growth Metrics (Last 3 Months):');
  console.table(sortedWeeks);

  // Calculate Growth Rates
  if (sortedWeeks.length >= 2) {
    const firstWeek = sortedWeeks[0];
    const lastWeek = sortedWeeks[sortedWeeks.length - 1];

    console.log('\n🚀 Growth Summary:');
    console.log(`   Users: ${firstWeek.new_users} -> ${lastWeek.new_users}`);
    console.log(`   Bookings: ${firstWeek.new_bookings} -> ${lastWeek.new_bookings}`);
    console.log(`   Cars: ${firstWeek.new_cars} -> ${lastWeek.new_cars}`);
  }
}

main().catch(console.error);
