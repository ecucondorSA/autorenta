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
  private readonly BRANDS: CarBrandOption[] = [
    { code: 'toyota', name: 'Toyota', logoPath: '/assets/images/car-brands/toyota.svg' },
    {
      code: 'volkswagen',
      name: 'Volkswagen',
      logoPath: '/assets/images/car-brands/volkswagen.svg',
    },
    { code: 'ford', name: 'Ford', logoPath: '/assets/images/car-brands/ford.svg' },
    { code: 'chevrolet', name: 'Chevrolet', logoPath: '/assets/images/car-brands/chevrolet.svg' },
    { code: 'honda', name: 'Honda', logoPath: '/assets/images/car-brands/honda.svg' },
    { code: 'nissan', name: 'Nissan', logoPath: '/assets/images/car-brands/nissan.svg' },
    { code: 'hyundai', name: 'Hyundai', logoPath: '/assets/images/car-brands/hyundai.svg' },
    { code: 'kia', name: 'Kia', logoPath: '/assets/images/car-brands/kia.svg' },
    { code: 'renault', name: 'Renault', logoPath: '/assets/images/car-brands/renault.svg' },
    { code: 'peugeot', name: 'Peugeot', logoPath: '/assets/images/car-brands/peugeot.svg' },
    { code: 'fiat', name: 'Fiat', logoPath: '/assets/images/car-brands/fiat.svg' },
    { code: 'mercedes', name: 'Mercedes-Benz', logoPath: '/assets/images/car-brands/mercedes.svg' },
    { code: 'bmw', name: 'BMW', logoPath: '/assets/images/car-brands/bmw.svg' },
    { code: 'audi', name: 'Audi', logoPath: '/assets/images/car-brands/audi.svg' },
    { code: 'mazda', name: 'Mazda', logoPath: '/assets/images/car-brands/mazda.svg' },
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
