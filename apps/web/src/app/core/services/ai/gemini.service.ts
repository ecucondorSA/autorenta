import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environment';
import type {
  ChatSuggestion,
  ChatSuggestionsParams,
  GeminiWorkerResponse,
  LegalAnswer,
  LegalQuestionParams,
  TripItinerary,
  TripPlannerParams,
  VehicleChecklist,
  VehicleChecklistParams,
  ReputationAnalysisParams,
  ReputationAnalysis,
  CarRecommendationParams,
  CarRecommendation,
} from '@core/models';

/**
 * Servicio para interactuar con las APIs de IA de Gemini
 *
 * Las llamadas van a un Cloudflare Worker que maneja la API key de forma segura.
 * El frontend NUNCA expone API keys.
 *
 * Features:
 * 1. Chat Suggestions - Sugerencias de respuesta
 * 2. Legal Assistant - Consultas legales sobre términos
 * 3. Trip Planner - Planificador de viajes
 * 4. Vehicle Checklist - Checklist de inspección
 * 5. Reputation Analysis - Análisis de reputación del usuario
 * 6. Car Recommendation - Recomendación de autos basada en historial
 *
 * @example
 * ```typescript
 * const gemini = inject(GeminiService);
 *
 * // Chat suggestions
 * const suggestions = await gemini.generateChatSuggestions({
 *   conversationHistory: [...],
 *   userRole: 'renter',
 *   bookingContext: {...}
 * });
 *
 * // Legal question
 * const answer = await gemini.askLegalQuestion({
 *   question: '¿Puedo viajar a Córdoba?',
 *   bookingTerms: {...},
 *   vehicleInfo: {...}
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly http = inject(HttpClient);

  /**
   * URL del worker de Gemini Text Assistant
   * Se configura via env var: NG_APP_GEMINI_TEXT_WORKER_URL
   */
  private readonly WORKER_URL = environment.geminiTextWorkerUrl;

  // ============================================
  // GLOBAL STATE
  // ============================================

  /** Si hay una operación en progreso */
  readonly isProcessing = signal(false);

  /** Último error ocurrido */
  readonly lastError = signal<string | null>(null);

  // ============================================
  // FEATURE 1: CHAT SUGGESTIONS
  // ============================================

  /**
   * Genera 3 sugerencias de respuesta para el chat basadas en el contexto
   *
   * @param params - Historial de conversacion, rol del usuario y contexto del booking
   * @returns Array de 3 sugerencias con texto, tono e intencion
   *
   * @example
   * ```typescript
   * const suggestions = await gemini.generateChatSuggestions({
   *   conversationHistory: [
   *     { role: 'recipient', text: 'Hola! A que hora pasas a buscar el auto?' },
   *     { role: 'user', text: 'Estaria llegando tipo 14hs' }
   *   ],
   *   userRole: 'renter',
   *   bookingContext: { bookingId: '123', status: 'confirmed', ... }
   * });
   * // Returns: [{ id: '1', text: 'Perfecto, nos vemos!', tone: 'friendly', intent: 'confirmation' }]
   * ```
   */
  async generateChatSuggestions(params: ChatSuggestionsParams): Promise<ChatSuggestion[]> {
    return this.callWorker<ChatSuggestion[]>('chat-suggestions', params);
  }

  // ============================================
  // FEATURE 2: LEGAL ASSISTANT
  // ============================================

  /**
   * Responde preguntas sobre los términos del alquiler
   *
   * @param params - Pregunta, términos del booking e info del vehículo
   * @returns Respuesta con fuentes y disclaimer
   *
   * @example
   * ```typescript
   * const answer = await gemini.askLegalQuestion({
   *   question: '¿Cuál es la franquicia del seguro?',
   *   bookingTerms: { insuranceDeductibleUsd: 500, mileageLimit: null },
   *   vehicleInfo: { brand: 'Toyota', model: 'Corolla', year: 2023 }
   * });
   * // Returns: { answer: 'La franquicia es de USD 500...', sources: ['Seguro'], disclaimer: '...' }
   * ```
   */
  async askLegalQuestion(params: LegalQuestionParams): Promise<LegalAnswer> {
    return this.callWorker<LegalAnswer>('legal-assistant', params);
  }

  // ============================================
  // FEATURE 3: TRIP PLANNER
  // ============================================

  /**
   * Genera un itinerario de viaje personalizado
   *
   * @param params - Días, ubicación de inicio/fin, tipo de vehículo y preferencias
   * @returns Itinerario completo con actividades por día, km estimados y tips
   *
   * @example
   * ```typescript
   * const itinerary = await gemini.generateTripItinerary({
   *   days: 3,
   *   startLocation: 'Buenos Aires',
   *   vehicleType: 'SUV',
   *   preferences: { interests: ['playas', 'gastronomia'], withKids: true }
   * });
   * // Returns: { totalDays: 3, totalKm: 850, days: [...], tips: [...] }
   * ```
   */
  async generateTripItinerary(params: TripPlannerParams): Promise<TripItinerary> {
    return this.callWorker<TripItinerary>('trip-planner', params);
  }

  // ============================================
  // FEATURE 4: VEHICLE CHECKLIST
  // ============================================

  /**
   * Genera un checklist de inspección específico para el modelo del vehículo
   *
   * @param params - Marca, modelo, año y tipo de inspección
   * @returns Checklist categorizado con items críticos marcados
   *
   * @example
   * ```typescript
   * const checklist = await gemini.generateVehicleChecklist({
   *   brand: 'Toyota',
   *   model: 'Corolla',
   *   year: 2023,
   *   inspectionType: 'check_in'
   * });
   * // Returns: { vehicleName: 'Toyota Corolla 2023', categories: [...], tips: [...] }
   * ```
   */
  async generateVehicleChecklist(params: VehicleChecklistParams): Promise<VehicleChecklist> {
    return this.callWorker<VehicleChecklist>('vehicle-checklist', params);
  }

  // ============================================
  // FEATURE 5: REPUTATION ANALYSIS
  // ============================================

  /**
   * Analiza las reviews del usuario y genera un resumen de reputacion
   *
   * @param params - Reviews, resumen y perfil del usuario
   * @returns Analisis con resumen, highlights y areas de mejora
   *
   * @example
   * ```typescript
   * const analysis = await gemini.analyzeUserReputation({
   *   reviews: [{ rating: 5, comment: 'Excelente!', date: '...', reviewerName: 'Juan' }],
   *   summary: { totalCount: 10, averageRating: 4.8 },
   *   userProfile: { completedTrips: 10, memberSince: '...', tier: 'trusted' }
   * });
   * // Returns: { summary: '...', highlights: [...], confidence: 'high' }
   * ```
   */
  async analyzeUserReputation(params: ReputationAnalysisParams): Promise<ReputationAnalysis> {
    return this.callWorker<ReputationAnalysis>('reputation-analysis', params);
  }

  // ============================================
  // FEATURE 6: CAR RECOMMENDATION
  // ============================================

  /**
   * Recomienda un auto basado en el historial de alquileres del usuario
   *
   * @param params - Historial de alquileres y preferencias opcionales
   * @returns Recomendación con tipo de auto, razón y filtros de búsqueda
   *
   * @example
   * ```typescript
   * const recommendation = await gemini.getCarRecommendation({
   *   rentalHistory: [
   *     { carBrand: 'Toyota', carModel: 'Corolla', carYear: 2023, carType: 'sedan', ... }
   *   ],
   *   userPreferences: { budget: 'moderado' }
   * });
   * // Returns: { recommendedType: 'SUV compacto', reasoning: '...', searchFilters: {...} }
   * ```
   */
  async getCarRecommendation(params: CarRecommendationParams): Promise<CarRecommendation> {
    return this.callWorker<CarRecommendation>('car-recommendation', params);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Llama al worker de Gemini con el endpoint y parámetros especificados
   *
   * @param endpoint - Nombre del endpoint (chat-suggestions, legal-assistant, etc)
   * @param params - Parámetros para el endpoint
   * @returns Respuesta tipada del worker
   * @throws Error si el worker falla o no está configurado
   */
  private async callWorker<T>(endpoint: string, params: unknown): Promise<T> {
    if (!this.WORKER_URL) {
      throw new Error(
        'Falta configurar NG_APP_GEMINI_TEXT_WORKER_URL. ' +
          'Contacta al administrador del sistema.',
      );
    }

    this.isProcessing.set(true);
    this.lastError.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<GeminiWorkerResponse<T>>(`${this.WORKER_URL}/${endpoint}`, params),
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Error procesando solicitud de IA');
      }

      return response.data;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error desconocido al comunicarse con el servicio de IA';

      this.lastError.set(message);
      throw new Error(message);
    } finally {
      this.isProcessing.set(false);
    }
  }
}
