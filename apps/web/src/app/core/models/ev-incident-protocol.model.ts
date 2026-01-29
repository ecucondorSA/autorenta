/**
 * Modelos para el Protocolo de Incidentes EV
 * Sistema paso a paso para documentación de siniestros en vehículos eléctricos
 */

/**
 * Nivel de riesgo de una sección o protocolo completo
 */
export type RiskLevel = 'green' | 'yellow' | 'red';

/**
 * Riesgo general calculado del protocolo
 */
export type OverallRisk = 'safe' | 'caution' | 'danger' | 'critical';

/**
 * Estado de una sección del protocolo
 */
export type SectionStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Tipo de respuesta para items del checklist
 */
export type AnswerType = 'yes_no' | 'number' | 'text' | 'photo';

/**
 * Nivel de riesgo si la respuesta es afirmativa
 */
export type RiskIfYes = 'low' | 'medium' | 'high' | 'critical';

/**
 * Item individual del checklist de una sección
 */
export interface EVChecklistItem {
  id: string;
  question: string;
  answer_type: AnswerType;
  answer?: boolean | number | string;
  risk_if_yes?: RiskIfYes;
  guidance?: string;
}

/**
 * Sección del protocolo EV
 */
export interface EVProtocolSection {
  id: string;
  step_number: number;
  title: string;
  description: string;
  icon: string;

  checklist: EVChecklistItem[];
  photos_required: number;
  photos_uploaded: string[];

  risk_level: RiskLevel;
  status: SectionStatus;
  completed_at?: string;
}

/**
 * Evaluación de riesgo del protocolo
 */
export interface RiskAssessment {
  overall_risk: OverallRisk;
  battery_safe: boolean;
  recommended_action: string;
  red_sections: number;
  yellow_sections: number;
  green_sections: number;
  calculated_at: string;
}

/**
 * Ubicación geográfica
 */
export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Información del dispositivo
 */
export interface DeviceInfo {
  user_agent?: string;
  platform?: string;
  app_version?: string;
}

/**
 * Protocolo de incidente EV completo
 */
export interface EVIncidentProtocol {
  id: string;
  booking_id: string;
  claim_id?: string;
  car_id: string;

  sections: EVProtocolSection[];
  current_section_index: number;

  risk_assessment?: RiskAssessment;

  started_at: string;
  completed_at?: string;
  last_updated_at: string;

  initiated_by: string;
  initiated_by_role: 'renter' | 'owner';
  location?: GeoLocation;
  device_info?: DeviceInfo;

  created_at: string;
  updated_at: string;
}

/**
 * Foto del protocolo
 */
export interface EVProtocolPhoto {
  id: string;
  protocol_id: string;
  section_id: string;
  photo_url: string;
  thumbnail_url?: string;
  caption?: string;
  metadata?: Record<string, unknown>;
  uploaded_at: string;
  uploaded_by: string;
}

/**
 * Contacto de concesionario EV
 */
export interface EVDealershipContact {
  id: string;
  brand: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  country: string;
  phone?: string;
  emergency_phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  distance_km?: number;
  has_emergency_service: boolean;
}

/**
 * Definiciones de las 8 secciones del protocolo EV
 */
export const EV_PROTOCOL_SECTION_DEFINITIONS: Omit<
  EVProtocolSection,
  'status' | 'photos_uploaded' | 'risk_level'
>[] = [
  {
    id: 'safety',
    step_number: 1,
    title: 'Seguridad Inmediata',
    description: 'Verificar que el área es segura antes de continuar',
    icon: 'shield-checkmark',
    checklist: [
      {
        id: 'safe_parking',
        question: '¿El vehículo está estacionado de forma segura?',
        answer_type: 'yes_no',
      },
      {
        id: 'smoke_smell',
        question: '¿Hay humo, olor a quemado o chispas?',
        answer_type: 'yes_no',
        risk_if_yes: 'critical',
        guidance:
          'Si hay humo o chispas, aléjate inmediatamente 10 metros del vehículo y llama a emergencias.',
      },
      { id: 'ventilation', question: '¿El área está ventilada?', answer_type: 'yes_no' },
    ],
    photos_required: 1,
  },
  {
    id: 'battery_visual',
    step_number: 2,
    title: 'Inspección Visual de Batería',
    description: 'Revisar externamente el pack de batería (ubicado en el piso del vehículo)',
    icon: 'battery-full',
    checklist: [
      {
        id: 'deformation',
        question: '¿Hay deformación visible en la parte inferior del vehículo?',
        answer_type: 'yes_no',
        risk_if_yes: 'high',
        guidance:
          'La deformación puede indicar daño al pack de batería. No intentes mover el vehículo.',
      },
      {
        id: 'cracks',
        question: '¿Hay grietas o daño en la carcasa de la batería?',
        answer_type: 'yes_no',
        risk_if_yes: 'high',
      },
      {
        id: 'leaks',
        question: '¿Hay fugas de líquido debajo del vehículo?',
        answer_type: 'yes_no',
        risk_if_yes: 'critical',
        guidance:
          'Las fugas pueden ser refrigerante tóxico o electrolito de batería. No toques el líquido.',
      },
    ],
    photos_required: 4,
  },
  {
    id: 'temperature',
    step_number: 3,
    title: 'Control de Temperatura',
    description: 'Verificar temperaturas anómalas (NO tocar directamente superficies metálicas)',
    icon: 'thermometer',
    checklist: [
      {
        id: 'hot_zones',
        question: '¿Alguna zona del vehículo se siente inusualmente caliente?',
        answer_type: 'yes_no',
        risk_if_yes: 'high',
        guidance: 'Usa el dorso de la mano para sentir calor a distancia. No toques directamente.',
      },
      {
        id: 'ambient_temp',
        question: 'Temperatura ambiente aproximada (°C)',
        answer_type: 'number',
      },
    ],
    photos_required: 1,
  },
  {
    id: 'bms',
    step_number: 4,
    title: 'Sistema BMS',
    description: 'Verificar alertas y errores en la pantalla del vehículo (si enciende)',
    icon: 'warning',
    checklist: [
      {
        id: 'dashboard_alerts',
        question: '¿Hay alertas o warnings en el tablero?',
        answer_type: 'yes_no',
        risk_if_yes: 'medium',
      },
      {
        id: 'error_codes',
        question: 'Códigos de error mostrados (copiar exactamente)',
        answer_type: 'text',
        guidance: 'Fotografía la pantalla si muestra errores.',
      },
      { id: 'battery_level', question: 'Nivel de batería mostrado (%)', answer_type: 'number' },
    ],
    photos_required: 2,
  },
  {
    id: 'charging_port',
    step_number: 5,
    title: 'Puerto de Carga',
    description: 'Inspeccionar el conector y puerto de carga',
    icon: 'flash',
    checklist: [
      {
        id: 'port_damage',
        question: '¿Hay daño visible en el puerto de carga?',
        answer_type: 'yes_no',
        risk_if_yes: 'medium',
      },
      {
        id: 'burned_contacts',
        question: '¿Los contactos del puerto están quemados o derretidos?',
        answer_type: 'yes_no',
        risk_if_yes: 'high',
        guidance: 'Contactos quemados indican cortocircuito. No intentes cargar el vehículo.',
      },
    ],
    photos_required: 2,
  },
  {
    id: 'cooling',
    step_number: 6,
    title: 'Sistema de Refrigeración',
    description: 'Verificar el sistema de enfriamiento de batería',
    icon: 'snow',
    checklist: [
      {
        id: 'coolant_leak',
        question: '¿Hay fuga de refrigerante (líquido color verde/rosa)?',
        answer_type: 'yes_no',
        risk_if_yes: 'high',
        guidance: 'El refrigerante es tóxico. No lo toques y evita inhalarlo.',
      },
      {
        id: 'hose_damage',
        question: '¿Hay daño visible en mangueras o radiador?',
        answer_type: 'yes_no',
        risk_if_yes: 'medium',
      },
    ],
    photos_required: 2,
  },
  {
    id: 'startup_test',
    step_number: 7,
    title: 'Prueba de Encendido',
    description: 'Solo intentar si las secciones anteriores NO mostraron riesgos críticos',
    icon: 'power',
    checklist: [
      {
        id: 'safe_to_start',
        question: '¿Es seguro intentar encender el vehículo? (basado en secciones previas)',
        answer_type: 'yes_no',
        guidance: 'Si alguna sección anterior mostró riesgo ROJO, NO intentes encender.',
      },
      {
        id: 'starts_correctly',
        question: '¿El vehículo enciende correctamente?',
        answer_type: 'yes_no',
      },
      {
        id: 'abnormal_sounds',
        question: '¿Hay sonidos, vibraciones o olores anómalos al encender?',
        answer_type: 'yes_no',
        risk_if_yes: 'medium',
      },
    ],
    photos_required: 1,
  },
  {
    id: 'summary',
    step_number: 8,
    title: 'Resumen y Contacto',
    description: 'Documentar el incidente y contactar servicio técnico si es necesario',
    icon: 'document-text',
    checklist: [
      {
        id: 'incident_description',
        question: 'Descripción detallada del incidente',
        answer_type: 'text',
      },
      {
        id: 'contacted_service',
        question: '¿Se contactó al servicio técnico oficial de la marca?',
        answer_type: 'yes_no',
      },
    ],
    photos_required: 0,
  },
];

/**
 * Obtiene la acción recomendada según el nivel de riesgo
 */
export function getRecommendedAction(overallRisk: OverallRisk): string {
  switch (overallRisk) {
    case 'critical':
      return 'NO mover el vehículo. Contactar servicio de emergencia EV inmediatamente. Mantener distancia de 10 metros.';
    case 'danger':
      return 'No intentar conducir. Contactar grúa especializada EV y servicio técnico oficial.';
    case 'caution':
      return 'Conducir con precaución al servicio técnico más cercano. Evitar carga rápida.';
    case 'safe':
      return 'El vehículo parece seguro. Se recomienda revisión preventiva en próximo servicio.';
  }
}

/**
 * Calcula el riesgo general basado en secciones completadas
 */
export function calculateOverallRisk(sections: EVProtocolSection[]): OverallRisk {
  const redCount = sections.filter((s) => s.risk_level === 'red').length;
  const yellowCount = sections.filter((s) => s.risk_level === 'yellow').length;

  if (redCount > 0) return 'critical';
  if (yellowCount >= 2) return 'danger';
  if (yellowCount > 0) return 'caution';
  return 'safe';
}

/**
 * Determina si la batería se considera segura
 */
export function isBatterySafe(overallRisk: OverallRisk): boolean {
  return overallRisk === 'safe' || overallRisk === 'caution';
}

/**
 * Obtiene el color Ionic para un nivel de riesgo
 */
export function getRiskColor(risk: RiskLevel | OverallRisk): string {
  switch (risk) {
    case 'green':
    case 'safe':
      return 'success';
    case 'yellow':
    case 'caution':
      return 'warning';
    case 'red':
    case 'danger':
    case 'critical':
      return 'danger';
    default:
      return 'medium';
  }
}

/**
 * Obtiene el icono para un nivel de riesgo
 */
export function getRiskIcon(risk: RiskLevel | OverallRisk): string {
  switch (risk) {
    case 'green':
    case 'safe':
      return 'checkmark-circle';
    case 'yellow':
    case 'caution':
      return 'warning';
    case 'red':
    case 'danger':
    case 'critical':
      return 'alert-circle';
    default:
      return 'help-circle';
  }
}
