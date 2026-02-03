import { Injectable } from '@angular/core';

export interface CarBrandOption {
  code: string;
  name: string;
  logoPath: string;
}

@Injectable({
  providedIn: 'root',
})
export class CarBrandsService {
  // FIPE API numeric codes - https://parallelum.com.br/fipe/api/v2/cars/brands
  private readonly BRANDS: CarBrandOption[] = [
    { code: '56', name: 'Toyota', logoPath: '/assets/images/car-brands/toyota.svg' },
    { code: '59', name: 'VW - VolksWagen', logoPath: '/assets/images/car-brands/volkswagen.svg' },
    { code: '22', name: 'Ford', logoPath: '/assets/images/car-brands/ford.svg' },
    { code: '23', name: 'GM - Chevrolet', logoPath: '/assets/images/car-brands/chevrolet.svg' },
    { code: '25', name: 'Honda', logoPath: '/assets/images/car-brands/honda.svg' },
    { code: '43', name: 'Nissan', logoPath: '/assets/images/car-brands/nissan.svg' },
    { code: '26', name: 'Hyundai', logoPath: '/assets/images/car-brands/hyundai.svg' },
    { code: '31', name: 'Kia Motors', logoPath: '/assets/images/car-brands/kia.svg' },
    { code: '48', name: 'Renault', logoPath: '/assets/images/car-brands/renault.svg' },
    { code: '44', name: 'Peugeot', logoPath: '/assets/images/car-brands/peugeot.svg' },
    { code: '21', name: 'Fiat', logoPath: '/assets/images/car-brands/fiat.svg' },
    { code: '39', name: 'Mercedes-Benz', logoPath: '/assets/images/car-brands/mercedes.svg' },
    { code: '7', name: 'BMW', logoPath: '/assets/images/car-brands/bmw.svg' },
    { code: '6', name: 'Audi', logoPath: '/assets/images/car-brands/audi.svg' },
    { code: '38', name: 'Mazda', logoPath: '/assets/images/car-brands/mazda.svg' },
    { code: '29', name: 'Jeep', logoPath: '/assets/images/car-brands/jeep.svg' },
    { code: '13', name: 'Citroën', logoPath: '/assets/images/car-brands/citroen.svg' },
    { code: '41', name: 'Mitsubishi', logoPath: '/assets/images/car-brands/mitsubishi.svg' },
    { code: '55', name: 'Suzuki', logoPath: '/assets/images/car-brands/suzuki.svg' },
    { code: '238', name: 'BYD', logoPath: '/assets/images/car-brands/byd.svg' },
  ];

  private readonly INSURANCE_BRANDS: CarBrandOption[] = [
    { code: 'lacaja', name: 'La Caja', logoPath: '/assets/images/car-brands/lacaja.svg' },
    { code: 'sancor', name: 'Sancor', logoPath: '/assets/images/car-brands/sancor.svg' },
    {
      code: 'federacion',
      name: 'Federación Patronal',
      logoPath: '/assets/images/car-brands/federacion.svg',
    },
    { code: 'mapfre', name: 'Mapfre', logoPath: '/assets/images/car-brands/mapfre.svg' },
  ];

  /**
   * Get all car brands
   */
  getCarBrands(): CarBrandOption[] {
    return this.BRANDS;
  }

  /**
   * Get car brand by code
   */
  getCarBrandByCode(code: string): CarBrandOption | undefined {
    return this.BRANDS.find((b) => b.code.toLowerCase() === code.toLowerCase());
  }

  /**
   * Get all insurance brands
   */
  getInsuranceBrands(): CarBrandOption[] {
    return this.INSURANCE_BRANDS;
  }

  /**
   * Get insurance brand by code
   */
  getInsuranceBrandByCode(code: string): CarBrandOption | undefined {
    return this.INSURANCE_BRANDS.find((b) => b.code.toLowerCase() === code.toLowerCase());
  }

  /**
   * Get logo path for car brand (flexible matching)
   */
  getCarBrandLogoPath(brandName: string): string | null {
    if (!brandName) return null;
    const normalizedInput = this.normalizeString(brandName);
    const brand = this.BRANDS.find((b) => {
      const normalizedName = this.normalizeString(b.name);
      const normalizedCode = this.normalizeString(b.code);
      return (
        normalizedName === normalizedInput ||
        normalizedCode === normalizedInput ||
        normalizedName.includes(normalizedInput) ||
        normalizedInput.includes(normalizedName)
      );
    });
    return brand?.logoPath || null;
  }

  /**
   * Normalize string for comparison (lowercase, no accents, no special chars)
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, ''); // Remove special chars
  }
}
