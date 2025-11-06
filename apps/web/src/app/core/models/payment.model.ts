import type { PaymentStatus, PaymentProvider } from '../types/database.types';

export interface PaymentIntent {
  id: string;
  booking_id: string;
  provider: string;
  status: string;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  provider_payment_id?: string;
  created_at: string;
  updated_at: string;
}
