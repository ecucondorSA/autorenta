/**
 * Bias filters for WhatsApp market analysis
 * Removes ECUCONDOR and currency exchange related content
 */

// Chat IDs to exclude (ECUCONDOR and currency exchange groups)
export const EXCLUDED_CHAT_IDS = [
  362,   // ECUCÓNDOR S.A.S
  363,   // ECUCÓNDOR S.A.S (duplicate)
  9206,  // GENERAL ECUCONDOR SAS
  388,   // ONLICAMBBIO
  397,   // ONLICAMBBIO (duplicate)
  364,   // CASA DE LOS MIJINES + CAMBIO
  365,   // CASA DE LOS MIJINES + CAMBIO (duplicate)
  376,   // CAMBIO related
  377,   // CAMBIO related (duplicate)
  3384,  // CAMBIO related
  3385,  // CAMBIO related (duplicate)
  17541, // CAMBIO related
  17542, // CAMBIO related (duplicate)
];

// Keywords to filter out (currency exchange related)
export const EXCLUDED_KEYWORDS = [
  "cambio",
  "dólar",
  "dolar",
  "dolares",
  "dólares",
  "pesos",
  "pix",
  "transferencia",
  "cotización",
  "cotizacion",
  "divisa",
  "divisas",
  "banco pichincha",
  "giro",
  "remesa",
  "ecucondor",
  "onlicambbio",
];

/**
 * Build SQL WHERE clause for excluding biased chats
 */
export function getExcludedChatsClause(): string {
  return `chat_row_id NOT IN (${EXCLUDED_CHAT_IDS.join(", ")})`;
}

/**
 * Build SQL WHERE clause for excluding currency keywords
 */
export function getExcludedKeywordsClause(): string {
  return EXCLUDED_KEYWORDS.map(
    kw => `LOWER(text_data) NOT LIKE '%${kw}%'`
  ).join(" AND ");
}

/**
 * Get full bias filter SQL clause
 */
export function getBiasFilterClause(): string {
  return `${getExcludedChatsClause()} AND ${getExcludedKeywordsClause()}`;
}

/**
 * Check if a message text contains excluded keywords
 */
export function containsExcludedKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return EXCLUDED_KEYWORDS.some(kw => lowerText.includes(kw));
}

/**
 * Check if a chat ID should be excluded
 */
export function isExcludedChat(chatId: number): boolean {
  return EXCLUDED_CHAT_IDS.includes(chatId);
}
