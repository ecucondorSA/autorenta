/**
 * Modelos del Sistema FGO (Fondo de Garantía Operativa)
 * AutoRenta - Sistema de contabilidad del fondo de garantía
 */

// ============================================================================
// TIPOS DE MOVIMIENTOS Y SUBFONDOS
// ============================================================================

export type FgoMovementType =
  | 'user_contribution'    // Aporte de usuario (α%)
  | 'siniestro_payment'    // Pago de siniestro
  | 'franchise_payment'    // Pago de franquicia
  | 'capitalization'       // Transferencia a capitalización
  | 'return_to_user'       // Devolución a usuario
  | 'interest_earned'      // Intereses ganados
  | 'adjustment';          // Ajuste manual (admin)

export type SubfundType = 'liquidity' | 'capitalization' | 'profitability';

export type FgoHealthStatus = 'healthy' | 'warning' | 'critical';

export type FgoOperation = 'credit' | 'debit';

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

/**
 * Estado completo del FGO
 * Corresponde a la vista v_fgo_status
 */
export interface FgoStatusView {
  // Saldos por subfondo (en centavos)
  liquidity_balance_cents: number;
  capitalization_balance_cents: number;
  profitability_balance_cents: number;
  total_fgo_balance_cents: number;

  // Parámetros configurables
  alpha_percentage: number;              // α% actual (default: 15%)
  target_months_coverage: number;        // Meses de cobertura objetivo (default: 12)

  // Métricas calculadas
  total_contributions_cents: number;     // Total de aportes recibidos
  total_siniestros_paid_cents: number;   // Total de siniestros pagados
  total_siniestros_count: number;        // Cantidad de siniestros

  // Ratios (pueden ser null si no hay suficiente historial)
  coverage_ratio: number | null;         // RC = Saldo / Meta
  loss_ratio: number | null;             // LR = Siniestros / Aportes
  target_balance_cents: number | null;   // Meta de saldo

  // Estado del fondo
  status: FgoHealthStatus;

  // Timestamps
  last_calculated_at: string;
  updated_at: string;
}

/**
 * Estado del FGO con conversión a USD
 * Para facilitar el uso en componentes
 */
export interface FgoStatus {
  // Saldos en USD
  liquidityBalance: number;
  capitalizationBalance: number;
  profitabilityBalance: number;
  totalBalance: number;

  // Parámetros
  alphaPercentage: number;
  targetMonthsCoverage: number;

  // Métricas en USD
  totalContributions: number;
  totalSiniestrosPaid: number;
  totalSiniestrosCount: number;

  // Ratios
  coverageRatio: number | null;
  lossRatio: number | null;
  targetBalance: number | null;

  // Estado
  status: FgoHealthStatus;
  lastCalculatedAt: Date;
  updatedAt: Date;
}

/**
 * Movimiento individual del FGO
 * Corresponde a la vista v_fgo_movements_detailed
 */
export interface FgoMovement {
  id: string;
  ts: string;
  movement_type: FgoMovementType;
  subfund_type: SubfundType;
  amount_cents: number;
  operation: FgoOperation;
  balance_change_cents: number;  // + para credit, - para debit
  ref: string;

  // Relaciones (pueden ser null)
  user_id?: string;
  user_name?: string;
  booking_id?: string;
  car_id?: string;
  wallet_ledger_id?: string;
  created_by?: string;
  created_by_name?: string;

  // Metadata
  meta: Record<string, any>;
  created_at: string;
}

/**
 * Movimiento con conversión a USD
 */
export interface FgoMovementView {
  id: string;
  timestamp: Date;
  movementType: FgoMovementType;
  subfundType: SubfundType;
  amount: number;  // USD
  operation: FgoOperation;
  balanceChange: number;  // USD
  reference: string;

  // Relaciones
  userId?: string;
  userName?: string;
  bookingId?: string;
  carId?: string;

  // Metadata
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

/**
 * Balance de un subfondo individual
 */
export interface SubfundBalance {
  type: SubfundType;
  balanceCents: number;
  balanceUsd: number;
  percentage: number;  // % del total
  description: string;
  purpose: string;
}

/**
 * Resumen mensual del FGO
 * Corresponde a la vista v_fgo_monthly_summary
 */
export interface MonthlyFgoSummary {
  month: string;                    // YYYY-MM
  movement_type: FgoMovementType;
  subfund_type: SubfundType;
  movement_count: number;
  total_credits_cents: number;
  total_debits_cents: number;
  net_change_cents: number;
}

/**
 * Resumen mensual con conversión a USD
 */
export interface MonthlyFgoSummaryView {
  month: string;
  movementType: FgoMovementType;
  subfundType: SubfundType;
  movementCount: number;
  totalCredits: number;  // USD
  totalDebits: number;   // USD
  netChange: number;     // USD
}

/**
 * Depósito con aporte al FGO
 * Corresponde a la vista v_deposits_with_fgo_contributions
 */
export interface DepositWithFgoContribution {
  wallet_ledger_id: string;
  deposit_timestamp: string;
  user_id: string;
  user_name?: string;
  deposit_cents: number;
  deposit_usd: number;
  deposit_ref: string;

  // Info del aporte al FGO
  fgo_movement_id?: string;
  fgo_contribution_cents?: number;
  fgo_contribution_usd?: number;
  alpha_percentage?: number;
  fgo_ref?: string;
  fgo_contribution_timestamp?: string;
}

/**
 * Depósito con aporte (versión para componentes)
 */
export interface DepositWithFgoView {
  id: string;
  timestamp: Date;
  userId: string;
  userName?: string;
  depositAmount: number;  // USD
  fgoContribution: number;  // USD
  alphaPercentage: number;
  hasContribution: boolean;
}

// ============================================================================
// PARÁMETROS PARA RPCs
// ============================================================================

/**
 * Parámetros para pagar siniestro
 */
export interface PaySiniestroParams {
  bookingId: string;
  amountCents: number;
  description: string;
  ref?: string;
}

/**
 * Parámetros para transferir entre subfondos
 */
export interface TransferBetweenSubfundsParams {
  fromSubfund: SubfundType;
  toSubfund: SubfundType;
  amountCents: number;
  reason: string;
  adminId: string;
}

/**
 * Resultado de operación RPC
 */
export interface FgoRpcResult {
  ok: boolean;
  movement_id?: string;
  ref?: string;
  status?: string;
  error?: string;
  [key: string]: any;
}

// ============================================================================
// HELPERS Y UTILIDADES
// ============================================================================

/**
 * Convierte centavos a USD
 */
export function centsToUsd(cents: number | null | undefined): number {
  if (cents === null || cents === undefined) return 0;
  return cents / 100;
}

/**
 * Convierte USD a centavos
 */
export function usdToCents(usd: number): number {
  return Math.round(usd * 100);
}

/**
 * Formatea un ratio como porcentaje
 */
export function formatRatio(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) return 'N/A';
  return `${(ratio * 100).toFixed(2)}%`;
}

/**
 * Obtiene el nombre legible de un tipo de movimiento
 */
export function getMovementTypeName(type: FgoMovementType): string {
  const names: Record<FgoMovementType, string> = {
    user_contribution: 'Aporte de Usuario',
    siniestro_payment: 'Pago de Siniestro',
    franchise_payment: 'Pago de Franquicia',
    capitalization: 'Capitalización',
    return_to_user: 'Devolución a Usuario',
    interest_earned: 'Intereses Ganados',
    adjustment: 'Ajuste Manual',
  };
  return names[type] || type;
}

/**
 * Obtiene el nombre legible de un subfondo
 */
export function getSubfundName(type: SubfundType): string {
  const names: Record<SubfundType, string> = {
    liquidity: 'Liquidez',
    capitalization: 'Capitalización',
    profitability: 'Rentabilidad',
  };
  return names[type] || type;
}

/**
 * Obtiene el color del estado del FGO
 */
export function getStatusColor(status: FgoHealthStatus): string {
  const colors: Record<FgoHealthStatus, string> = {
    healthy: 'green',
    warning: 'yellow',
    critical: 'red',
  };
  return colors[status] || 'gray';
}

/**
 * Obtiene el icono del estado del FGO
 */
export function getStatusIcon(status: FgoHealthStatus): string {
  const icons: Record<FgoHealthStatus, string> = {
    healthy: '✅',
    warning: '⚠️',
    critical: '🔴',
  };
  return icons[status] || '❓';
}

/**
 * Obtiene el mensaje del estado del FGO
 */
export function getStatusMessage(status: FgoHealthStatus): string {
  const messages: Record<FgoHealthStatus, string> = {
    healthy: 'Saludable',
    warning: 'Advertencia',
    critical: 'Crítico',
  };
  return messages[status] || status;
}

/**
 * Convierte FgoStatusView (de DB) a FgoStatus (para componentes)
 */
export function mapFgoStatus(view: FgoStatusView): FgoStatus {
  return {
    liquidityBalance: centsToUsd(view.liquidity_balance_cents),
    capitalizationBalance: centsToUsd(view.capitalization_balance_cents),
    profitabilityBalance: centsToUsd(view.profitability_balance_cents),
    totalBalance: centsToUsd(view.total_fgo_balance_cents),
    alphaPercentage: view.alpha_percentage,
    targetMonthsCoverage: view.target_months_coverage,
    totalContributions: centsToUsd(view.total_contributions_cents),
    totalSiniestrosPaid: centsToUsd(view.total_siniestros_paid_cents),
    totalSiniestrosCount: view.total_siniestros_count,
    coverageRatio: view.coverage_ratio,
    lossRatio: view.loss_ratio,
    targetBalance: view.target_balance_cents ? centsToUsd(view.target_balance_cents) : null,
    status: view.status,
    lastCalculatedAt: new Date(view.last_calculated_at),
    updatedAt: new Date(view.updated_at),
  };
}

/**
 * Convierte FgoMovement (de DB) a FgoMovementView (para componentes)
 */
export function mapFgoMovement(movement: FgoMovement): FgoMovementView {
  return {
    id: movement.id,
    timestamp: new Date(movement.ts),
    movementType: movement.movement_type,
    subfundType: movement.subfund_type,
    amount: centsToUsd(movement.amount_cents),
    operation: movement.operation,
    balanceChange: centsToUsd(movement.balance_change_cents),
    reference: movement.ref,
    userId: movement.user_id,
    userName: movement.user_name,
    bookingId: movement.booking_id,
    carId: movement.car_id,
    description: movement.meta?.['description'],
    metadata: movement.meta || {},
    createdAt: new Date(movement.created_at),
  };
}
