// Tipos para el PDF Generator Worker
// AutoRenta usa modelo de COMODATO ONEROSO (préstamo de uso con compensación)

export type DocumentType = 'contract' | 'receipt' | 'invoice' | 'inspection';

export interface GeneratePDFRequest {
  type: DocumentType;
  data: ContractData | ReceiptData | InvoiceData | InspectionData;
  options?: PDFOptions;
}

export interface PDFOptions {
  language?: 'es' | 'pt' | 'en';
  includeTerms?: boolean;
  watermark?: boolean;
}

// ============================================
// CONTRATO DE COMODATO
// Comodante = quien presta (propietario)
// Comodatario = quien recibe (usuario)
// ============================================
export interface ContractData {
  // Booking info
  booking_id: string;
  booking_reference?: string;
  start_date: string; // ISO date
  end_date: string;
  days_count: number;

  // Montos (en centavos)
  contribution_cents: number; // Contribución de uso (antes: rental_amount)
  deposit_amount_cents: number; // Depósito de garantía
  insurance_cents?: number; // Prima FGO
  fees_cents?: number; // Comisión plataforma
  total_amount_cents: number;
  currency: 'USD' | 'ARS' | 'BRL';

  // Vehículo (objeto del comodato)
  car: {
    title: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
    color: string;
    vin?: string;
    mileage: number;
    fuel_policy?: string;
    mileage_limit?: number;
    extra_km_price?: number;
  };

  // Comodatario (quien recibe el vehículo en préstamo)
  comodatario: {
    full_name: string;
    gov_id_type?: string;
    gov_id_number: string;
    driver_license_number: string;
    driver_license_expiry?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };

  // Comodante (quien presta el vehículo)
  comodante: {
    full_name: string;
    gov_id_number?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };

  // Cobertura FGO (Fondo de Garantía Operativa)
  fgo?: {
    policy_number?: string;
    liability_coverage?: number; // Cobertura máxima
    deductible?: number; // Franquicia
  };

  // Ubicaciones
  pickup_address?: string;
  dropoff_address?: string;

  // Términos adicionales
  additional_terms?: string[];
}

// ============================================
// COMPROBANTE DE PAGO
// ============================================
export interface ReceiptData {
  // Identificadores
  receipt_number: string;
  booking_id: string;
  payment_id?: string;

  // Fecha
  payment_date: string;

  // Usuario que paga
  payer: {
    full_name: string;
    email: string;
    gov_id_number?: string;
  };

  // Montos
  amount_cents: number;
  currency: 'USD' | 'ARS' | 'BRL';
  fx_rate?: number;
  amount_local_cents?: number;

  // Método de pago
  payment_method: string;
  provider?: string;
  provider_reference?: string;
  last_four_digits?: string;

  // Desglose
  line_items: LineItem[];

  // Estado
  status: 'completed' | 'pending' | 'refunded';
}

export interface LineItem {
  description: string;
  quantity?: number;
  unit_price_cents?: number;
  amount_cents: number;
}

// ============================================
// LIQUIDACIÓN DE REWARDS (para Comodante)
// El comodante NO recibe "renta" sino rewards por participación
// ============================================
export interface InvoiceData {
  // Identificadores
  invoice_number: string;
  period_id?: string; // Período de rewards (mes/año)

  // Fechas
  invoice_date: string;
  period_start: string;
  period_end: string;

  // Comodante (receptor de rewards)
  comodante: {
    full_name: string;
    gov_id_number?: string;
    email: string;
    address?: string;
    city?: string;
    country?: string;
    mercadopago_account?: string;
  };

  // Resumen de actividad
  activity_summary?: {
    total_bookings: number;
    total_days_shared: number;
    vehicles_count: number;
  };

  // Puntos de participación
  points?: {
    availability: number;
    rating: number;
    seniority: number;
    referrals: number;
    response_time: number;
    participation: number;
    bonus: number;
    penalties: number;
    total: number;
  };

  // Montos
  gross_pool_share_cents: number; // Parte del reward pool (75%)
  platform_fee_cents: number; // Ya descontado
  fgo_contribution_cents?: number; // Contribución FGO (10%)
  net_amount_cents: number; // Neto a recibir
  currency: 'USD' | 'ARS' | 'BRL';

  // Desglose
  line_items: LineItem[];

  // Pago
  payment_method: string;
  payment_reference?: string;
  payment_date?: string;
}

// ============================================
// ACTA DE INSPECCIÓN
// ============================================
export interface InspectionData {
  // Identificadores
  inspection_id: string;
  booking_id: string;

  // Tipo
  type: 'delivery' | 'return';
  inspection_date: string;

  // Participantes
  inspector_name: string;
  comodatario_name: string;
  comodante_name?: string;

  // Vehículo
  car: {
    title: string;
    plate: string;
    mileage_at_inspection: number;
    fuel_level: string; // '1/4', '1/2', '3/4', 'full'
  };

  // Checklist
  checklist: ChecklistItem[];

  // Daños
  damages?: DamageItem[];

  // Fotos (URLs)
  photo_urls?: string[];

  // Firmas
  comodatario_signature?: string; // base64
  comodante_signature?: string;

  // Notas
  notes?: string;
}

export interface ChecklistItem {
  item: string;
  status: 'ok' | 'damaged' | 'missing' | 'na';
  notes?: string;
}

export interface DamageItem {
  location: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  estimated_cost_cents?: number;
  photo_url?: string;
}

// ============================================
// RESPONSE
// ============================================
export interface PDFResponse {
  success: boolean;
  pdf_base64?: string;
  filename?: string;
  error?: string;
}

// Environment
export interface Env {
  ENVIRONMENT: string;
  API_SECRET?: string;
}
