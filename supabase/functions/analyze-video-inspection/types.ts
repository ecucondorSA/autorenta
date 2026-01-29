/**
 * Types for Video Inspection Analysis
 */

export interface FrameInput {
  url: string;
  timestamp_ms: number;
  suggested_area?: string;
}

export interface AnalyzeVideoInspectionRequest {
  booking_id: string;
  stage: 'check_in' | 'check_out' | 'renter_check_in';
  frames: FrameInput[];
  compare_with_checkin?: boolean;
}

export interface DetectedDamage {
  frame_index: number;
  frame_url: string;
  type: 'scratch' | 'dent' | 'crack' | 'stain' | 'missing' | 'other';
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  location: string;
  confidence: number;
  bounding_box?: { x: number; y: number; width: number; height: number };
}

export interface OdometerReading {
  value: number;
  unit: 'km' | 'mi';
  confidence: number;
  frame_url: string;
}

export interface FuelLevelReading {
  percentage: number;
  confidence: number;
  frame_url: string;
}

export interface AreasDetected {
  front: boolean;
  rear: boolean;
  left_side: boolean;
  right_side: boolean;
  interior: boolean;
  dashboard: boolean;
  trunk: boolean;
}

export interface AnalyzeVideoInspectionResponse {
  success: boolean;
  damages: DetectedDamage[];
  odometer?: OdometerReading;
  fuel_level?: FuelLevelReading;
  areas_detected: AreasDetected;
  warnings: string[];
  summary: string;
  error?: string;
}

export interface FrameAnalysisResult {
  area: string;
  damages: Array<{
    type: string;
    description: string;
    severity: string;
    confidence: number;
    location: string;
  }>;
  odometer?: { value: number; unit: string; confidence: number };
  fuel_level?: { percentage: number; confidence: number };
}

// Damage type labels for UI
export const DAMAGE_TYPE_LABELS: Record<DetectedDamage['type'], string> = {
  scratch: 'Rayón',
  dent: 'Abolladura',
  crack: 'Grieta',
  stain: 'Mancha',
  missing: 'Faltante',
  other: 'Otro',
};

// Severity labels for UI
export const SEVERITY_LABELS: Record<DetectedDamage['severity'], string> = {
  minor: 'Menor',
  moderate: 'Moderado',
  severe: 'Severo',
};

// Area labels for UI
export const AREA_LABELS: Record<keyof AreasDetected, string> = {
  front: 'Frente',
  rear: 'Trasera',
  left_side: 'Lateral Izquierdo',
  right_side: 'Lateral Derecho',
  interior: 'Interior',
  dashboard: 'Tablero',
  trunk: 'Maletero',
};
