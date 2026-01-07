// P2P Order types

export type OrderStatus =
  | 'detected'
  | 'extracting'
  | 'pending_transfer'
  | 'transferring'
  | 'awaiting_qr'
  | 'confirming'
  | 'marking_paid'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'manual_review';

export type OrderType = 'buy' | 'sell';

export interface P2POrder {
  id: string;
  order_number: string;
  order_type: OrderType;
  amount_fiat: number;
  currency: string;
  amount_crypto?: number;
  counterparty_name?: string;
  counterparty_id?: string;
  payment_cvu?: string;
  payment_alias?: string;
  payment_holder?: string;
  status: OrderStatus;
  mp_transfer_id?: string;
  mp_transfer_status?: string;
  mp_transferred_at?: Date;
  retry_count: number;
  max_retries: number;
  last_error?: string;
  locked_by?: string;
  lock_expires_at?: Date;
  detected_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface P2PEvent {
  id: string;
  order_id: string;
  event_type: string;
  previous_status?: OrderStatus;
  new_status?: OrderStatus;
  payload?: Record<string, unknown>;
  error_message?: string;
  service_name: string;
  created_at: Date;
}

export interface DetectedOrder {
  orderNumber: string;
  orderType: OrderType;
  amountFiat: number;
  currency: string;
  amountCrypto?: number;
  counterparty?: string;
  counterpartyId?: string;
  binanceStatus: string;
  href?: string;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  qrRequired?: boolean;
  error?: string;
}

export interface PaymentDetails {
  cvu?: string;
  alias?: string;
  holder?: string;
}

export interface BrowserConfig {
  profileName: 'binance' | 'mercadopago';
  profilePath: string;
  lockFile: string;
}

export interface Config {
  supabaseUrl: string;
  supabaseKey: string;
  binanceProfile: string;
  mpProfile: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  pollIntervalMs: number;
  qrTimeoutMs: number;
  display: string;
  headless: boolean;
  logLevel: string;
  logFile: string;
}

// Market Price types for price monitoring
export interface MarketPrice {
  cryptoCurrency: string;
  fiatCurrency: string;
  orderType: 'buy' | 'sell';
  pricePerUnit: number;
  minOrderLimit: number;
  maxOrderLimit: number;
  availableAmount?: number;
  paymentMethods: string[];
  sourceUserId?: string;
  sourceUserName?: string;
  sourceUserTrades?: number;
  sourceUserCompletionRate?: number;
  rankingPosition: number;
}

export interface P2PConfig {
  countryCode: string;
  countryName: string;
  fiatCurrency: string;
  binanceTradeUrl: string;
  paymentMethods: string[];
  minOrderFiat: number;
  maxOrderFiat: number;
  priceUpdateIntervalMinutes: number;
  priceMarginPercentage: number;
  isActive: boolean;
  timezone: string;
}
