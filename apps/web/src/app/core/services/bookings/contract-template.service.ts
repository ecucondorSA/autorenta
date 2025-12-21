import { Injectable } from '@angular/core';

/**
 * Contract data interface for template merging
 * Contains all dynamic fields that will be injected into the HTML template
 */
export interface ContractData {
  // Booking identifiers
  bookingId: string;
  emissionDate: string;

  // Parties
  renterName: string;
  renterDni: string;
  ownerName: string;
  ownerDni: string;

  // Vehicle details
  carBrand: string;
  carModel: string;
  carYear: string;
  carPlate: string;

  // Insurance details
  insurancePolicyNumber: string;
  insuranceCompany: string;
  insuranceCuit: string;
  insuranceValidity: string;
  insuranceCoverage: string;

  // Rental period
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;

  // Financial
  totalArs: string;

  // Acceptance metadata (optional - filled after acceptance)
  renterAcceptedAt?: string;
  renterIp?: string;
  renterUserAgent?: string;
}

/**
 * Service for loading and merging contract templates with dynamic data
 * Handles HTML template loading and placeholder replacement
 */
@Injectable({
  providedIn: 'root',
})
export class ContractTemplateService {
  /**
   * Load contract template HTML from assets
   * @param version - Semantic version (e.g., 'v1.0.0')
   * @param locale - Language/region code (e.g., 'es-AR', 'en-US')
   * @returns Promise<string> - Raw HTML template with placeholders
   */
  async loadTemplate(version: string, locale: string): Promise<string> {
    try {
      const templatePath = `/assets/contract-templates/${version}-${locale}.html`;
      const response = await fetch(templatePath);

      if (!response.ok) {
        throw new Error(
          `Failed to load contract template: ${response.status} ${response.statusText}`
        );
      }

      return await response.text();
    } catch (error) {
      console.error('[ContractTemplateService] Error loading template:', error);
      throw new Error(`No se pudo cargar el template del contrato: ${version}-${locale}`);
    }
  }

  /**
   * Merge contract data into template placeholders
   * Replaces all {{placeholder}} occurrences with actual data
   *
   * @param template - Raw HTML template with placeholders
   * @param data - Contract data to inject
   * @returns string - HTML with all placeholders replaced
   */
  mergeData(template: string, data: ContractData): string {
    let merged = template;

    // Booking identifiers
    merged = this.replacePlaceholder(merged, 'booking_id', data.bookingId);
    merged = this.replacePlaceholder(merged, 'emission_date', data.emissionDate);

    // Parties
    merged = this.replacePlaceholder(merged, 'renter_name', data.renterName);
    merged = this.replacePlaceholder(merged, 'renter_dni', data.renterDni);
    merged = this.replacePlaceholder(merged, 'owner_name', data.ownerName);
    merged = this.replacePlaceholder(merged, 'owner_dni', data.ownerDni);

    // Vehicle details
    merged = this.replacePlaceholder(merged, 'car_brand', data.carBrand);
    merged = this.replacePlaceholder(merged, 'car_model', data.carModel);
    merged = this.replacePlaceholder(merged, 'car_year', data.carYear);
    merged = this.replacePlaceholder(merged, 'car_plate', data.carPlate);

    // Insurance details
    merged = this.replacePlaceholder(
      merged,
      'insurance_policy_number',
      data.insurancePolicyNumber
    );
    merged = this.replacePlaceholder(merged, 'insurance_company', data.insuranceCompany);
    merged = this.replacePlaceholder(merged, 'insurance_cuit', data.insuranceCuit);
    merged = this.replacePlaceholder(merged, 'insurance_validity', data.insuranceValidity);
    merged = this.replacePlaceholder(merged, 'insurance_coverage', data.insuranceCoverage);

    // Rental period
    merged = this.replacePlaceholder(merged, 'start_date', data.startDate);
    merged = this.replacePlaceholder(merged, 'start_time', data.startTime);
    merged = this.replacePlaceholder(merged, 'end_date', data.endDate);
    merged = this.replacePlaceholder(merged, 'end_time', data.endTime);

    // Financial
    merged = this.replacePlaceholder(merged, 'total_ars', data.totalArs);

    // Acceptance metadata (optional)
    merged = this.replacePlaceholder(
      merged,
      'renter_accepted_at',
      data.renterAcceptedAt || 'Pendiente de aceptación'
    );
    merged = this.replacePlaceholder(merged, 'renter_ip', data.renterIp || '-');
    merged = this.replacePlaceholder(
      merged,
      'renter_user_agent',
      data.renterUserAgent || '-'
    );

    return merged;
  }

  /**
   * Replace all occurrences of a placeholder in the template
   * @param template - HTML template
   * @param placeholder - Placeholder name (without curly braces)
   * @param value - Value to inject
   * @returns string - Template with placeholder replaced
   */
  private replacePlaceholder(template: string, placeholder: string, value: string): string {
    const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
    return template.replace(regex, this.escapeHtml(value));
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param text - Raw text
   * @returns string - Escaped text
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Validate that all required placeholders have been replaced
   * Useful for debugging missing data
   * @param mergedHtml - Merged HTML
   * @returns boolean - true if no placeholders remain
   */
  validateMerge(mergedHtml: string): boolean {
    const remainingPlaceholders = mergedHtml.match(/\{\{[^}]+\}\}/g);

    if (remainingPlaceholders && remainingPlaceholders.length > 0) {
      console.warn(
        '[ContractTemplateService] Warning: Unresolved placeholders found:',
        remainingPlaceholders
      );
      return false;
    }

    return true;
  }

  /**
   * Get list of all placeholders in a template
   * Useful for generating documentation or debugging
   * @param template - HTML template
   * @returns string[] - List of placeholder names
   */
  extractPlaceholders(template: string): string[] {
    const matches = template.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];

    return matches
      .map((match) => match.replace(/\{\{|\}\}/g, '').trim())
      .filter((value, index, self) => self.indexOf(value) === index); // unique
  }
}
