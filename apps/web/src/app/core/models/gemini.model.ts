/**
 * Gemini AI Models
 * Interfaces para las 4 funcionalidades de IA con Google Gemini
 *
 * Features:
 * 1. Chat Suggestions - Sugerencias de respuesta en chat
 * 2. Legal Assistant - Consultas sobre terminos del alquiler
 * 3. Trip Planner - Planificador de viajes
 * 4. Vehicle Checklist - Checklist de inspeccion del vehiculo
 *
 * @module gemini.model
 * @since 2025-12-17
 */

import type { BookingStatus, CancelPolicy } from '@core/types/database.types';

// ============================================
// CHAT SUGGESTIONS
// ============================================

/**
 * Sugerencia de respuesta generada por IA
 */
export interface ChatSuggestion {
  /** ID unico de la sugerencia */
  id: string;
  /** Texto de la sugerencia */
  text: string;
  /** Tono de la respuesta */
  tone: 'formal' | 'friendly' | 'neutral';
  /** Intencion de la respuesta */
  intent: 'question' | 'confirmation' | 'request' | 'info' | 'greeting';
}

/**
 * Contexto del booking para generar sugerencias de chat
 */
export interface AiBookingContext {
  /** ID del booking */
  bookingId: string;
  /** Estado actual del booking */
  status: BookingStatus;
  /** Fecha de inicio del alquiler */
  startDate: string;
  /** Fecha de fin del alquiler */
  endDate: string;
  /** Marca del vehículo */
  carBrand: string;
  /** Modelo del vehículo */
  carModel: string;
  /** Nombre del propietario */
  ownerName: string;
  /** Nombre del locatario */
  renterName: string;
  /** Rol del usuario actual (owner o renter) */
  userRole: 'owner' | 'renter';
}

/**
 * Parametros para generar sugerencias de chat
 */
export interface ChatSuggestionsParams {
  /** Historial de la conversacion (ultimos 5 mensajes) */
  conversationHistory: Array<{
    role: 'user' | 'recipient';
    text: string;
  }>;
  /** Rol del usuario que pide las sugerencias */
  userRole: 'owner' | 'renter';
  /** Contexto del booking */
  bookingContext: AiBookingContext;
}

// ============================================
// LEGAL ASSISTANT
// ============================================

/**
 * Terminos del alquiler para consultas legales
 */
export interface BookingTerms {
  /** Politica de cancelacion */
  cancellationPolicy: CancelPolicy;
  /** Limite de kilometros (null = ilimitado) */
  mileageLimit?: number | null;
  /** Precio por km extra */
  extraKmPrice?: number | null;
  /** Politica de combustible */
  fuelPolicy?: string | null;
  /** Provincias permitidas */
  allowedProvinces?: string[] | null;
  /** Distancia maxima permitida en km */
  maxDistanceKm?: number | null;
  /** Franquicia del seguro en USD */
  insuranceDeductibleUsd?: number | null;
  /** Permite segundo conductor */
  allowSecondDriver?: boolean | null;
  /** Costo del segundo conductor */
  secondDriverCost?: number | null;
  /** Permite fumar */
  allowSmoking?: boolean | null;
  /** Permite mascotas */
  allowPets?: boolean | null;
  /** Permite rideshare (Uber, etc) */
  allowRideshare?: boolean | null;
}

/**
 * Información básica del vehículo para contexto
 */
export interface VehicleInfo {
  /** Marca del vehículo */
  brand: string;
  /** Modelo del vehículo */
  model: string;
  /** Año del vehículo */
  year: number;
}

/**
 * Respuesta del asistente legal
 */
export interface LegalAnswer {
  /** Respuesta a la pregunta */
  answer: string;
  /** Fuentes de la respuesta (ej: "Política de cancelación") */
  sources: string[];
  /** Disclaimer legal */
  disclaimer: string;
  /** Preguntas relacionadas sugeridas */
  relatedQuestions?: string[];
}

/**
 * Parámetros para consulta legal
 */
export interface LegalQuestionParams {
  /** Pregunta del usuario */
  question: string;
  /** Términos del alquiler */
  bookingTerms: BookingTerms;
  /** Información del vehículo */
  vehicleInfo: VehicleInfo;
}

// ============================================
// TRIP PLANNER
// ============================================

/**
 * Preferencias para el planificador de viajes
 */
export interface TripPreferences {
  /** Intereses del viajero */
  interests?: string[];
  /** Presupuesto */
  budget?: 'economico' | 'moderado' | 'premium';
  /** Cantidad de viajeros */
  travelersCount?: number;
  /** Viaja con mascotas */
  withPets?: boolean;
  /** Viaja con ninos */
  withKids?: boolean;
}

/**
 * Actividad dentro de un dia del itinerario
 */
export interface TripActivity {
  /** Hora sugerida */
  time: string;
  /** Descripcion de la actividad */
  activity: string;
  /** Ubicacion/lugar */
  location: string;
  /** Duracion estimada */
  duration: string;
  /** Notas adicionales */
  notes?: string;
}

/**
 * Un día del itinerario
 */
export interface TripDay {
  /** Número del día (1, 2, 3...) */
  dayNumber: number;
  /** Título del día (ej: "Buenos Aires - Mar del Plata") */
  title: string;
  /** Actividades del día */
  activities: TripActivity[];
  /** Lugar de pernocte */
  overnightLocation?: string;
  /** Kilometros estimados para este dia */
  estimatedKm: number;
}

/**
 * Itinerario completo generado por IA
 */
export interface TripItinerary {
  /** Total de dias */
  totalDays: number;
  /** Kilometros totales estimados */
  totalKm: number;
  /** Detalle por dia */
  days: TripDay[];
  /** Tips generales para el viaje */
  tips: string[];
  /** Advertencias (clima, rutas, etc) */
  warnings?: string[];
}

/**
 * Parametros para generar itinerario
 */
export interface TripPlannerParams {
  /** Cantidad de días del viaje */
  days: number;
  /** Ciudad/ubicación de inicio */
  startLocation: string;
  /** Ciudad/ubicación de fin (opcional, puede ser igual al inicio) */
  endLocation?: string;
  /** Tipo de vehículo (para sugerir rutas apropiadas) */
  vehicleType: string;
  /** Preferencias del viajero */
  preferences?: TripPreferences;
}

// ============================================
// VEHICLE CHECKLIST
// ============================================

/**
 * Item individual del checklist
 */
export interface ChecklistItem {
  /** ID único del item */
  id: string;
  /** Etiqueta/descripción del item */
  label: string;
  /** Descripción detallada (opcional) */
  description?: string;
  /** Si es un item crítico (debe verificarse sí o sí) */
  critical: boolean;
  /** Si es específico para este modelo de auto */
  modelSpecific?: boolean;
}

/**
 * Categoría del checklist
 */
export interface ChecklistCategory {
  /** Nombre de la categoría */
  name: string;
  /** Icono (nombre del icono de Lucide) */
  icon: string;
  /** Items de esta categoría */
  items: ChecklistItem[];
}

/**
 * Checklist completo de inspección
 */
export interface VehicleChecklist {
  /** Nombre completo del vehículo */
  vehicleName: string;
  /** Tipo de inspección */
  inspectionType: 'check_in' | 'check_out';
  /** Categorías con sus items */
  categories: ChecklistCategory[];
  /** Tips específicos del modelo */
  tips: string[];
}

/**
 * Parámetros para generar checklist
 */
export interface VehicleChecklistParams {
  /** Marca del vehículo */
  brand: string;
  /** Modelo del vehículo */
  model: string;
  /** Año del vehículo */
  year: number;
  /** Tipo de inspección: check_in (recibir) o check_out (devolver) */
  inspectionType: 'check_in' | 'check_out';
}

// ============================================
// GEMINI SERVICE RESPONSE TYPES
// ============================================

/**
 * Respuesta genérica del worker de Gemini
 */
export interface GeminiWorkerResponse<T> {
  /** Si la operación fue exitosa */
  success: boolean;
  /** Datos de la respuesta */
  data?: T;
  /** Mensaje de error si falló */
  error?: string;
}

/**
 * Estado de procesamiento de IA
 */
export interface AiProcessingState {
  /** Si esta procesando */
  isProcessing: boolean;
  /** Ultimo error */
  lastError: string | null;
  /** Timestamp del ultimo procesamiento */
  lastProcessedAt?: Date;
}

// ============================================
// USER REPUTATION ANALYSIS
// ============================================

/**
 * Review data para análisis de reputación
 */
export interface ReviewForAnalysis {
  /** Rating promedio (1-5) */
  rating: number;
  /** Comentario público del reviewer */
  comment: string;
  /** Fecha de la review */
  date: string;
  /** Nombre del reviewer */
  reviewerName: string;
}

/**
 * Resumen de reviews del usuario
 */
export interface ReviewSummaryForAnalysis {
  /** Total de reviews */
  totalCount: number;
  /** Rating promedio general */
  averageRating: number;
  /** Ratings por categoría */
  categoryAverages?: {
    cleanliness?: number;
    communication?: number;
    accuracy?: number;
    location?: number;
    checkin?: number;
    value?: number;
  };
}

/**
 * Perfil del usuario para contexto de análisis
 */
export interface UserProfileForAnalysis {
  /** Cantidad de viajes completados */
  completedTrips: number;
  /** Fecha de registro */
  memberSince: string;
  /** Tier del usuario */
  tier: 'elite' | 'trusted' | 'standard';
}

/**
 * Parámetros para análisis de reputación con IA
 */
export interface ReputationAnalysisParams {
  /** Reviews del usuario */
  reviews: ReviewForAnalysis[];
  /** Resumen de reviews */
  summary: ReviewSummaryForAnalysis;
  /** Perfil del usuario */
  userProfile: UserProfileForAnalysis;
}

/**
 * Resultado del análisis de reputación
 */
export interface ReputationAnalysis {
  /** Resumen en 1-2 frases */
  summary: string;
  /** Puntos destacados positivos (max 3) */
  highlights: string[];
  /** Áreas de mejora (opcional) */
  improvementAreas?: string[];
  /** Nivel de confianza del análisis */
  confidence: 'high' | 'medium' | 'low';
}

// ============================================
// CAR RECOMMENDATION
// ============================================

/**
 * Historial de alquiler para recomendación
 */
export interface RentalHistoryForRecommendation {
  /** Marca del auto */
  carBrand: string;
  /** Modelo del auto */
  carModel: string;
  /** Año del auto */
  carYear: number;
  /** Tipo de auto (sedan, suv, pickup, etc) */
  carType: string;
  /** Días de alquiler */
  rentalDays: number;
  /** Rating dado al auto */
  rating: number;
  /** Precio por día en ARS */
  pricePerDay: number;
}

/**
 * Preferencias del usuario para recomendación
 */
export interface UserPreferencesForRecommendation {
  /** Presupuesto preferido */
  budget?: 'economico' | 'moderado' | 'premium';
  /** Tipo de auto preferido */
  preferredType?: string;
  /** Transmisión preferida */
  preferredTransmission?: 'manual' | 'automatico';
}

/**
 * Parámetros para recomendación de auto con IA
 */
export interface CarRecommendationParams {
  /** Historial de alquileres */
  rentalHistory: RentalHistoryForRecommendation[];
  /** Preferencias del usuario (opcional) */
  userPreferences?: UserPreferencesForRecommendation;
}

/**
 * Filtros de búsqueda sugeridos
 */
export interface RecommendedSearchFilters {
  /** Marca sugerida */
  brand?: string;
  /** Tipo de auto sugerido */
  carType?: string;
  /** Transmisión sugerida */
  transmission?: string;
  /** Año mínimo sugerido */
  minYear?: number;
  /** Precio máximo por día */
  maxPricePerDay?: number;
}

/**
 * Resultado de recomendación de auto
 */
export interface CarRecommendation {
  /** Tipo de auto recomendado */
  recommendedType: string;
  /** Razón de la recomendación */
  reasoning: string;
  /** Filtros de búsqueda sugeridos */
  searchFilters: RecommendedSearchFilters;
  /** Sugerencias alternativas */
  alternativeSuggestions?: string[];
}
