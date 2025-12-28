/**
 * Argentina Document Validators
 *
 * Validates DNI (Documento Nacional de Identidad) and Driver's License
 * using OCR extracted text.
 */

export interface DocumentValidationResult {
  isValid: boolean;
  confidence: number;
  documentType: 'dni' | 'license';
  side: 'front' | 'back';
  country: 'AR';
  extracted: {
    documentNumber?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    gender?: 'M' | 'F';
    nationality?: string;
    cuil?: string;
    expiryDate?: string;
    issueDate?: string;
    categories?: string[];
    isProfessional?: boolean;
    bloodType?: string;
    tramiteNumber?: string;
  };
  errors: string[];
  warnings: string[];
}

// =============================================================================
// PATTERNS
// =============================================================================

const ARGENTINA_PATTERNS = {
  // DNI: 7-8 digits, optionally with dots (e.g., 12.345.678 or 12345678)
  dni: /\b(\d{1,2}\.?\d{3}\.?\d{3})\b/g,

  // CUIL/CUIT: XX-XXXXXXXX-X (prefixes: 20,23,24,27 for individuals, 30,33,34 for companies)
  cuil: /\b(20|23|24|27|30|33|34)[\-\s]?(\d{8})[\-\s]?(\d)\b/g,

  // Date formats on Argentine documents
  date: /\b(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})\b/g,
  dateText: /\b(\d{1,2})\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s*(\d{4})\b/gi,

  // Gender indicators
  gender: /\b(MASCULINO|FEMENINO|MASC\.?|FEM\.?|SEXO\s*[:\s]*[MF])\b/gi,

  // License categories (national system)
  licenseCategories: /\b(A1|A2\.1|A2\.2|A3|A4|B1|B2|C1|C2|C3|D1|D2|D3|D4|E1|E2|E3|F|G)\b/gi,

  // Expiration on license
  expiry: /(?:VENCE|VENCIMIENTO|VALIDO?\s*HASTA|VTO\.?)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/gi,

  // Professional license indicator
  professional: /\b(PROFESIONAL|PROF\.?|HABILITACION\s*PROFESIONAL)\b/gi,

  // Tramite number (unique per issuance)
  tramite: /(?:TRAMITE|TRAM\.?|TR\.?)[:\s#]*(\d{10,15})/gi,

  // Blood type
  bloodType: /\b(A|B|AB|O)\s*(\+|\-|RH\s*\+|RH\s*\-|POSITIVO|NEGATIVO)\b/gi,
};

// Keywords that should appear on valid documents
const ARGENTINA_DNI_KEYWORDS = {
  front: [
    'REPUBLICA ARGENTINA',
    'DOCUMENTO NACIONAL',
    'IDENTIDAD',
    'DNI',
    'APELLIDO',
    'NOMBRE',
    'NACIONALIDAD',
  ],
  back: [
    'EJEMPLAR',
    'TRAMITE',
    'FECHA',
    'FIRMA',
    'HUELLA',
  ],
};

const ARGENTINA_LICENSE_KEYWORDS = [
  'LICENCIA',
  'CONDUCIR',
  'HABILITADO',
  'CATEGORIA',
  'CLASE',
  'MUNICIPALIDAD',
  'VENCIMIENTO',
  'MINISTERIO',
  'TRANSPORTE',
];

// Month name to number mapping (Spanish)
const MONTH_MAP: Record<string, string> = {
  'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
  'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
  'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12',
};

// =============================================================================
// HELPERS
// =============================================================================

function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDniNumber(text: string): string | null {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(ARGENTINA_PATTERNS.dni)];

  for (const match of matches) {
    const number = match[1].replace(/\./g, '');
    // Valid DNI is 7-8 digits
    if (number.length >= 7 && number.length <= 8) {
      return number;
    }
  }

  return null;
}

function extractCuil(text: string): string | null {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(ARGENTINA_PATTERNS.cuil)];

  for (const match of matches) {
    const prefix = match[1];
    const body = match[2];
    const verifier = match[3];
    const cuil = `${prefix}-${body}-${verifier}`;

    if (validateCuilChecksum(cuil)) {
      return cuil;
    }
  }

  return null;
}

/**
 * Validate CUIL/CUIT checksum (Modulo 11)
 */
function validateCuilChecksum(cuil: string): boolean {
  const clean = cuil.replace(/\D/g, '');
  if (clean.length !== 11) return false;

  const coefficients = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean[i]) * coefficients[i];
  }

  const remainder = sum % 11;
  let expectedVerifier: number;

  if (remainder === 0) {
    expectedVerifier = 0;
  } else if (remainder === 1) {
    // Special case: prefix 23 uses 4, prefix 27 uses 4, otherwise invalid
    const prefix = clean.substring(0, 2);
    expectedVerifier = (prefix === '23' || prefix === '27') ? 4 : -1;
  } else {
    expectedVerifier = 11 - remainder;
  }

  return parseInt(clean[10]) === expectedVerifier;
}

function extractDate(text: string): string | null {
  const normalized = normalizeText(text);

  // Try numeric format first (DD/MM/YYYY)
  const numericMatches = [...normalized.matchAll(ARGENTINA_PATTERNS.date)];
  for (const match of numericMatches) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];

    // Validate reasonable date
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }

  // Try text format (DD MMM YYYY)
  const textMatches = [...normalized.matchAll(ARGENTINA_PATTERNS.dateText)];
  for (const match of textMatches) {
    const day = match[1].padStart(2, '0');
    const monthText = match[2].toUpperCase();
    const year = match[3];
    const month = MONTH_MAP[monthText];

    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function extractGender(text: string): 'M' | 'F' | null {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(ARGENTINA_PATTERNS.gender)];

  for (const match of matches) {
    const value = match[1].toUpperCase();
    if (value.includes('MASCULINO') || value.includes('MASC') || value.endsWith('M')) {
      return 'M';
    }
    if (value.includes('FEMENINO') || value.includes('FEM') || value.endsWith('F')) {
      return 'F';
    }
  }

  return null;
}

function extractName(text: string): { fullName?: string; firstName?: string; lastName?: string } {
  const normalized = normalizeText(text);
  const result: { fullName?: string; firstName?: string; lastName?: string } = {};

  // Try to find APELLIDO ... NOMBRE pattern
  const apellidoMatch = normalized.match(/APELLIDO[S]?\s*[:\.]?\s*([A-Z\s]+?)(?=\n|NOMBRE|FECHA|SEXO|$)/);
  const nombreMatch = normalized.match(/NOMBRE[S]?\s*[:\.]?\s*([A-Z\s]+?)(?=\n|APELLIDO|FECHA|SEXO|$)/);

  if (apellidoMatch && nombreMatch) {
    result.lastName = apellidoMatch[1].trim();
    result.firstName = nombreMatch[1].trim();
    result.fullName = `${result.lastName} ${result.firstName}`;
  } else if (apellidoMatch) {
    result.lastName = apellidoMatch[1].trim();
    result.fullName = result.lastName;
  } else if (nombreMatch) {
    result.firstName = nombreMatch[1].trim();
    result.fullName = result.firstName;
  }

  return result;
}

function extractLicenseCategories(text: string): string[] {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(ARGENTINA_PATTERNS.licenseCategories)];
  const categories = [...new Set(matches.map(m => m[1].toUpperCase()))];
  return categories;
}

function extractExpiryDate(text: string): string | null {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(ARGENTINA_PATTERNS.expiry)];

  if (matches.length > 0) {
    const dateStr = matches[0][1];
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function countKeywords(text: string, keywords: string[]): number {
  const normalized = normalizeText(text);
  return keywords.filter(kw => normalized.includes(normalizeText(kw))).length;
}

// =============================================================================
// VALIDATORS
// =============================================================================

/**
 * Validate Argentina DNI Front
 */
export function validateArgentinaDniFront(text: string): DocumentValidationResult {
  const result: DocumentValidationResult = {
    isValid: false,
    confidence: 0,
    documentType: 'dni',
    side: 'front',
    country: 'AR',
    extracted: {},
    errors: [],
    warnings: [],
  };

  const normalized = normalizeText(text);

  // Check for required keywords (confidence boost)
  const keywordCount = countKeywords(normalized, ARGENTINA_DNI_KEYWORDS.front);
  if (keywordCount < 2) {
    result.errors.push('No se detectaron suficientes indicadores de DNI argentino');
    return result;
  }
  result.confidence += keywordCount * 10;

  // Extract document number
  const dniNumber = extractDniNumber(text);
  if (dniNumber) {
    result.extracted.documentNumber = dniNumber;
    result.confidence += 25;
  } else {
    result.errors.push('No se encontro numero de documento');
  }

  // Extract name
  const nameData = extractName(text);
  if (nameData.fullName) {
    result.extracted.fullName = nameData.fullName;
    result.extracted.firstName = nameData.firstName;
    result.extracted.lastName = nameData.lastName;
    result.confidence += 15;
  } else {
    result.warnings.push('No se pudo extraer el nombre completo');
  }

  // Extract birth date
  const birthDate = extractDate(text);
  if (birthDate) {
    result.extracted.birthDate = birthDate;
    result.confidence += 10;
  }

  // Extract gender
  const gender = extractGender(text);
  if (gender) {
    result.extracted.gender = gender;
    result.confidence += 5;
  }

  // Check for nationality
  if (normalized.includes('ARGENTIN')) {
    result.extracted.nationality = 'ARGENTINA';
    result.confidence += 5;
  }

  // Cap confidence at 100
  result.confidence = Math.min(result.confidence, 100);

  // Valid if confidence >= 50 and no critical errors
  result.isValid = result.confidence >= 50 && result.extracted.documentNumber !== undefined;

  return result;
}

/**
 * Validate Argentina DNI Back
 */
export function validateArgentinaDniBack(text: string): DocumentValidationResult {
  const result: DocumentValidationResult = {
    isValid: false,
    confidence: 0,
    documentType: 'dni',
    side: 'back',
    country: 'AR',
    extracted: {},
    errors: [],
    warnings: [],
  };

  const normalized = normalizeText(text);

  // Check for back-side keywords
  const keywordCount = countKeywords(normalized, ARGENTINA_DNI_KEYWORDS.back);
  if (keywordCount < 1) {
    result.errors.push('No se detectaron indicadores del dorso del DNI');
    return result;
  }
  result.confidence += keywordCount * 15;

  // Extract CUIL
  const cuil = extractCuil(text);
  if (cuil) {
    result.extracted.cuil = cuil;
    result.confidence += 30;
  }

  // Extract tramite number
  const tramiteMatches = [...normalized.matchAll(ARGENTINA_PATTERNS.tramite)];
  if (tramiteMatches.length > 0) {
    result.extracted.tramiteNumber = tramiteMatches[0][1];
    result.confidence += 15;
  }

  // DNI number might also appear on back
  const dniNumber = extractDniNumber(text);
  if (dniNumber) {
    result.extracted.documentNumber = dniNumber;
    result.confidence += 10;
  }

  result.confidence = Math.min(result.confidence, 100);
  result.isValid = result.confidence >= 40;

  return result;
}

/**
 * Validate Argentina Driver's License Front
 */
export function validateArgentinaLicenseFront(text: string): DocumentValidationResult {
  const result: DocumentValidationResult = {
    isValid: false,
    confidence: 0,
    documentType: 'license',
    side: 'front',
    country: 'AR',
    extracted: {},
    errors: [],
    warnings: [],
  };

  const normalized = normalizeText(text);

  // Check for license keywords
  const keywordCount = countKeywords(normalized, ARGENTINA_LICENSE_KEYWORDS);
  if (keywordCount < 2) {
    result.errors.push('No se detectaron suficientes indicadores de licencia de conducir');
    return result;
  }
  result.confidence += keywordCount * 8;

  // Extract categories
  const categories = extractLicenseCategories(text);
  if (categories.length > 0) {
    result.extracted.categories = categories;
    result.confidence += 20;
  } else {
    result.warnings.push('No se detectaron categorias de licencia');
  }

  // Extract expiry date
  const expiryDate = extractExpiryDate(text);
  if (expiryDate) {
    result.extracted.expiryDate = expiryDate;
    result.confidence += 15;

    // Check if expired
    const expiry = new Date(expiryDate);
    if (expiry < new Date()) {
      result.errors.push('La licencia esta vencida');
    }
  } else {
    result.warnings.push('No se encontro fecha de vencimiento');
  }

  // Check for professional license
  const professionalMatches = [...normalized.matchAll(ARGENTINA_PATTERNS.professional)];
  if (professionalMatches.length > 0) {
    result.extracted.isProfessional = true;
    result.confidence += 5;
  } else {
    result.extracted.isProfessional = false;
  }

  // Extract name
  const nameData = extractName(text);
  if (nameData.fullName) {
    result.extracted.fullName = nameData.fullName;
    result.extracted.firstName = nameData.firstName;
    result.extracted.lastName = nameData.lastName;
    result.confidence += 10;
  }

  // Extract DNI number (often on license too)
  const dniNumber = extractDniNumber(text);
  if (dniNumber) {
    result.extracted.documentNumber = dniNumber;
    result.confidence += 10;
  }

  // Extract blood type
  const bloodMatches = [...normalized.matchAll(ARGENTINA_PATTERNS.bloodType)];
  if (bloodMatches.length > 0) {
    const type = bloodMatches[0][1];
    const rh = bloodMatches[0][2].includes('+') || bloodMatches[0][2].includes('POSITIVO') ? '+' : '-';
    result.extracted.bloodType = `${type}${rh}`;
    result.confidence += 5;
  }

  result.confidence = Math.min(result.confidence, 100);
  result.isValid = result.confidence >= 50 && result.errors.filter(e => e.includes('vencida')).length === 0;

  return result;
}

/**
 * Validate Argentina Driver's License Back
 */
export function validateArgentinaLicenseBack(text: string): DocumentValidationResult {
  const result: DocumentValidationResult = {
    isValid: false,
    confidence: 0,
    documentType: 'license',
    side: 'back',
    country: 'AR',
    extracted: {},
    errors: [],
    warnings: [],
  };

  const normalized = normalizeText(text);

  // Back often has additional info, restrictions, etc.
  // Lower confidence threshold since back may have less text

  // Look for any relevant keywords
  const hasLicenseKeywords = ARGENTINA_LICENSE_KEYWORDS.some(kw =>
    normalized.includes(normalizeText(kw))
  );

  if (hasLicenseKeywords) {
    result.confidence += 30;
  }

  // Extract any categories found
  const categories = extractLicenseCategories(text);
  if (categories.length > 0) {
    result.extracted.categories = categories;
    result.confidence += 20;
  }

  // Extract dates
  const dates = [...normalized.matchAll(ARGENTINA_PATTERNS.date)];
  if (dates.length > 0) {
    result.confidence += 10;
  }

  result.confidence = Math.min(result.confidence, 100);
  result.isValid = result.confidence >= 30;

  return result;
}

/**
 * Main validator dispatcher for Argentina documents
 */
export function validateArgentinaDocument(
  text: string,
  documentType: 'dni' | 'license',
  side: 'front' | 'back'
): DocumentValidationResult {
  if (documentType === 'dni') {
    return side === 'front'
      ? validateArgentinaDniFront(text)
      : validateArgentinaDniBack(text);
  } else {
    return side === 'front'
      ? validateArgentinaLicenseFront(text)
      : validateArgentinaLicenseBack(text);
  }
}
