import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  TablesInsert,
  Tables,
} from '../apps/web/src/app/core/types/supabase-types';

type ProfileInsert = TablesInsert<'profiles'>;
type CarInsert = TablesInsert<'cars'>;
type BookingInsert = TablesInsert<'bookings'>;

interface CarFixture extends CarInsert {
  car_photos: Array<{
    id: string;
    car_id: string;
    url: string;
    position: number;
    created_at: string;
  }>;
  owner: Pick<
    Tables<'v_car_owner_info'>,
    'id' | 'full_name' | 'avatar_url' | 'rating_avg' | 'rating_count' | 'created_at'
  >;
}

interface LedgerFixture {
  booking_id: string;
  renter_wallet_delta: number;
  owner_wallet_delta: number;
  platform_fee: number;
  currency: string;
  events: Array<{
    kind: 'HOLD_DEPOSIT' | 'FEE_PLATFORM' | 'PAYMENT_CAPTURED' | 'REFUND';
    amount: number;
    currency: string;
    at: string;
    notes?: string;
  }>;
}

const FIXTURES_DIR = resolve(process.cwd(), 'fixtures');

const startOfTodayUtc = new Date();
startOfTodayUtc.setUTCHours(0, 0, 0, 0);

const addDaysIso = (days: number, hours = 12) => {
  const date = new Date(startOfTodayUtc);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hours, 0, 0, 0);
  return date.toISOString();
};

const buildProfile = (overrides: Partial<ProfileInsert> = {}): ProfileInsert => ({
  id: overrides.id ?? randomUUID(),
  role: overrides.role ?? 'renter',
  full_name: overrides.full_name ?? 'Autorenta Test User',
  city: overrides.city ?? 'Buenos Aires',
  country: overrides.country ?? 'AR',
  currency: overrides.currency ?? 'ARS',
  locale: overrides.locale ?? 'es-AR',
  timezone: overrides.timezone ?? 'America/Argentina/Buenos_Aires',
  kyc: overrides.kyc ?? 'verified',
  onboarding: overrides.onboarding ?? 'complete',
  marketing_opt_in: overrides.marketing_opt_in ?? false,
  notif_prefs:
    overrides.notif_prefs ??
    {
      email: { bookings: true, promotions: false },
      push: { bookings: true, promotions: false },
      whatsapp: { bookings: false, promotions: false },
    },
  is_email_verified: overrides.is_email_verified ?? true,
  is_phone_verified: overrides.is_phone_verified ?? true,
  is_driver_verified: overrides.is_driver_verified ?? true,
  wallet_account_number: overrides.wallet_account_number ?? null,
  created_at: overrides.created_at ?? addDaysIso(-10),
  updated_at: overrides.updated_at ?? addDaysIso(-1),
  whatsapp: overrides.whatsapp ?? null,
  phone: overrides.phone ?? '+5491100000000',
  tos_accepted_at: overrides.tos_accepted_at ?? addDaysIso(-10),
  ...overrides,
});

const buildCar = (
  ownerId: string,
  index: number,
  template: Partial<CarFixture> = {},
): CarFixture => {
  const id = template.id ?? randomUUID();
  const city = template.location_city ?? ['Buenos Aires', 'Cordoba', 'Rosario', 'Montevideo'][
    index % 4
  ];
  const transmission: CarInsert['transmission'] = (['automatic', 'manual'][index % 2] ??
    'automatic') as CarInsert['transmission'];
  const fuel: CarInsert['fuel'] = (['nafta', 'gasoil', 'electrico'][index % 3] ??
    'nafta') as CarInsert['fuel'];
  const basePrice = template.price_per_day ?? 45000 + index * 5000;
  const deposit = template.deposit_amount ?? Math.round(basePrice * 1.5);

  return {
    id,
    owner_id: ownerId,
    title: template.title ?? `Auto Demo ${index + 1}`,
    brand_id: template.brand_id ?? `brand-${(index % 5) + 1}`,
    model_id: template.model_id ?? `model-${(index % 8) + 1}`,
    brand_text_backup: template.brand_text_backup ?? ['Toyota', 'Peugeot', 'Volkswagen', 'Renault'][
      index % 4
    ],
    model_text_backup:
      template.model_text_backup ?? ['Corolla', '208', 'Polo', 'Clio', 'Civic'][index % 5],
    status: template.status ?? 'active',
    transmission,
    fuel,
    currency: template.currency ?? 'ARS',
    cancel_policy: template.cancel_policy ?? 'moderate',
    price_per_day: basePrice,
    deposit_amount: deposit,
    deposit_required: template.deposit_required ?? true,
    min_rental_days: template.min_rental_days ?? 1,
    max_rental_days: template.max_rental_days ?? 21,
    mileage: template.mileage ?? 32000 + index * 2500,
    seats: template.seats ?? (index % 3 === 0 ? 7 : 5),
    doors: template.doors ?? (index % 2 === 0 ? 5 : 3),
    year: template.year ?? 2018 + (index % 6),
    description:
      template.description ??
      'Vehiculo de prueba para flujos end-to-end. Mantener datos consistentes para escenarios de testing.',
    features:
      template.features ??
      {
        air_conditioning: true,
        bluetooth: index % 2 === 0,
        gps: index % 3 === 0,
        usb: true,
        abs: true,
      },
    payment_methods:
      template.payment_methods ??
      {
        card: true,
        cash: true,
        wallet: true,
      },
    delivery_options:
      template.delivery_options ??
      {
        airport: true,
        home_dropoff: index % 2 === 0,
        agency_pickup: true,
      },
    has_owner_insurance: template.has_owner_insurance ?? true,
    insurance_included: template.insurance_included ?? true,
    location_city: city,
    location_state:
      template.location_state ??
      {
        'Buenos Aires': 'Buenos Aires',
        Cordoba: 'Cordoba',
        Rosario: 'Santa Fe',
        Montevideo: 'Montevideo',
      }[city] ??
      'Buenos Aires',
    location_country: template.location_country ?? (city === 'Montevideo' ? 'UY' : 'AR'),
    location_formatted_address:
      template.location_formatted_address ?? `${city}, ${city === 'Montevideo' ? 'UY' : 'AR'}`,
    location_lat: template.location_lat ?? -34.6037 + index * 0.1,
    location_lng: template.location_lng ?? -58.3816 + index * 0.1,
    location_neighborhood: template.location_neighborhood ?? 'Centro',
    location_postal_code: template.location_postal_code ?? '1400',
    location_province: template.location_province ?? (city === 'Montevideo' ? 'Montevideo' : city),
    location_street: template.location_street ?? 'Av. Demo',
    location_street_number: template.location_street_number ?? `${400 + index}`,
    terms_and_conditions:
      template.terms_and_conditions ??
      'Kilometraje libre dentro de la provincia. Combustible: misma carga al momento de la devolución.',
    rating_avg: template.rating_avg ?? 4.6 - (index % 3) * 0.3,
    rating_count: template.rating_count ?? 42 + index * 3,
    owner_insurance_policy_id: template.owner_insurance_policy_id ?? null,
    region_id: template.region_id ?? null,
    plate: template.plate ?? `TEST${index + 100}`,
    vin: template.vin ?? null,
    created_at: template.created_at ?? addDaysIso(-30 - index),
    updated_at: template.updated_at ?? addDaysIso(-2),
    car_photos:
      template.car_photos ??
      Array.from({ length: 3 }).map((_, photoIndex) => ({
        id: randomUUID(),
        car_id: id,
        url: `https://picsum.photos/seed/${id}-${photoIndex}/800/600`,
        position: photoIndex,
        created_at: addDaysIso(-15),
      })),
    owner:
      template.owner ??
      ({
        id: ownerId,
        full_name: 'Demo Owner',
        avatar_url: null,
        rating_avg: 4.8,
        rating_count: 120,
        created_at: addDaysIso(-400),
      } satisfies CarFixture['owner']),
  };
};

const buildBooking = (
  renterId: string,
  carId: string,
  startOffset: number,
  durationDays: number,
  overrides: Partial<BookingInsert> = {},
): BookingInsert => {
  const start = addDaysIso(startOffset, 10);
  const end = addDaysIso(startOffset + durationDays, 10);

  return {
    id: overrides.id ?? randomUUID(),
    renter_id: overrides.renter_id ?? renterId,
    car_id: overrides.car_id ?? carId,
    status: overrides.status ?? 'confirmed',
    start_at: overrides.start_at ?? start,
    end_at: overrides.end_at ?? end,
    total_amount: overrides.total_amount ?? durationDays * 50000,
    currency: overrides.currency ?? 'ARS',
    payment_status: overrides.payment_status ?? 'succeeded',
    created_at: overrides.created_at ?? addDaysIso(-5),
    updated_at: overrides.updated_at ?? addDaysIso(-3),
    pickup_confirmed_by: overrides.pickup_confirmed_by ?? null,
    dropoff_confirmed_by: overrides.dropoff_confirmed_by ?? null,
    renter_name: overrides.renter_name ?? 'Demo Renter',
    owner_confirmation_at: overrides.owner_confirmation_at ?? addDaysIso(-4),
    renter_confirmation_at: overrides.renter_confirmation_at ?? addDaysIso(-4),
    deposit_status: overrides.deposit_status ?? 'locked',
    wallet_status: overrides.wallet_status ?? 'settled',
    payment_provider: overrides.payment_provider ?? 'mercadopago',
    mercadopago_preference_id: overrides.mercadopago_preference_id ?? null,
    notes: overrides.notes ?? null,
    car_title: overrides.car_title ?? 'Auto Demo',
    car_brand: overrides.car_brand ?? 'Autorenta',
    car_model: overrides.car_model ?? 'Demo',
    pickup_location:
      overrides.pickup_location ??
      {
        address: 'Av. Demo 123',
        city: 'Buenos Aires',
        instructions: 'Presentar licencia vigente.',
      },
    dropoff_location:
      overrides.dropoff_location ??
      {
        address: 'Av. Demo 123',
        city: 'Buenos Aires',
        instructions: 'Revisar combustible antes de entregar.',
      },
  };
};

const buildLedger = (booking: BookingInsert): LedgerFixture => {
  const baseEventAt = booking.start_at ?? addDaysIso(1);
  const asDate = new Date(baseEventAt);
  const eventAt = asDate.toISOString();
  const currency = booking.currency ?? 'ARS';
  const holdAmount = booking.total_amount ? Math.round(booking.total_amount * 0.3) : 70000;
  const fee = Math.round((booking.total_amount ?? 150000) * 0.12);
  const payout = (booking.total_amount ?? 150000) - fee;

  return {
    booking_id: booking.id!,
    renter_wallet_delta: -(holdAmount + (booking.total_amount ?? 0)),
    owner_wallet_delta: payout,
    platform_fee: fee,
    currency,
    events: [
      {
        kind: 'HOLD_DEPOSIT',
        amount: holdAmount,
        currency,
        at: eventAt,
      },
      {
        kind: 'FEE_PLATFORM',
        amount: fee,
        currency,
        at: eventAt,
      },
      {
        kind: 'PAYMENT_CAPTURED',
        amount: booking.total_amount ?? 0,
        currency,
        at: eventAt,
        notes: 'Captura simulada para escenario e2e.',
      },
    ],
  };
};

const ensureFixturesDir = () => {
  mkdirSync(FIXTURES_DIR, { recursive: true });
};

const writeFixture = (name: string, data: unknown) => {
  const target = resolve(FIXTURES_DIR, name);
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
};

const main = () => {
  ensureFixturesDir();

  const ownerProfile = buildProfile({
    role: 'owner',
    full_name: 'E2E Owner Demo',
    id: '11111111-1111-4111-8111-111111111111',
  });
  const renterProfile = buildProfile({
    role: 'renter',
    full_name: 'E2E Renter Demo',
    id: '22222222-2222-4222-8222-222222222222',
  });

  const carCount = 10;
  const cars: CarFixture[] = [];
  for (let i = 0; i < carCount; i += 1) {
    const car = buildCar(ownerProfile.id, i);
    cars.push(car);
  }

  const bookings: BookingInsert[] = [
    buildBooking(renterProfile.id, cars[0].id, 3, 4),
    buildBooking(renterProfile.id, cars[1].id, 10, 3, { status: 'pending' }),
    buildBooking(renterProfile.id, cars[2].id, 17, 5, { status: 'confirmed' }),
  ];

  const ledgers = bookings.map(buildLedger);

  const rates = cars.slice(0, 5).map((car, index) => ({
    car_id: car.id,
    currency: car.currency,
    base_rate: car.price_per_day,
    security_deposit: car.deposit_amount ?? Math.round(car.price_per_day * 1.5),
    commission_rate: 0.12 + index * 0.01,
  }));

  writeFixture('users.json', {
    generated_at: addDaysIso(0),
    profiles: [ownerProfile, renterProfile],
  });

  writeFixture(
    'cars.json',
    cars.map((car) => ({
      ...car,
      photos: car.car_photos,
    })),
  );

  writeFixture('bookings.json', bookings);
  writeFixture('ledgers.json', ledgers);
  writeFixture('rates.json', rates);
  writeFixture('availability.json', {
    generated_at: addDaysIso(0),
    windows: cars.map((car, idx) => ({
      car_id: car.id,
      available_from: addDaysIso(idx + 1),
      available_to: addDaysIso(idx + 30),
    })),
  });

  console.info('✅ Generated E2E fixtures');
  console.table({
    profiles: 2,
    cars: cars.length,
    bookings: bookings.length,
    ledgers: ledgers.length,
    rates: rates.length,
  });
};

main();
