/**
 * CarFactory - Factory idempotente para crear autos de test
 *
 * Características:
 * - Genera autos con datos realistas
 * - IDs determinísticos para reproducibilidad
 * - Incluye disponibilidad y precios
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'

const CAR_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

export type CarStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface CarFactoryParams {
  /** Owner user ID */
  ownerId: string

  /** Marca del auto */
  brand?: string

  /** Modelo */
  model?: string

  /** Año */
  year?: number

  /** Patente */
  licensePlate?: string

  /** Estado de aprobación */
  status?: CarStatus

  /** Precio por día en centavos */
  pricePerDayCents?: number

  /** Depósito en centavos */
  depositCents?: number

  /** Ubicación */
  location?: {
    address: string
    city: string
    province: string
    latitude: number
    longitude: number
  }

  /** URLs de fotos */
  photoUrls?: string[]

  /** Clave única para ID determinístico */
  uniqueKey?: string
}

export interface CreatedCar {
  id: string
  ownerId: string
  brand: string
  model: string
  year: number
  licensePlate: string
  status: CarStatus
  pricePerDayCents: number
  depositCents: number
  city: string
}

// Datos de autos de ejemplo para Argentina
const SAMPLE_CARS = [
  { brand: 'Toyota', model: 'Corolla', year: 2022 },
  { brand: 'Volkswagen', model: 'Gol', year: 2021 },
  { brand: 'Ford', model: 'Focus', year: 2020 },
  { brand: 'Chevrolet', model: 'Onix', year: 2023 },
  { brand: 'Fiat', model: '500', year: 2022 },
  { brand: 'Renault', model: 'Sandero', year: 2021 },
  { brand: 'Peugeot', model: '208', year: 2022 },
  { brand: 'Honda', model: 'Civic', year: 2021 }
]

const SAMPLE_LOCATIONS = [
  { city: 'Buenos Aires', province: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  { city: 'Córdoba', province: 'Córdoba', lat: -31.4201, lng: -64.1888 },
  { city: 'Rosario', province: 'Santa Fe', lat: -32.9442, lng: -60.6505 },
  { city: 'Mendoza', province: 'Mendoza', lat: -32.8895, lng: -68.8458 },
  { city: 'Mar del Plata', province: 'Buenos Aires', lat: -38.0055, lng: -57.5426 }
]

export class CarFactory {
  private supabase: SupabaseClient
  private carIndex: number = 0

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NG_APP_SUPABASE_URL || ''
    const key = supabaseKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NG_APP_SUPABASE_ANON_KEY || ''

    if (!url || !key) {
      throw new Error('CarFactory: Supabase credentials required')
    }

    this.supabase = createClient(url, key)
  }

  private generateDeterministicId(uniqueKey: string): string {
    return uuidv5(uniqueKey, CAR_NAMESPACE)
  }

  private generateLicensePlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const randomLetters = Array.from({ length: 2 }, () => letters[Math.floor(Math.random() * 26)]).join('')
    const randomNumbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const randomLetters2 = Array.from({ length: 2 }, () => letters[Math.floor(Math.random() * 26)]).join('')
    return `${randomLetters}${randomNumbers}${randomLetters2}`
  }

  /**
   * Crea un auto de test
   */
  async create(params: CarFactoryParams): Promise<CreatedCar> {
    const sampleCar = SAMPLE_CARS[this.carIndex % SAMPLE_CARS.length]
    const sampleLocation = SAMPLE_LOCATIONS[this.carIndex % SAMPLE_LOCATIONS.length]
    this.carIndex++

    const {
      ownerId,
      brand = sampleCar.brand,
      model = sampleCar.model,
      year = sampleCar.year,
      licensePlate = this.generateLicensePlate(),
      status = 'approved',
      pricePerDayCents = 5000 + Math.floor(Math.random() * 10000), // 50-150 ARS/día
      depositCents = pricePerDayCents * 3, // 3 días de depósito
      location,
      photoUrls = [
        'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800'
      ],
      uniqueKey
    } = params

    const carId = uniqueKey ? this.generateDeterministicId(uniqueKey) : undefined

    const loc = location || {
      address: `Calle Test ${Math.floor(Math.random() * 1000)}`,
      city: sampleLocation.city,
      province: sampleLocation.province,
      latitude: sampleLocation.lat,
      longitude: sampleLocation.lng
    }

    const carData = {
      ...(carId && { id: carId }),
      owner_id: ownerId,
      brand,
      model,
      year,
      license_plate: licensePlate,
      status,
      price_per_day: pricePerDayCents / 100,
      price_per_day_cents: pricePerDayCents,
      deposit_cents: depositCents,
      deposit_amount: depositCents / 100,
      currency: 'ARS',
      address: loc.address,
      city: loc.city,
      province: loc.province,
      latitude: loc.latitude,
      longitude: loc.longitude,
      photo_urls: photoUrls,
      features: ['aire_acondicionado', 'bluetooth', 'gps'],
      transmission: 'automatic',
      fuel_type: 'nafta',
      seats: 5,
      doors: 4,
      is_available: true,
      min_rental_days: 1,
      max_rental_days: 30,
      instant_booking: true
    }

    const { data, error } = await this.supabase
      .from('cars')
      .upsert(carData, {
        onConflict: carId ? 'id' : undefined,
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      throw new Error(`CarFactory: Failed to create car: ${error.message}`)
    }

    console.log(`[CarFactory] Auto creado: ${brand} ${model} (${data.id})`)

    return {
      id: data.id,
      ownerId: data.owner_id,
      brand: data.brand,
      model: data.model,
      year: data.year,
      licensePlate: data.license_plate,
      status: data.status,
      pricePerDayCents: data.price_per_day_cents,
      depositCents: data.deposit_cents,
      city: data.city
    }
  }

  /**
   * Crea un auto aprobado listo para reservar
   */
  async createApproved(ownerId: string, options?: Partial<CarFactoryParams>): Promise<CreatedCar> {
    return this.create({
      ownerId,
      status: 'approved',
      ...options
    })
  }

  /**
   * Crea un auto pendiente de aprobación
   */
  async createPending(ownerId: string, options?: Partial<CarFactoryParams>): Promise<CreatedCar> {
    return this.create({
      ownerId,
      status: 'pending',
      ...options
    })
  }

  /**
   * Obtiene un auto por ID
   */
  async getById(carId: string): Promise<CreatedCar | null> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      ownerId: data.owner_id,
      brand: data.brand,
      model: data.model,
      year: data.year,
      licensePlate: data.license_plate,
      status: data.status,
      pricePerDayCents: data.price_per_day_cents,
      depositCents: data.deposit_cents,
      city: data.city
    }
  }

  /**
   * Obtiene autos de un owner
   */
  async getByOwner(ownerId: string, status?: CarStatus): Promise<CreatedCar[]> {
    let query = this.supabase
      .from('cars')
      .select('*')
      .eq('owner_id', ownerId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error || !data) return []

    return data.map(car => ({
      id: car.id,
      ownerId: car.owner_id,
      brand: car.brand,
      model: car.model,
      year: car.year,
      licensePlate: car.license_plate,
      status: car.status,
      pricePerDayCents: car.price_per_day_cents,
      depositCents: car.deposit_cents,
      city: car.city
    }))
  }

  /**
   * Actualiza el estado de un auto
   */
  async updateStatus(carId: string, status: CarStatus): Promise<void> {
    const { error } = await this.supabase
      .from('cars')
      .update({ status })
      .eq('id', carId)

    if (error) {
      throw new Error(`CarFactory: Failed to update status: ${error.message}`)
    }
  }

  /**
   * Elimina un auto (para cleanup)
   */
  async delete(carId: string): Promise<void> {
    // Primero eliminar bookings relacionados
    await this.supabase
      .from('bookings')
      .delete()
      .eq('car_id', carId)

    const { error } = await this.supabase
      .from('cars')
      .delete()
      .eq('id', carId)

    if (error) {
      console.warn(`CarFactory: Failed to delete car: ${error.message}`)
    }
  }

  /**
   * Busca autos disponibles en una ciudad
   */
  async findAvailable(city?: string, limit: number = 10): Promise<CreatedCar[]> {
    let query = this.supabase
      .from('cars')
      .select('*')
      .eq('status', 'approved')
      .eq('is_available', true)

    if (city) {
      query = query.ilike('city', `%${city}%`)
    }

    const { data } = await query.limit(limit)

    if (!data) return []

    return data.map(car => ({
      id: car.id,
      ownerId: car.owner_id,
      brand: car.brand,
      model: car.model,
      year: car.year,
      licensePlate: car.license_plate,
      status: car.status,
      pricePerDayCents: car.price_per_day_cents,
      depositCents: car.deposit_cents,
      city: car.city
    }))
  }
}

// Singleton
let instance: CarFactory | null = null

export function getCarFactory(): CarFactory {
  if (!instance) {
    instance = new CarFactory()
  }
  return instance
}

export function resetCarFactory(): void {
  instance = null
}
