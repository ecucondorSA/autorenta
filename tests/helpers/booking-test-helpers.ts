/**
 * Booking Test Helpers
 *
 * Utilities for creating and managing test bookings, inspections, and related data
 * for E2E tests.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BookingInspection, InspectionPhoto } from '../../apps/web/src/app/core/models/fgo-v1-1.model';
import { Booking, BookingStatus, BookingCompletionStatus } from '../../apps/web/src/app/core/models';

// Get environment variables with fallback
// Using globalThis to avoid TypeScript process type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (key: string): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any).process?.env || (globalThis as any).process?.env;
    return env?.[key] || '';
  } catch {
    return '';
  }
};

// Fallback: use empty strings if env vars not available
// Tests should set these via Playwright config or .env file
const supabaseUrl = getEnv('NG_APP_SUPABASE_URL') || '';
const supabaseAnonKey = getEnv('NG_APP_SUPABASE_ANON_KEY') || '';
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || '';

// Use service role key if available, otherwise anon key
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
);

/**
 * Create a test booking in the database
 */
export async function createTestBooking(params: {
  carId: string;
  renterId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
  totalAmount?: number;
  currency?: string;
  paymentMethod?: 'credit_card' | 'wallet' | 'partial_wallet';
  walletAmountCents?: number;
  rentalAmountCents?: number;
  depositAmountCents?: number;
  completionStatus?: BookingCompletionStatus;
}): Promise<Booking> {
  const {
    carId,
    renterId,
    startDate,
    endDate,
    status,
    totalAmount = 100000, // 1000 ARS default
    currency = 'ARS',
    paymentMethod,
    walletAmountCents,
    rentalAmountCents,
    depositAmountCents,
    completionStatus,
  } = params;

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      car_id: carId,
      renter_id: renterId,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      status,
      total_amount: totalAmount / 100, // Convert cents to amount
      total_cents: totalAmount,
      currency,
      payment_method: paymentMethod,
      wallet_amount_cents: walletAmountCents,
      rental_amount_cents: rentalAmountCents,
      deposit_amount_cents: depositAmountCents,
      completion_status: completionStatus,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test booking: ${error.message}`);
  }

  return data as Booking;
}

/**
 * Create a test inspection (check-in or check-out)
 */
export async function createTestInspection(params: {
  bookingId: string;
  stage: 'check_in' | 'check_out';
  inspectorId: string;
  photos: InspectionPhoto[];
  odometer?: number;
  fuelLevel?: number;
  latitude?: number;
  longitude?: number;
  signed?: boolean;
}): Promise<BookingInspection> {
  const {
    bookingId,
    stage,
    inspectorId,
    photos,
    odometer,
    fuelLevel,
    latitude,
    longitude,
    signed = false,
  } = params;

  const { data, error } = await supabase
    .from('booking_inspections')
    .insert({
      booking_id: bookingId,
      stage,
      inspector_id: inspectorId,
      photos: photos as unknown as Record<string, unknown>[], // JSONB
      odometer,
      fuel_level: fuelLevel,
      latitude,
      longitude,
      signed_at: signed ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test inspection: ${error.message}`);
  }

  // Map DB format to frontend format
  return {
    id: data.id,
    bookingId: data.booking_id,
    stage: data.stage as 'check_in' | 'check_out',
    inspectorId: data.inspector_id,
    photos: data.photos as InspectionPhoto[],
    odometer: data.odometer ?? undefined,
    fuelLevel: data.fuel_level ?? undefined,
    latitude: data.latitude ?? undefined,
    longitude: data.longitude ?? undefined,
    signedAt: data.signed_at ? new Date(data.signed_at) : undefined,
    createdAt: new Date(data.created_at),
  };
}

/**
 * Generate test inspection photos
 */
export function generateTestPhotos(count: number = 4): InspectionPhoto[] {
  const types: InspectionPhoto['type'][] = [
    'exterior',
    'interior',
    'odometer',
    'damage',
    'other',
  ];

  return Array.from({ length: count }, (_, i) => ({
    url: `https://storage.supabase.co/test/car-${i + 1}.jpg`,
    type: types[i % types.length],
    caption: `Test photo ${i + 1}`,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Mock geolocation for tests
 */
export async function mockGeolocation(
  page: any,
  latitude: number = -34.603722,
  longitude: number = -58.381592, // Buenos Aires default
): Promise<void> {
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude, longitude });
}

/**
 * Get booking by ID
 */
export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error) {
    console.error('Error fetching booking:', error);
    return null;
  }

  return data as Booking;
}

/**
 * Update booking status
 * Note: Only updates status field. If update fails due to trigger issues,
 * the error will be thrown and the test should handle it appropriately.
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<void> {
  // Direct update without select to minimize trigger interactions
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId);

  if (error) {
    // If error is related to bigint conversion, it's likely a trigger issue
    // Log warning but still throw - test should handle this case
    if (error.message.includes('bigint') || error.message.includes('numeric')) {
      console.warn(
        `Warning: Booking status update may have triggered a constraint. ` +
          `This is expected if there are triggers that update calculated fields. ` +
          `Error: ${error.message}`,
      );
    }
    throw new Error(`Failed to update booking status: ${error.message}`);
  }
}

/**
 * Verify payment split
 */
export async function verifyPaymentSplit(bookingId: string): Promise<{
  ownerAmount: number;
  platformFee: number;
  totalAmount: number;
  splitCompleted: boolean;
}> {
  const { data, error } = await supabase
    .from('bookings')
    .select('total_amount, owner_payment_amount, platform_fee, payment_split_completed')
    .eq('id', bookingId)
    .single();

  if (error) {
    throw new Error(`Failed to verify payment split: ${error.message}`);
  }

  return {
    ownerAmount: data.owner_payment_amount || 0,
    platformFee: data.platform_fee || 0,
    totalAmount: data.total_amount || 0,
    splitCompleted: data.payment_split_completed || false,
  };
}

/**
 * Get wallet balance for user
 */
export async function getWalletBalance(userId: string): Promise<{
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
}> {
  const { data, error } = await supabase
    .from('user_wallets')
    .select('available_balance_cents, locked_balance_cents, balance_cents')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to get wallet balance: ${error.message}`);
  }

  return {
    availableBalance: data.available_balance_cents || 0,
    lockedBalance: data.locked_balance_cents || 0,
    totalBalance: data.balance_cents || 0,
  };
}

/**
 * Get inspection by booking ID and stage
 */
export async function getInspectionByStage(
  bookingId: string,
  stage: 'check_in' | 'check_out',
): Promise<BookingInspection | null> {
  const { data, error } = await supabase
    .from('booking_inspections')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('stage', stage)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get inspection: ${error.message}`);
  }

  // Map DB format to frontend format
  return {
    id: data.id,
    bookingId: data.booking_id,
    stage: data.stage as 'check_in' | 'check_out',
    inspectorId: data.inspector_id,
    photos: data.photos as InspectionPhoto[],
    odometer: data.odometer ?? undefined,
    fuelLevel: data.fuel_level ?? undefined,
    latitude: data.latitude ?? undefined,
    longitude: data.longitude ?? undefined,
    signedAt: data.signed_at ? new Date(data.signed_at) : undefined,
    createdAt: new Date(data.created_at),
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestBooking(bookingId: string): Promise<void> {
  // Delete inspections first (foreign key constraint)
  await supabase.from('booking_inspections').delete().eq('booking_id', bookingId);

  // Delete booking
  await supabase.from('bookings').delete().eq('id', bookingId);
}

/**
 * Get active car for testing
 */
export async function getActiveCar(ownerId?: string): Promise<{
  id: string;
  owner_id: string;
  brand: string;
  model: string;
} | null> {
  let query = supabase
    .from('cars')
    .select('id, owner_id, brand, model')
    .eq('status', 'active')
    .limit(1);

  if (ownerId) {
    query = query.eq('owner_id', ownerId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get active car: ${error.message}`);
  }

  return data;
}

/**
 * Get user ID by email
 * Note: This function requires the password to authenticate.
 * For test users, use the known password from test fixtures.
 * Returns null if user not found or authentication fails.
 */
export async function getUserIdByEmail(
  email: string,
  password?: string,
): Promise<string | null> {
  // Use service role client for admin operations
  const adminClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

  // If password provided, try to sign in to get user ID
  if (password) {
    const { data: authData, error: authError } = await adminClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authData?.user) {
      return authData.user.id;
    }
  }

  // If no password or sign-in failed, try querying profiles table
  // Note: This assumes profiles.id matches auth.users.id (which it should)
  let profile: { id: string } | null = null;
  let profileError: { message: string } | null = null;

  try {
    const result = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (result.data) {
      profile = result.data;
    }
    if (result.error) {
      profileError = result.error;
    }
  } catch (err) {
    profileError = { message: 'Not found' };
  }

  if (profile && !profileError) {
    return profile.id;
  }

  return null;
}

/**
 * Authenticate user in Playwright page using Supabase session
 * This helper sets up the session in localStorage in the format Supabase expects
 */
export async function authenticateUserInPage(
  page: any,
  email: string,
  password: string,
): Promise<{ userId: string; session: any } | null> {
  // Create Supabase client for authentication
  const authClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

  // Sign in to get session
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session || !authData.user) {
    console.error('Failed to authenticate user:', authError?.message);
    return null;
  }

  // Get Supabase project ref from URL for localStorage key
  const supabaseUrlObj = new URL(supabaseUrl);
  const projectRef = supabaseUrlObj.hostname.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;

  // Navigate to app and set session
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Set session in localStorage using Supabase's format
  await page.evaluate(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
      // Also set in old format for compatibility
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    },
    { key: storageKey, session: authData.session },
  );

  // Reload page to apply session
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Give time for Angular to process session

  // Verify authentication by checking if we can access a protected route
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/login')) {
    // If redirected to login, auth didn't work - try navigating again
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }

  return {
    userId: authData.user.id,
    session: authData.session,
  };
}

/**
 * Create a booking with check-in inspection already completed
 * Useful for testing check-out flows or active booking views
 */
export async function createBookingWithCheckIn(params: {
  carId: string;
  renterId: string;
  startDate: Date;
  endDate: Date;
  status?: BookingStatus;
  totalAmount?: number;
  odometer?: number;
  fuelLevel?: number;
}): Promise<{ booking: Booking; inspection: BookingInspection }> {
  const booking = await createTestBooking({
    carId: params.carId,
    renterId: params.renterId,
    startDate: params.startDate,
    endDate: params.endDate,
    status: params.status || 'in_progress',
    totalAmount: params.totalAmount || 100000,
  });

  const photos = generateTestPhotos(4);
  const inspection = await createTestInspection({
    bookingId: booking.id,
    stage: 'check_in',
    inspectorId: params.renterId,
    photos,
    odometer: params.odometer || 50000,
    fuelLevel: params.fuelLevel || 75,
    signed: true,
  });

  return { booking, inspection };
}

/**
 * Create a completed booking (with both check-in and check-out)
 * Useful for testing review flows or completed booking views
 */
export async function createCompletedBooking(params: {
  carId: string;
  renterId: string;
  startDate: Date;
  endDate: Date;
  totalAmount?: number;
  checkInOdometer?: number;
  checkOutOdometer?: number;
  checkInFuel?: number;
  checkOutFuel?: number;
}): Promise<{
  booking: Booking;
  checkIn: BookingInspection;
  checkOut: BookingInspection;
}> {
  const booking = await createTestBooking({
    carId: params.carId,
    renterId: params.renterId,
    startDate: params.startDate,
    endDate: params.endDate,
    status: 'completed',
    totalAmount: params.totalAmount || 100000,
  });

  // Create check-in inspection
  const checkInPhotos = generateTestPhotos(4);
  const checkIn = await createTestInspection({
    bookingId: booking.id,
    stage: 'check_in',
    inspectorId: params.renterId,
    photos: checkInPhotos,
    odometer: params.checkInOdometer || 50000,
    fuelLevel: params.checkInFuel || 75,
    signed: true,
  });

  // Create check-out inspection
  const checkOutPhotos = generateTestPhotos(4);
  const checkOut = await createTestInspection({
    bookingId: booking.id,
    stage: 'check_out',
    inspectorId: params.renterId,
    photos: checkOutPhotos,
    odometer: params.checkOutOdometer || 50100,
    fuelLevel: params.checkOutFuel || 50,
    signed: true,
  });

  return { booking, checkIn, checkOut };
}

/**
 * Clean up multiple bookings at once
 */
export async function cleanupTestBookings(bookingIds: string[]): Promise<void> {
  await Promise.all(bookingIds.map((id) => cleanupTestBooking(id)));
}

/**
 * Get all bookings for a user (renter or owner)
 */
export async function getUserBookings(
  userId: string,
  role: 'renter' | 'owner',
  status?: BookingStatus,
): Promise<Booking[]> {
  const column = role === 'renter' ? 'renter_id' : 'owner_id';
  let query = supabase.from('bookings').select('*').eq(column, userId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get user bookings: ${error.message}`);
  }

  return (data || []) as Booking[];
}

