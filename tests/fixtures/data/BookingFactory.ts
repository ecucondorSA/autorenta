/**
 * BookingFactory - Factory idempotente para crear bookings de test
 *
 * Características:
 * - Usa upsert para ser idempotente
 * - Genera IDs determinísticos para tests reproducibles
 * - Integrado con CheckpointManager para tracking
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'

// Namespace UUID para generar IDs determinísticos
const BOOKING_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

// Tipos de booking
export type BookingStatus =
  | 'pending_payment'
  | 'reserved'
  | 'confirmed'
  | 'in_progress'
  | 'pending_return'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded'

export type PaymentMethod = 'credit_card' | 'wallet' | 'partial_wallet'

export interface BookingFactoryParams {
  /** Car ID (requerido) */
  carId: string

  /** Renter user ID (requerido) */
  renterId: string

  /** Owner user ID (opcional, se obtiene del car si no se especifica) */
  ownerId?: string

  /** Fecha de inicio */
  startDate?: Date

  /** Fecha de fin */
  endDate?: Date

  /** Estado del booking */
  status?: BookingStatus

  /** Monto total en centavos */
  totalAmountCents?: number

  /** Moneda */
  currency?: string

  /** Método de pago */
  paymentMethod?: PaymentMethod

  /** Monto pagado con wallet en centavos */
  walletAmountCents?: number

  /** Monto del alquiler en centavos */
  rentalAmountCents?: number

  /** Monto del depósito en centavos */
  depositAmountCents?: number

  /** Clave única para generar ID determinístico */
  uniqueKey?: string
}

export interface CreatedBooking {
  id: string
  carId: string
  renterId: string
  ownerId: string
  startAt: Date
  endAt: Date
  status: BookingStatus
  totalAmountCents: number
  currency: string
}

export class BookingFactory {
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NG_APP_SUPABASE_URL || ''
    const key = supabaseKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NG_APP_SUPABASE_ANON_KEY || ''

    if (!url || !key) {
      throw new Error('BookingFactory: Supabase credentials required')
    }

    this.supabase = createClient(url, key)
  }

  /**
   * Genera un ID determinístico basado en una clave única
   */
  private generateDeterministicId(uniqueKey: string): string {
    return uuidv5(uniqueKey, BOOKING_NAMESPACE)
  }

  /**
   * Obtiene el owner_id de un car
   */
  private async getCarOwnerId(carId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('cars')
      .select('owner_id')
      .eq('id', carId)
      .single()

    return data?.owner_id || null
  }

  /**
   * Crea o actualiza un booking (idempotente)
   */
  async create(params: BookingFactoryParams): Promise<CreatedBooking> {
    const {
      carId,
      renterId,
      status = 'reserved',
      totalAmountCents = 100000, // 1000 ARS
      currency = 'ARS',
      paymentMethod = 'wallet',
      walletAmountCents,
      rentalAmountCents,
      depositAmountCents,
      uniqueKey
    } = params

    // Calcular fechas por defecto (3-7 días desde hoy)
    const today = new Date()
    const startDate = params.startDate || new Date(today.setDate(today.getDate() + 3))
    const endDate = params.endDate || new Date(new Date(startDate).setDate(startDate.getDate() + 4))

    // Obtener owner_id si no se proporcionó
    let ownerId = params.ownerId
    if (!ownerId) {
      ownerId = await this.getCarOwnerId(carId) || renterId
    }

    // Generar ID determinístico si hay uniqueKey
    const bookingId = uniqueKey
      ? this.generateDeterministicId(uniqueKey)
      : undefined

    const bookingData = {
      ...(bookingId && { id: bookingId }),
      car_id: carId,
      renter_id: renterId,
      owner_id: ownerId,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      status,
      total_cents: totalAmountCents,
      total_amount: totalAmountCents / 100,
      currency,
      payment_method: paymentMethod,
      wallet_amount_cents: walletAmountCents || (paymentMethod === 'wallet' ? totalAmountCents : 0),
      rental_amount_cents: rentalAmountCents || totalAmountCents,
      deposit_amount_cents: depositAmountCents || Math.round(totalAmountCents * 0.3)
    }

    // Usar upsert para idempotencia
    const { data, error } = await this.supabase
      .from('bookings')
      .upsert(bookingData, {
        onConflict: bookingId ? 'id' : undefined,
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      throw new Error(`BookingFactory: Failed to create booking: ${error.message}`)
    }

    return {
      id: data.id,
      carId: data.car_id,
      renterId: data.renter_id,
      ownerId: data.owner_id,
      startAt: new Date(data.start_at),
      endAt: new Date(data.end_at),
      status: data.status,
      totalAmountCents: data.total_cents,
      currency: data.currency
    }
  }

  /**
   * Crea un booking en estado "reserved" (pago completado)
   */
  async createReserved(carId: string, renterId: string, options?: Partial<BookingFactoryParams>): Promise<CreatedBooking> {
    return this.create({
      carId,
      renterId,
      status: 'reserved',
      ...options
    })
  }

  /**
   * Crea un booking en estado "confirmed" (owner aceptó)
   */
  async createConfirmed(carId: string, renterId: string, options?: Partial<BookingFactoryParams>): Promise<CreatedBooking> {
    return this.create({
      carId,
      renterId,
      status: 'confirmed',
      ...options
    })
  }

  /**
   * Crea un booking en estado "in_progress" (check-in completado)
   */
  async createInProgress(carId: string, renterId: string, options?: Partial<BookingFactoryParams>): Promise<CreatedBooking> {
    return this.create({
      carId,
      renterId,
      status: 'in_progress',
      ...options
    })
  }

  /**
   * Crea un booking pendiente de pago
   */
  async createPendingPayment(carId: string, renterId: string, options?: Partial<BookingFactoryParams>): Promise<CreatedBooking> {
    return this.create({
      carId,
      renterId,
      status: 'pending_payment',
      ...options
    })
  }

  /**
   * Actualiza el estado de un booking
   */
  async updateStatus(bookingId: string, status: BookingStatus): Promise<void> {
    const { error } = await this.supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)

    if (error) {
      throw new Error(`BookingFactory: Failed to update status: ${error.message}`)
    }
  }

  /**
   * Obtiene un booking por ID
   */
  async getById(bookingId: string): Promise<CreatedBooking | null> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      carId: data.car_id,
      renterId: data.renter_id,
      ownerId: data.owner_id,
      startAt: new Date(data.start_at),
      endAt: new Date(data.end_at),
      status: data.status,
      totalAmountCents: data.total_cents,
      currency: data.currency
    }
  }

  /**
   * Elimina un booking (para cleanup)
   */
  async delete(bookingId: string): Promise<void> {
    // Primero eliminar inspecciones relacionadas
    await this.supabase
      .from('booking_inspections')
      .delete()
      .eq('booking_id', bookingId)

    // Luego eliminar el booking
    const { error } = await this.supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)

    if (error) {
      console.warn(`BookingFactory: Failed to delete booking: ${error.message}`)
    }
  }

  /**
   * Verifica si un booking existe
   */
  async exists(bookingId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .single()

    return !!data
  }
}

// Singleton instance
let instance: BookingFactory | null = null

export function getBookingFactory(): BookingFactory {
  if (!instance) {
    instance = new BookingFactory()
  }
  return instance
}

export function resetBookingFactory(): void {
  instance = null
}
