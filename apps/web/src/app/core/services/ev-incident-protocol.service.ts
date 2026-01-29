import { Injectable, signal, computed } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  EVIncidentProtocol,
  EVProtocolSection,
  EVProtocolPhoto,
  EVDealershipContact,
  RiskAssessment,
  GeoLocation,
  DeviceInfo,
} from '@core/models/ev-incident-protocol.model';
import {
  calculateOverallRisk,
  isBatterySafe,
  getRecommendedAction,
} from '@core/models/ev-incident-protocol.model';
import { injectSupabase } from './infrastructure/supabase-client.service';

/**
 * Service for managing EV Incident Protocol
 *
 * Handles the step-by-step documentation of EV-specific incidents including:
 * - Battery damage assessment
 * - Thermal event evaluation
 * - BMS error logging
 * - Risk calculation
 * - Dealership contact lookup
 */
@Injectable({
  providedIn: 'root',
})
export class EVIncidentProtocolService {
  private readonly supabase: SupabaseClient = injectSupabase();

  // Reactive state
  readonly currentProtocol = signal<EVIncidentProtocol | null>(null);
  readonly sections = signal<EVProtocolSection[]>([]);
  readonly currentSectionIndex = signal<number>(0);
  readonly riskAssessment = signal<RiskAssessment | null>(null);
  readonly nearbyDealerships = signal<EVDealershipContact[]>([]);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // Computed
  readonly currentSection = computed(() => {
    const sections = this.sections();
    const index = this.currentSectionIndex();
    return sections[index] ?? null;
  });

  readonly progress = computed(() => {
    const sections = this.sections();
    if (sections.length === 0) return 0;
    const completed = sections.filter((s) => s.status === 'completed').length;
    return Math.round((completed / sections.length) * 100);
  });

  readonly isComplete = computed(() => {
    const sections = this.sections();
    return sections.length > 0 && sections.every((s) => s.status === 'completed');
  });

  readonly hasHighRisk = computed(() => {
    const sections = this.sections();
    return sections.some((s) => s.risk_level === 'red');
  });

  /**
   * Create a new EV incident protocol
   */
  async createProtocol(
    bookingId: string,
    claimId?: string,
    location?: GeoLocation,
  ): Promise<EVIncidentProtocol> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const deviceInfo: DeviceInfo = {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
      };

      const { data, error } = await this.supabase.rpc('create_ev_incident_protocol', {
        p_booking_id: bookingId,
        p_claim_id: claimId ?? null,
        p_location: location ? JSON.stringify(location) : null,
        p_device_info: JSON.stringify(deviceInfo),
      });

      if (error) {
        throw new Error(error.message);
      }

      const protocolId = data as string;

      // Fetch the created protocol
      return await this.loadProtocol(protocolId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear protocolo EV';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Load an existing protocol
   */
  async loadProtocol(protocolId: string): Promise<EVIncidentProtocol> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase
        .from('ev_incident_protocols')
        .select('*')
        .eq('id', protocolId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const protocol = data as EVIncidentProtocol;
      this.currentProtocol.set(protocol);
      this.sections.set(protocol.sections);
      this.currentSectionIndex.set(protocol.current_section_index);
      if (protocol.risk_assessment) {
        this.riskAssessment.set(protocol.risk_assessment);
      }

      return protocol;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar protocolo';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update a checklist item answer
   */
  async updateChecklistAnswer(
    sectionId: string,
    itemId: string,
    answer: boolean | number | string,
  ): Promise<EVProtocolSection> {
    this.saving.set(true);
    this.error.set(null);

    try {
      const protocol = this.currentProtocol();
      if (!protocol) {
        throw new Error('No hay protocolo activo');
      }

      const { data, error } = await this.supabase.rpc('update_ev_protocol_checklist', {
        p_protocol_id: protocol.id,
        p_section_id: sectionId,
        p_item_id: itemId,
        p_answer: JSON.stringify(answer),
      });

      if (error) {
        throw new Error(error.message);
      }

      const updatedSection = data as EVProtocolSection;

      // Update local state
      const sections = this.sections();
      const sectionIndex = sections.findIndex((s) => s.id === sectionId);
      if (sectionIndex >= 0) {
        const newSections = [...sections];
        newSections[sectionIndex] = updatedSection;
        this.sections.set(newSections);
      }

      return updatedSection;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar respuesta';
      this.error.set(message);
      throw err;
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Upload a photo for a section
   */
  async uploadSectionPhoto(sectionId: string, file: File, caption?: string): Promise<string> {
    this.saving.set(true);
    this.error.set(null);

    try {
      const protocol = this.currentProtocol();
      if (!protocol) {
        throw new Error('No hay protocolo activo');
      }

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('La imagen no puede superar 10MB');
      }

      // Upload to storage
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `${protocol.id}/${sectionId}/${timestamp}.${extension}`;

      const { error: uploadError } = await this.supabase.storage
        .from('ev-protocol-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('ev-protocol-photos')
        .getPublicUrl(fileName);

      const photoUrl = urlData.publicUrl;

      // Save photo record
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      const { error: insertError } = await this.supabase.from('ev_protocol_photos').insert({
        protocol_id: protocol.id,
        section_id: sectionId,
        photo_url: photoUrl,
        caption,
        uploaded_by: user?.id,
      });

      if (insertError) {
        console.error('Error saving photo record:', insertError);
      }

      // Update local section state
      const sections = this.sections();
      const sectionIndex = sections.findIndex((s) => s.id === sectionId);
      if (sectionIndex >= 0) {
        const newSections = [...sections];
        const section = { ...newSections[sectionIndex] };
        section.photos_uploaded = [...(section.photos_uploaded || []), photoUrl];
        newSections[sectionIndex] = section;
        this.sections.set(newSections);
      }

      return photoUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir foto';
      this.error.set(message);
      throw err;
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Complete a section
   */
  async completeSection(sectionId: string): Promise<EVProtocolSection> {
    this.saving.set(true);
    this.error.set(null);

    try {
      const protocol = this.currentProtocol();
      if (!protocol) {
        throw new Error('No hay protocolo activo');
      }

      const { data, error } = await this.supabase.rpc('complete_ev_protocol_section', {
        p_protocol_id: protocol.id,
        p_section_id: sectionId,
      });

      if (error) {
        throw new Error(error.message);
      }

      const updatedSection = data as EVProtocolSection;

      // Update local state
      const sections = this.sections();
      const sectionIndex = sections.findIndex((s) => s.id === sectionId);
      if (sectionIndex >= 0) {
        const newSections = [...sections];
        newSections[sectionIndex] = updatedSection;
        this.sections.set(newSections);

        // Move to next section if available
        if (sectionIndex < sections.length - 1) {
          this.currentSectionIndex.set(sectionIndex + 1);
        }
      }

      return updatedSection;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al completar sección';
      this.error.set(message);
      throw err;
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Calculate and get risk assessment
   */
  async calculateRisk(): Promise<RiskAssessment> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const protocol = this.currentProtocol();
      if (!protocol) {
        throw new Error('No hay protocolo activo');
      }

      const { data, error } = await this.supabase.rpc('calculate_ev_protocol_risk', {
        p_protocol_id: protocol.id,
      });

      if (error) {
        throw new Error(error.message);
      }

      const assessment = data as RiskAssessment;
      this.riskAssessment.set(assessment);

      return assessment;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al calcular riesgo';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Calculate local risk assessment (without server call)
   */
  calculateLocalRisk(): RiskAssessment {
    const sections = this.sections();
    const overallRisk = calculateOverallRisk(sections);
    const batterySafe = isBatterySafe(overallRisk);
    const recommendedAction = getRecommendedAction(overallRisk);

    const assessment: RiskAssessment = {
      overall_risk: overallRisk,
      battery_safe: batterySafe,
      recommended_action: recommendedAction,
      red_sections: sections.filter((s) => s.risk_level === 'red').length,
      yellow_sections: sections.filter((s) => s.risk_level === 'yellow').length,
      green_sections: sections.filter((s) => s.risk_level === 'green').length,
      calculated_at: new Date().toISOString(),
    };

    this.riskAssessment.set(assessment);
    return assessment;
  }

  /**
   * Complete the entire protocol
   */
  async completeProtocol(): Promise<RiskAssessment> {
    this.saving.set(true);
    this.error.set(null);

    try {
      const protocol = this.currentProtocol();
      if (!protocol) {
        throw new Error('No hay protocolo activo');
      }

      const { data, error } = await this.supabase.rpc('complete_ev_incident_protocol', {
        p_protocol_id: protocol.id,
      });

      if (error) {
        throw new Error(error.message);
      }

      const assessment = data as RiskAssessment;
      this.riskAssessment.set(assessment);

      // Update protocol completed state
      this.currentProtocol.update((p) =>
        p ? { ...p, completed_at: new Date().toISOString() } : null,
      );

      return assessment;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al completar protocolo';
      this.error.set(message);
      throw err;
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Get nearby EV dealerships
   */
  async getNearbyDealerships(
    carBrand: string,
    location: GeoLocation,
    radiusKm = 50,
  ): Promise<EVDealershipContact[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.rpc('get_nearby_ev_dealerships', {
        p_brand: carBrand,
        p_lat: location.lat,
        p_lng: location.lng,
        p_radius_km: radiusKm,
        p_limit: 5,
      });

      if (error) {
        throw new Error(error.message);
      }

      const dealerships = (data || []) as EVDealershipContact[];
      this.nearbyDealerships.set(dealerships);

      return dealerships;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al buscar concesionarios';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get protocol photos for a section
   */
  async getSectionPhotos(sectionId: string): Promise<EVProtocolPhoto[]> {
    try {
      const protocol = this.currentProtocol();
      if (!protocol) return [];

      const { data, error } = await this.supabase
        .from('ev_protocol_photos')
        .select('*')
        .eq('protocol_id', protocol.id)
        .eq('section_id', sectionId)
        .order('uploaded_at', { ascending: true });

      if (error) {
        console.error('Error fetching section photos:', error);
        return [];
      }

      return (data || []) as EVProtocolPhoto[];
    } catch (err) {
      console.error('Error fetching section photos:', err);
      return [];
    }
  }

  /**
   * Navigate to a specific section
   */
  goToSection(index: number): void {
    const sections = this.sections();
    if (index >= 0 && index < sections.length) {
      this.currentSectionIndex.set(index);
    }
  }

  /**
   * Go to next section
   */
  nextSection(): void {
    const current = this.currentSectionIndex();
    const sections = this.sections();
    if (current < sections.length - 1) {
      this.currentSectionIndex.set(current + 1);
    }
  }

  /**
   * Go to previous section
   */
  previousSection(): void {
    const current = this.currentSectionIndex();
    if (current > 0) {
      this.currentSectionIndex.set(current - 1);
    }
  }

  /**
   * Clear current protocol state
   */
  clearProtocol(): void {
    this.currentProtocol.set(null);
    this.sections.set([]);
    this.currentSectionIndex.set(0);
    this.riskAssessment.set(null);
    this.nearbyDealerships.set([]);
    this.error.set(null);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
