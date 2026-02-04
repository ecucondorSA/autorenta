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
  /** Marca del vehiculo */
  carBrand: string;
  /** Modelo del vehiculo */
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
 * Informacion basica del vehiculo para contexto
 */
export interface VehicleInfo {
  /** Marca del vehiculo */
  brand: string;
  /** Modelo del vehiculo */
  model: string;
  /** Ano del vehiculo */
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
 * Parametros para consulta legal
 */
export interface LegalQuestionParams {
  /** Pregunta del usuario */
  question: string;
  /** Terminos del alquiler */
  bookingTerms: BookingTerms;
  /** Informacion del vehiculo */
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
 * Un dia del itinerario
 */
export interface TripDay {
  /** Numero del dia (1, 2, 3...) */
  dayNumber: number;
  /** Titulo del dia (ej: "Buenos Aires - Mar del Plata") */
  title: string;
  /** Actividades del dia */
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
  /** Cantidad de dias del viaje */
  days: number;
  /** Ciudad/ubicacion de inicio */
  startLocation: string;
  /** Ciudad/ubicacion de fin (opcional, puede ser igual al inicio) */
  endLocation?: string;
  /** Tipo de vehiculo (para sugerir rutas apropiadas) */
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
  /** ID unico del item */
  id: string;
  /** Etiqueta/descripcion del item */
  label: string;
  /** Descripcion detallada (opcional) */
  description?: string;
  /** Si es un item critico (debe verificarse si o si) */
  critical: boolean;
  /** Si es especifico para este modelo de auto */
  modelSpecific?: boolean;
}

/**
 * Categoria del checklist
 */
export interface ChecklistCategory {
  /** Nombre de la categoria */
  name: string;
  /** Icono (nombre del icono de Lucide) */
  icon: string;
  /** Items de esta categoria */
  items: ChecklistItem[];
}

/**
 * Checklist completo de inspeccion
 */
export interface VehicleChecklist {
  /** Nombre completo del vehiculo */
  vehicleName: string;
  /** Tipo de inspeccion */
  inspectionType: 'check_in' | 'check_out';
  /** Categorias con sus items */
  categories: ChecklistCategory[];
  /** Tips especificos del modelo */
  tips: string[];
}

/**
 * Parametros para generar checklist
 */
export interface VehicleChecklistParams {
  /** Marca del vehiculo */
  brand: string;
  /** Modelo del vehiculo */
  model: string;
  /** Ano del vehiculo */
  year: number;
  /** Tipo de inspeccion: check_in (recibir) o check_out (devolver) */
  inspectionType: 'check_in' | 'check_out';
}

// ============================================
// GEMINI SERVICE RESPONSE TYPES
// ============================================

/**
 * Respuesta generica del worker de Gemini
 */
export interface GeminiWorkerResponse<T> {
  /** Si la operacion fue exitosa */
  success: boolean;
  /** Datos de la respuesta */
  data?: T;
  /** Mensaje de error si fallo */
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
