/**
 * Document Types Configuration
 * Maps document types to human-readable labels, icons, and descriptions
 */

export interface DocumentTypeConfig {
  id: string;
  label: string;
  icon: string;
  emoji: string;
  description: string;
  category: 'identity' | 'vehicle' | 'other';
}

export const DOCUMENT_TYPES: Record<string, DocumentTypeConfig> = {
  // Driver/Owner Identity Documents
  gov_id_front: {
    id: 'gov_id_front',
    label: 'DNI - Frente',
    icon: 'id-card',
    emoji: '🆔',
    description: 'Documento de identidad frente',
    category: 'identity',
  },
  gov_id_back: {
    id: 'gov_id_back',
    label: 'DNI - Reverso',
    icon: 'id-card',
    emoji: '🆔',
    description: 'Documento de identidad reverso',
    category: 'identity',
  },
  passport: {
    id: 'passport',
    label: 'Pasaporte',
    icon: 'passport',
    emoji: '📕',
    description: 'Pasaporte válido',
    category: 'identity',
  },
  driver_license: {
    id: 'driver_license',
    label: 'Licencia de Conducir',
    icon: 'license-plate',
    emoji: '🎫',
    description: 'Licencia de conducir válida',
    category: 'identity',
  },

  // Vehicle Documents
  vehicle_registration: {
    id: 'vehicle_registration',
    label: 'Registro del Vehículo',
    icon: 'file-document',
    emoji: '📋',
    description: 'Cédula de identidad del vehículo',
    category: 'vehicle',
  },
  vehicle_insurance: {
    id: 'vehicle_insurance',
    label: 'Póliza de Seguro',
    icon: 'shield-check',
    emoji: '🛡️',
    description: 'Seguro del vehículo vigente',
    category: 'vehicle',
  },
  technical_inspection: {
    id: 'technical_inspection',
    label: 'Verificación Técnica',
    icon: 'wrench-check',
    emoji: '🔧',
    description: 'VTV vigente del vehículo',
    category: 'vehicle',
  },
  circulation_permit: {
    id: 'circulation_permit',
    label: 'Permiso de Circulación',
    icon: 'road',
    emoji: '🛣️',
    description: 'Permiso de circulación válido',
    category: 'vehicle',
  },
  ownership_proof: {
    id: 'ownership_proof',
    label: 'Comprobante de Propiedad',
    icon: 'home',
    emoji: '🏠',
    description: 'Título o factura de propiedad',
    category: 'vehicle',
  },

  // Other Documents
  utility_bill: {
    id: 'utility_bill',
    label: 'Comprobante de Domicilio',
    icon: 'file-document',
    emoji: '📄',
    description: 'Factura de servicios (agua, luz, gas)',
    category: 'other',
  },
  selfie: {
    id: 'selfie',
    label: 'Foto de Rostro (Selfie)',
    icon: 'camera',
    emoji: '🤳',
    description: 'Foto de rostro para verificación',
    category: 'other',
  },
};

/**
 * Get document config by ID
 */
export function getDocumentConfig(docId: string): DocumentTypeConfig | undefined {
  return DOCUMENT_TYPES[docId];
}

/**
 * Get all documents of a specific category
 */
export function getDocumentsByCategory(
  category: DocumentTypeConfig['category'],
): DocumentTypeConfig[] {
  return Object.values(DOCUMENT_TYPES).filter((doc) => doc.category === category);
}

/**
 * Get label for document type
 */
export function getDocumentLabel(docId: string): string {
  return getDocumentConfig(docId)?.label || docId;
}

/**
 * Get emoji for document type
 */
export function getDocumentEmoji(docId: string): string {
  return getDocumentConfig(docId)?.emoji || '📄';
}

/**
 * Get icon name for document type
 */
export function getDocumentIcon(docId: string): string {
  return getDocumentConfig(docId)?.icon || 'file-document';
}
