/**
 * Currency Utilities
 *
 * Helpers para normalizar importes entre monedas.
 * La plataforma usa USD como moneda de display, pero algunos registros
 * históricos pueden estar en ARS con su fx_snapshot guardado.
 */

/**
 * Normaliza un importe a USD usando la tasa de cambio si está disponible.
 *
 * @param amount - Importe en la moneda original
 * @param currency - Moneda original ('USD' | 'ARS')
 * @param fxRate - Tasa de cambio ARS/USD al momento de la transacción
 * @returns Importe normalizado a USD
 *
 * @example
 * normalizeToUsd(1000, 'ARS', 1000) // → 1 USD
 * normalizeToUsd(50, 'USD') // → 50 USD
 * normalizeToUsd(1000, 'ARS') // → 1000 (sin conversión si no hay FX)
 */
export function normalizeToUsd(
  amount: number | null | undefined,
  currency?: string | null,
  fxRate?: number | null,
): number {
  if (amount == null) return 0;

  const curr = (currency || 'USD').toUpperCase();

  // Ya está en USD
  if (curr === 'USD') {
    return amount;
  }

  // ARS con tasa de cambio válida
  if (curr === 'ARS' && fxRate && fxRate > 0) {
    return amount / fxRate;
  }

  // Fallback: retornar el monto sin conversión
  // Esto puede pasar si no hay fx_snapshot guardado
  return amount;
}

/**
 * Normaliza un booking o registro con campos de moneda a USD.
 * Busca campos comunes de FX en el objeto.
 *
 * @param record - Objeto con campos amount/currency/fx
 * @param amountField - Nombre del campo de importe (default: 'total_price')
 * @returns Importe normalizado a USD
 */
export function normalizeRecordToUsd(
  record: Record<string, unknown>,
  amountField = 'total_price',
): number {
  const amount = Number(record[amountField]) || 0;
  const currency = String(record['currency'] || 'USD');

  // Buscar FX rate en campos comunes
  const fxRate =
    record['fx_snapshot'] ??
    record['fx_rate'] ??
    record['fxSnapshot'] ??
    record['fxRate'] ??
    null;

  return normalizeToUsd(amount, currency, fxRate as number | null);
}

/**
 * Convierte cents a USD normalizado.
 *
 * @param cents - Importe en centavos
 * @param currency - Moneda original
 * @param fxRate - Tasa de cambio
 * @returns Importe en USD (no cents)
 */
export function normalizeCentsToUsd(
  cents: number | null | undefined,
  currency?: string | null,
  fxRate?: number | null,
): number {
  if (cents == null) return 0;
  const dollars = cents / 100;
  return normalizeToUsd(dollars, currency, fxRate);
}

/**
 * Formatea un importe como moneda USD.
 *
 * @param amount - Importe en USD
 * @param options - Opciones de formateo
 * @returns String formateado (ej: "$1,234.56")
 */
export function formatUsd(
  amount: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSymbol?: boolean;
  },
): string {
  const { minimumFractionDigits = 0, maximumFractionDigits = 2, showSymbol = true } = options || {};

  if (!showSymbol) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Normaliza y formatea en un solo paso.
 *
 * @param amount - Importe original
 * @param currency - Moneda original
 * @param fxRate - Tasa de cambio
 * @returns String formateado en USD
 */
export function normalizeAndFormatUsd(
  amount: number | null | undefined,
  currency?: string | null,
  fxRate?: number | null,
): string {
  const normalized = normalizeToUsd(amount, currency, fxRate);
  return formatUsd(normalized);
}
