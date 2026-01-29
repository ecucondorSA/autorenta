/**
 * Ecuador Document Validators
 *
 * Validates Cedula de Identidad and Driver's License
 * using OCR extracted text.
 */

export interface DocumentValidationResult {
  isValid: boolean;
  confidence: number;
  documentType: 'dni' | 'license';
  side: 'front' | 'back';
  country: 'EC';
  extracted: {
    documentNumber?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    gender?: 'M' | 'F';
    nationality?: string;
    expiryDate?: string;
    issueDate?: string;
    categories?: string[];
    isProfessional?: boolean;
    bloodType?: string;
    maritalStatus?: string;
    province?: string;
    points?: number;
  };
  errors: string[];
  warnings: string[];
}

// =============================================================================
// PATTERNS
// =============================================================================

const ECUADOR_PATTERNS = {
  // Cedula: 10 digits (Province:2 + Type:1 + Sequential:6 + Verifier:1)
  cedula: /\b(\d{10})\b/g,

  // Date formats
  date: /\b(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})\b/g,
  dateText: /\b(\d{1,2})\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s*(\d{4})\b/gi,

  // Gender indicators
  gender: /\b(MASCULINO|FEMENINO|HOMBRE|MUJER|SEXO\s*[:\s]*[MFH])\b/gi,

  // License types (A,B,C,C1,D,D1,E,E1,F,G)
  licenseTypes: /\b(TIPO\s*)?([ABCDEFG]1?)\b/gi,

  // Points system
  points: /(?:PUNTOS?|PTS\.?)[:\s]*(\d{1,2})/gi,

  // Professional indicator
  professional: /\b(PROFESIONAL|PROF\.?|TIPO\s*[CDE]1)\b/gi,

  // Blood type
  bloodType: /\b(A|B|AB|O)\s*(\+|\-|RH\s*\+|RH\s*\-|POSITIVO|NEGATIVO)\b/gi,

  // Expiration
  expiry: /(?:VENCE|VENCIMIENTO|CADUCA|VALIDO?\s*HASTA|CADUCIDAD)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/gi,

  // Marital status
  maritalStatus: /\b(SOLTERO|SOLTERA|CASADO|CASADA|DIVORCIADO|DIVORCIADA|VIUDO|VIUDA|UNION\s*LIBRE)\b/gi,
};

// Ecuador province codes (01-24, 30)
const ECUADOR_PROVINCES: Record<string, string> = {
  '01': 'Azuay',
  '02': 'Bolivar',
  '03': 'Canar',
  '04': 'Carchi',
  '05': 'Cotopaxi',
  '06': 'Chimborazo',
  '07': 'El Oro',
  '08': 'Esmeraldas',
  '09': 'Guayas',
  '10': 'Imbabura',
  '11': 'Loja',
  '12': 'Los Rios',
  '13': 'Manabi',
  '14': 'Morona Santiago',
  '15': 'Napo',
  '16': 'Pastaza',
  '17': 'Pichincha',
  '18': 'Tungurahua',
  '19': 'Zamora Chinchipe',
  '20': 'Galapagos',
  '21': 'Sucumbios',
  '22': 'Orellana',
  '23': 'Santo Domingo',
  '24': 'Santa Elena',
  '30': 'Extranjeros',
};

// Keywords for cedula
const ECUADOR_CEDULA_KEYWORDS = {
  front: [
    'REPUBLICA DEL ECUADOR',
    'CEDULA DE CIUDADANIA',
    'CEDULA DE IDENTIDAD',
    'APELLIDOS',
    'NOMBRES',
    'NACIONALIDAD',
    'ECUATORIAN',
    'FECHA NACIMIENTO',
    'LUGAR NACIMIENTO',
  ],
  back: [
    'ESTADO CIVIL',
    'INSTRUCCION',
    'PROFESION',
    'DOMICILIO',
    'DIRECCION',
    'CONYUGE',
    'FECHA EXPEDICION',
  ],
};

const ECUADOR_LICENSE_KEYWORDS = [
  'LICENCIA',
  'CONDUCIR',
  'AGENCIA NACIONAL',
  'TRANSITO',
  'ANT',
  'TIPO',
  'PUNTOS',
  'CATEGORIA',
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

/**
 * Validate Ecuador Cedula checksum (Modulo 10)
 *
 * Algorithm:
 * 1. Multiply odd positions by 2, subtract 9 if > 9
 * 2. Sum all digits
 * 3. Last digit should make sum divisible by 10
 */
export function validateEcuadorCedulaChecksum(cedula: string): boolean {
  const clean = cedula.replace(/\D/g, '');
  if (clean.length !== 10) return false;

  // Validate province code (01-24 or 30)
  const provinceCode = clean.substring(0, 2);
  const provinceNum = parseInt(provinceCode);
  if (!((provinceNum >= 1 && provinceNum <= 24) || provinceNum === 30)) {
    return false;
  }

  // Validate third digit (person type: 0-5 for natural persons, 6 for public entities, 9 for juridical)
  const thirdDigit = parseInt(clean[2]);
  if (thirdDigit > 6 && thirdDigit !== 9) {
    return false;
  }

  // Modulo 10 algorithm for natural persons (third digit 0-5)
  if (thirdDigit <= 5) {
    const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      let value = parseInt(clean[i]) * coefficients[i];
      if (value > 9) value -= 9;
      sum += value;
    }

    const verifier = parseInt(clean[9]);
    const calculated = (10 - (sum % 10)) % 10;

    return calculated === verifier;
  }

  // For public/juridical entities, different algorithm (simplified check)
  return true;
}

function extractCedulaNumber(text: string): { number: string; province: string } | null {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(ECUADOR_PATTERNS.cedula)];

  for (const match of matches) {
    const number = match[1];

    // Validate it's a valid cedula
    if (validateEcuadorCedulaChecksum(number)) {
      const provinceCode = number.substring(0, 2);
      const province = ECUADOR_PROVINCES[provinceCode] || 'Desconocida';
      return { number, province };
    }
  }

  return null;
}

function extractDate(text: string): string | null {
  const normalized = normalizeText(text);

  // Try numeric format first (DD/MM/YYYY)
  const numericMatches = [...normalized.matchAll(ECUADOR_PATTERNS.date)];
  for (const match of numericMatches) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];

    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }

  // Try text format (DD MMM YYYY)
  const textMatches = [...normalized.matchAll(ECUADOR_PATTERNS.dateText)];
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
  const matches = [...normalized.matchAll(ECUADOR_PATTERNS.gender)];

  for (const match of matches) {
    const value = match[1].toUpperCase();
    if (value.includes('MASCULINO') || value.includes('HOMBRE') || value.endsWith('M') || value.endsWith('H')) {
      return 'M';
    }
    if (value.includes('FEMENINO') || value.includes('MUJER') || value.endsWith('F')) {
      return 'F';
    }
  }

  return null;
}

function extractName(text: string): { fullName?: string; firstName?: string; lastName?: string } {
  const normalized = normalizeText(text);
  const result: { fullName?: string; firstName?: string; lastName?: string } = {};

  // Try APELLIDOS ... NOMBRES pattern
  const apellidosMatch = normalized.match(/APELLIDOS?\s*[:\.]?\s*([A-Z\s]+?)(?=\n|NOMBRES?|FECHA|SEXO|NACIONALIDAD|$)/);
  const nombresMatch = normalized.match(/NOMBRES?\s*[:\.]?\s*([A-Z\s]+?)(?=\n|APELLIDOS?|FECHA|SEXO|NACIONALIDAD|$)/);

  if (apellidosMatch && nombresMatch) {
    result.lastName = apellidosMatch[1].trim();
    result.firstName = nombresMatch[1].trim();
    result.fullName = `${result.lastName} ${result.firstName}`;
  } else if (apellidosMatch) {
    result.lastName = apellidosMatch[1].trim();
    result.fullName = result.lastName;
  } else if (nombresMatch) {
    result.firstName = nombresMatch[1].trim();
    result.fullName = result.firstName;
  }

  return result;
}

function extractLicenseTypes(text: string): string[] {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(ECUADOR_PATTERNS.licenseTypes)];
  const types = [...new Set(matches.map(m => m[2].toUpperCase()))];
  return types;
}

function extractExpiryDate(text: string): string | null {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(ECUADOR_PATTERNS.expiry)];

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

function extractPoints(text: string): number | null {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(ECUADOR_PATTERNS.points)];

  if (matches.length > 0) {
    return parseInt(matches[0][1]);
  }

  return null;
}

function extractMaritalStatus(text: string): string | null {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(ECUADOR_PATTERNS.maritalStatus)];

  if (matches.length > 0) {
    return matches[0][1];
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
 * Validate Ecuador Cedula Front
 */
export function validateEcuadorCedulaFront(text: string): DocumentValidationResult {
  const result: DocumentValidationResult = {
    isValid: false,
    confidence: 0,
    documentType: 'dni',
    side: 'front',
    country: 'EC',
    extracted: {},
    errors: [],
    warnings: [],
  };

  const normalized = normalizeText(text);

  // Check for required keywords
  const keywordCount = countKeywords(normalized, ECUADOR_CEDULA_KEYWORDS.front);
  if (keywordCount < 2) {
    result.errors.push('No se detectaron suficientes indicadores de cedula ecuatoriana');
    return result;
  }
  result.confidence += keywordCount * 8;

  // Extract cedula number with validation
  const cedulaData = extractCedulaNumber(text);
  if (cedulaData) {
    result.extracted.documentNumber = cedulaData.number;
    result.extracted.province = cedulaData.province;
    result.confidence += 35; // High confidence for valid checksum
  } else {
    // Check if there's a 10-digit number that failed checksum
    const anyTenDigit = normalized.match(/\b\d{10}\b/);
    if (anyTenDigit) {
      result.errors.push('Numero de cedula invalido (verificador incorrecto)');
    } else {
      result.errors.push('No se encontro numero de cedula');
    }
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
  if (normalized.includes('ECUATORIAN')) {
    result.extracted.nationality = 'ECUATORIANA';
    result.confidence += 5;
  }

  result.confidence = Math.min(result.confidence, 100);
  result.isValid = result.confidence >= 50 && result.extracted.documentNumber !== undefined;

  return result;
}

/**
 * Validate Ecuador Cedula Back
 */
export function validateEcuadorCedulaBack(text: string): DocumentValidationResult {
  const result: DocumentValidationResult = {
    isValid: false,
    confidence: 0,
    documentType: 'dni',
    side: 'back',
    country: 'EC',
    extracted: {},
    errors: [],
    warnings: [],
  };

  const normalized = normalizeText(text);

  // Check for back-side keywords
  const keywordCount = countKeywords(normalized, ECUADOR_CEDULA_KEYWORDS.back);
  if (keywordCount < 1) {
    result.errors.push('No se detectaron indicadores del reverso de la cedula');
    return result;
  }
  result.confidence += keywordCount * 15;

  // Extract marital status
  const maritalStatus = extractMaritalStatus(text);
  if (maritalStatus) {
    result.extracted.maritalStatus = maritalStatus;
    result.confidence += 10;
  }

  // Cedula number might also appear on back
  const cedulaData = extractCedulaNumber(text);
  if (cedulaData) {
    result.extracted.documentNumber = cedulaData.number;
    result.confidence += 15;
  }

  // Extract dates (issue date, etc.)
  const dates = [...normalized.matchAll(ECUADOR_PATTERNS.date)];
  if (dates.length > 0) {
    result.confidence += 10;
  }

  result.confidence = Math.min(result.confidence, 100);
  result.isValid = result.confidence >= 30;

  return result;
}

/**
 * Validate Ecuador Driver's License Front
 */
export function validateEcuadorLicenseFront(text: string): DocumentValidationResult {
  const result: DocumentValidationResult = {
    isValid: false,
    confidence: 0,
    documentType: 'license',
    side: 'front',
    country: 'EC',
    extracted: {},
    errors: [],
    warnings: [],
  };

  const normalized = normalizeText(text);

  // Check for license keywords
  const keywordCount = countKeywords(normalized, ECUADOR_LICENSE_KEYWORDS);
  if (keywordCount < 2) {
    result.errors.push('No se detectaron suficientes indicadores de licencia de conducir');
    return result;
  }
  result.confidence += keywordCount * 8;

  // Extract license types/categories
  const types = extractLicenseTypes(text);
  if (types.length > 0) {
    result.extracted.categories = types;
    result.confidence += 20;

    // Check for professional (C1, D1, E1)
    const isProfessional = types.some(t => t.endsWith('1'));
    result.extracted.isProfessional = isProfessional;
  } else {
    result.warnings.push('No se detectaron tipos de licencia');
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

  // Extract points
  const points = extractPoints(text);
  if (points !== null) {
    result.extracted.points = points;
    result.confidence += 10;
  }

  // Extract cedula number (usually on license)
  const cedulaData = extractCedulaNumber(text);
  if (cedulaData) {
    result.extracted.documentNumber = cedulaData.number;
    result.confidence += 15;
  }

  // Extract name
  const nameData = extractName(text);
  if (nameData.fullName) {
    result.extracted.fullName = nameData.fullName;
    result.confidence += 5;
  }

  // Extract blood type
  const bloodMatches = [...normalized.matchAll(ECUADOR_PATTERNS.bloodType)];
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
 * Validate Ecuador Driver's License Back
 */
export function validateEcuadorLicenseBack(text: string): DocumentValidationResult {
  const result: DocumentValidationResult = {
    isValid: false,
    confidence: 0,
    documentType: 'license',
    side: 'back',
    country: 'EC',
    extracted: {},
    errors: [],
    warnings: [],
  };

  const normalized = normalizeText(text);

  // Back often has restrictions, additional types, etc.
  const hasLicenseKeywords = ECUADOR_LICENSE_KEYWORDS.some(kw =>
    normalized.includes(normalizeText(kw))
  );

  if (hasLicenseKeywords) {
    result.confidence += 30;
  }

  // Extract any license types found
  const types = extractLicenseTypes(text);
  if (types.length > 0) {
    result.extracted.categories = types;
    result.confidence += 20;
  }

  // Extract dates
  const dates = [...normalized.matchAll(ECUADOR_PATTERNS.date)];
  if (dates.length > 0) {
    result.confidence += 10;
  }

  result.confidence = Math.min(result.confidence, 100);
  result.isValid = result.confidence >= 30;

  return result;
}

/**
 * Main validator dispatcher for Ecuador documents
 */
export function validateEcuadorDocument(
  text: string,
  documentType: 'dni' | 'license',
  side: 'front' | 'back'
): DocumentValidationResult {
  if (documentType === 'dni') {
    return side === 'front'
      ? validateEcuadorCedulaFront(text)
      : validateEcuadorCedulaBack(text);
  } else {
    return side === 'front'
      ? validateEcuadorLicenseFront(text)
      : validateEcuadorLicenseBack(text);
  }
}
