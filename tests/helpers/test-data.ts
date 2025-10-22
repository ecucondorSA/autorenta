/**
 * Test Data Factory
 *
 * Centralized test data generation for E2E tests
 */

import { v4 as uuidv4 } from 'uuid';

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'locador' | 'locatario' | 'ambos';
}

export interface TestCar {
  brand: string;
  model: string;
  year: number;
  plate: string;
  category: 'economy' | 'premium' | 'luxury';
  pricePerDay: number;
  city: string;
  address: string;
  features: string[];
}

export interface TestBooking {
  startDate: string;
  endDate: string;
  totalDays: number;
  expectedPrice: number;
}

/**
 * Generate unique test user
 */
export function generateTestUser(role: 'locador' | 'locatario' | 'ambos' = 'locatario'): TestUser {
  const uniqueId = uuidv4().slice(0, 8);
  return {
    email: `test.${role}.${uniqueId}@autorenta.test`,
    password: `Test${role}${uniqueId}!`,
    fullName: `Test User ${uniqueId}`,
    phone: `+549${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    role,
  };
}

/**
 * Generate test car data
 */
export function generateTestCar(category: 'economy' | 'premium' | 'luxury' = 'economy'): TestCar {
  const cars = {
    economy: [
      { brand: 'Toyota', model: 'Corolla', year: 2020, price: 15000 },
      { brand: 'Volkswagen', model: 'Polo', year: 2021, price: 14000 },
      { brand: 'Chevrolet', model: 'Onix', year: 2022, price: 13000 },
    ],
    premium: [
      { brand: 'Audi', model: 'A4', year: 2021, price: 35000 },
      { brand: 'BMW', model: '320i', year: 2022, price: 40000 },
      { brand: 'Mercedes-Benz', model: 'C200', year: 2021, price: 38000 },
    ],
    luxury: [
      { brand: 'Tesla', model: 'Model 3', year: 2023, price: 60000 },
      { brand: 'Porsche', model: 'Cayenne', year: 2022, price: 80000 },
      { brand: 'BMW', model: 'X5', year: 2023, price: 70000 },
    ],
  };

  const randomCar = cars[category][Math.floor(Math.random() * cars[category].length)];
  const uniqueId = uuidv4().slice(0, 6).toUpperCase();

  return {
    ...randomCar,
    plate: `AB${uniqueId}`,
    category,
    pricePerDay: randomCar.price,
    city: 'Buenos Aires',
    address: `Av. ${uniqueId} 123`,
    features: [
      'Aire acondicionado',
      'Bluetooth',
      'Cámara de retroceso',
      'Control crucero',
    ],
  };
}

/**
 * Generate test booking dates
 */
export function generateTestBooking(daysFromNow: number = 7, duration: number = 3): TestBooking {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + daysFromNow);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    totalDays: duration,
    expectedPrice: 0, // Will be calculated based on car price
  };
}

/**
 * Test user credentials (seeded in database)
 */
export const SEED_USERS = {
  renter: {
    email: 'renter.test@autorenta.com',
    password: 'TestRenter123!',
    role: 'locatario' as const,
  },
  owner: {
    email: 'owner.test@autorenta.com',
    password: 'TestOwner123!',
    role: 'locador' as const,
  },
  admin: {
    email: 'admin.test@autorenta.com',
    password: 'TestAdmin123!',
    role: 'admin' as const,
  },
  both: {
    email: 'both.test@autorenta.com',
    password: 'TestBoth123!',
    role: 'ambos' as const,
  },
};

/**
 * Test wallet amounts (in ARS)
 */
export const WALLET_AMOUNTS = {
  small: 10000, // 10,000 ARS
  medium: 50000, // 50,000 ARS
  large: 100000, // 100,000 ARS
  insufficient: 1000, // Not enough for most bookings
};

/**
 * Test cities for location filters
 */
export const TEST_CITIES = [
  'Buenos Aires',
  'Córdoba',
  'Rosario',
  'Mendoza',
  'La Plata',
  'San Miguel de Tucumán',
  'Mar del Plata',
];

/**
 * Test car features
 */
export const CAR_FEATURES = [
  'Aire acondicionado',
  'Bluetooth',
  'GPS',
  'Cámara de retroceso',
  'Asientos de cuero',
  'Control crucero',
  'Sensor de estacionamiento',
  'Techo solar',
  'Apple CarPlay',
  'Android Auto',
];
