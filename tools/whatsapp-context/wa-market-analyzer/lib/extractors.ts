/**
 * Data extractors for WhatsApp messages
 * Extracts prices, phone numbers, and other structured data
 */

export interface PriceInfo {
  amount: number;
  currency: "ARS" | "USD" | "BRL" | "UNKNOWN";
  original: string;
}

export interface PhoneInfo {
  number: string;
  countryCode: string;
}

/**
 * Extract prices from message text
 */
export function extractPrices(text: string): PriceInfo[] {
  const prices: PriceInfo[] = [];
  const lowerText = text.toLowerCase();

  // USD patterns: $100, 100 usd, 100 dólares, U$S 100
  const usdPatterns = [
    /u\$s?\s*(\d+(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(\d+(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:usd|dólares?|dolares?)/gi,
    /\$\s*(\d+(?:\.\d{3})*(?:,\d{2})?)\s*(?:usd|dólares?)/gi,
  ];

  // ARS patterns: $1000, 1000 pesos, ARS 1000
  const arsPatterns = [
    /(\d+(?:\.\d{3})*(?:,\d{2})?)\s*(?:pesos|ars)/gi,
    /\$\s*(\d+(?:\.\d{3})*)\s*(?!usd|dólares)/gi,
  ];

  // BRL patterns: R$ 100, 100 reais
  const brlPatterns = [
    /r\$\s*(\d+(?:\.\d{3})*(?:,\d{2})?)/gi,
    /(\d+(?:\.\d{3})*(?:,\d{2})?)\s*reais/gi,
  ];

  // Helper to parse number
  const parseNumber = (str: string): number => {
    // Handle both . and , as thousands/decimal separators
    let cleaned = str.replace(/\s/g, "");
    // If has both . and ,, determine format
    if (cleaned.includes(".") && cleaned.includes(",")) {
      // Check which comes last (that's the decimal separator)
      const lastDot = cleaned.lastIndexOf(".");
      const lastComma = cleaned.lastIndexOf(",");
      if (lastComma > lastDot) {
        // European format: 1.000,00
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
      } else {
        // US format: 1,000.00
        cleaned = cleaned.replace(/,/g, "");
      }
    } else if (cleaned.includes(",")) {
      // Could be 1,000 (thousands) or 1,00 (decimal)
      const parts = cleaned.split(",");
      if (parts[1]?.length === 2) {
        // Likely decimal: 100,00
        cleaned = cleaned.replace(",", ".");
      } else {
        // Likely thousands: 1,000
        cleaned = cleaned.replace(",", "");
      }
    }
    return parseFloat(cleaned);
  };

  // Extract USD
  for (const pattern of usdPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseNumber(match[1]);
      if (amount > 0 && amount < 1000000) {
        prices.push({ amount, currency: "USD", original: match[0] });
      }
    }
  }

  // Extract ARS (only if not already matched as USD)
  if (!lowerText.includes("usd") && !lowerText.includes("dólar")) {
    for (const pattern of arsPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amount = parseNumber(match[1]);
        if (amount > 0 && amount < 100000000) {
          prices.push({ amount, currency: "ARS", original: match[0] });
        }
      }
    }
  }

  // Extract BRL
  for (const pattern of brlPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseNumber(match[1]);
      if (amount > 0 && amount < 1000000) {
        prices.push({ amount, currency: "BRL", original: match[0] });
      }
    }
  }

  return prices;
}

/**
 * Extract phone numbers from message text
 */
export function extractPhones(text: string): PhoneInfo[] {
  const phones: PhoneInfo[] = [];

  // Common phone patterns
  const patterns = [
    // Argentina: +54 9 11 1234-5678
    /\+?54\s*9?\s*(\d{2})\s*(\d{4})[\s-]?(\d{4})/g,
    // Ecuador: +593 9 1234 5678
    /\+?593\s*9?\s*(\d{4})[\s-]?(\d{4})/g,
    // Brazil: +55 11 91234-5678
    /\+?55\s*(\d{2})\s*9?(\d{4})[\s-]?(\d{4})/g,
    // Generic: 11 1234-5678
    /\b(\d{2,3})[\s-]?(\d{4})[\s-]?(\d{4})\b/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const full = match[0].replace(/[\s-]/g, "");
      let countryCode = "UNKNOWN";

      if (full.startsWith("54") || full.startsWith("+54")) {
        countryCode = "AR";
      } else if (full.startsWith("593") || full.startsWith("+593")) {
        countryCode = "EC";
      } else if (full.startsWith("55") || full.startsWith("+55")) {
        countryCode = "BR";
      }

      phones.push({ number: full, countryCode });
    }
  }

  // Dedupe by number
  const seen = new Set<string>();
  return phones.filter(p => {
    if (seen.has(p.number)) return false;
    seen.add(p.number);
    return true;
  });
}

/**
 * Extract location mentions from text
 */
export function extractLocations(text: string): string[] {
  const locations: string[] = [];
  const lowerText = text.toLowerCase();

  const locationPatterns = [
    // Buenos Aires
    /\b(palermo|recoleta|belgrano|caballito|flores|once|constituci[oó]n|retiro|microcentro|san telmo|la boca|villa crespo|almagro|balvanera|barracas|parque patricios|boedo|montserrat|san nicol[aá]s)\b/gi,
    // La Plata
    /\b(la plata|city bell|gonnet|tolosa|berisso|ensenada|centro la plata)\b/gi,
    // GBA
    /\b(quilmes|lomas de zamora|avellaneda|lan[uú]s|temperley|ad[ró]gue|banfield|mor[oó]n|ramos mej[ií]a|haedo|castelar|it[uú]zaing[oó]|merlo|moreno|san mart[ií]n|vicente l[oó]pez|olivos|san isidro|tigre|pilar|escobar)\b/gi,
    // Provinces
    /\b(c[oó]rdoba|rosario|mendoza|tucum[aá]n|mar del plata|bah[ií]a blanca|neuqu[eé]n|salta|santa fe)\b/gi,
  ];

  for (const pattern of locationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const location = match[1].toLowerCase();
      if (!locations.includes(location)) {
        locations.push(location);
      }
    }
  }

  return locations;
}

/**
 * Detect message language
 */
export function detectLanguage(text: string): "es" | "pt" | "unknown" {
  const lowerText = text.toLowerCase();

  // Portuguese indicators
  const ptWords = ["você", "voce", "não", "nao", "então", "entao", "também", "tambem", "está", "esta", "são", "sao", "obrigado", "obrigada", "oi", "olá", "tudo bem"];
  const esWords = ["busco", "necesito", "alguien", "hola", "gracias", "está", "también", "entonces", "ustedes", "nosotros"];

  let ptScore = 0;
  let esScore = 0;

  for (const word of ptWords) {
    if (lowerText.includes(word)) ptScore++;
  }

  for (const word of esWords) {
    if (lowerText.includes(word)) esScore++;
  }

  if (ptScore > esScore && ptScore > 0) return "pt";
  if (esScore > ptScore && esScore > 0) return "es";
  return "unknown";
}
