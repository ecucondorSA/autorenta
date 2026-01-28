import { QuestionId } from './conversational-form.service';

export interface QuestionConfig {
  id: QuestionId;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'brand' | 'year' | 'model' | 'photos' | 'number' | 'slider' | 'location' | 'summary';
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
  };
  dependsOn?: QuestionId;
}

export const QUESTIONS_CONFIG: QuestionConfig[] = [
  {
    id: 'vehicle',
    title: '¿Qué auto vas a publicar?',
    subtitle: 'Seleccioná la marca de tu vehículo',
    icon: 'car',
    type: 'brand',
    validation: { required: true },
  },
  {
    id: 'year',
    title: '¿De qué año es tu {brand}?',
    subtitle: 'Esto nos ayuda a calcular el precio sugerido',
    icon: 'calendar',
    type: 'year',
    validation: { required: true, min: 1980, max: new Date().getFullYear() },
    dependsOn: 'vehicle',
  },
  {
    id: 'model',
    title: '¿Qué modelo exacto?',
    subtitle: 'Seleccioná el modelo de tu vehículo',
    icon: 'tag',
    type: 'model',
    validation: { required: true },
    dependsOn: 'year',
  },
  {
    id: 'photos',
    title: 'Mostrá tu {brand} {model}',
    subtitle: 'Las fotos son lo primero que ven los interesados',
    icon: 'camera',
    type: 'photos',
    validation: { required: true, min: 3 },
    dependsOn: 'model',
  },
  {
    id: 'mileage',
    title: '¿Cuántos km tiene?',
    subtitle: 'El kilometraje actual del vehículo',
    icon: 'gauge',
    type: 'number',
    validation: { required: true, min: 0, max: 500000 },
    dependsOn: 'photos',
  },
  {
    id: 'price',
    title: '¿Cuánto querés ganar por día?',
    subtitle: 'Te sugerimos un precio basado en el mercado',
    icon: 'dollar',
    type: 'slider',
    validation: { required: true, min: 10, max: 500 },
    dependsOn: 'mileage',
  },
  {
    id: 'location',
    title: '¿Dónde está tu auto?',
    subtitle: 'Esta ubicación solo se comparte al confirmar reservas',
    icon: 'location',
    type: 'location',
    validation: { required: true },
    dependsOn: 'price',
  },
  {
    id: 'summary',
    title: '¡Listo para publicar!',
    subtitle: 'Revisá que todo esté correcto',
    icon: 'check',
    type: 'summary',
    dependsOn: 'location',
  },
];

/**
 * Smart defaults applied automatically when publishing
 * These are based on common patterns from existing listings
 */
export const SMART_DEFAULTS = {
  // Rental rules
  mileage_limit: 200, // km per day
  extra_km_price: 0.5, // USD per extra km
  fuel_policy: 'full_to_full',
  max_anticipation_days: 90,
  allow_second_driver: false,

  // Pricing
  deposit_required: true,
  deposit_amount: 200,
  auto_approval: false,
  instant_booking_enabled: false,

  // Other
  currency: 'USD',
  is_dynamic_pricing: true,
  min_rental_days: 1,
  max_rental_days: 30,
};

/**
 * Year options for the year selector
 */
export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= 1980; year--) {
    years.push(year);
  }
  return years;
}

/**
 * Format title with dynamic values
 */
export function formatQuestionTitle(
  config: QuestionConfig,
  context: { brand?: string; model?: string; year?: number },
): string {
  let title = config.title;
  if (context.brand) {
    title = title.replace('{brand}', context.brand);
  }
  if (context.model) {
    title = title.replace('{model}', context.model);
  }
  if (context.year) {
    title = title.replace('{year}', context.year.toString());
  }
  return title;
}
