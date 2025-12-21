import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';
import { Car, CarPhoto } from '@core/models';

@Injectable({
  providedIn: 'root',
})
export class MockCarService {
  private cars: Car[] = [
    {
      id: '1',
      owner_id: 'owner1',
      title: 'Renault Kangoo 2022',
      description: 'Ideal para cargas y mudanzas. Amplia y económica.',
      brand_id: 'renault',
      model_id: 'kangoo',
      brand_text_backup: 'Renault',
      model_text_backup: 'Kangoo',
      year: 2022,
      transmission: 'manual',
      fuel_type: 'diesel',
      seats: 2,
      doors: 4,
      color: 'Blanco',
      features: { ac: true, bluetooth: true },
      status: 'active',
      price_per_day: 85000,
      currency: 'ARS',
      rating_avg: 4.8,
      rating_count: 25,
      location_city: 'Buenos Aires',
      location_state: 'CABA',
      location_province: 'Buenos Aires',
      location_country: 'AR',
      photos: [
        {
          url: 'https://www.elcarrocolombiano.com/wp-content/uploads/2021/03/20210325-RENAULT-KANGOO-2022-PRECIOS-Y-CARACTERISTICAS-EN-COLOMBIA-01.jpg',
        } as Partial<CarPhoto>,
      ],
      mileage: 50000,
      cancel_policy: 'flexible',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      owner_id: 'owner2',
      title: 'Ford Ranger 2023',
      description: 'Potente y robusta, perfecta para el campo o la aventura.',
      brand_id: 'ford',
      model_id: 'ranger',
      brand_text_backup: 'Ford',
      model_text_backup: 'Ranger',
      year: 2023,
      transmission: 'automatic',
      fuel_type: 'diesel',
      seats: 5,
      doors: 4,
      color: 'Gris',
      features: { ac: true, bluetooth: true, gps: true, backup_camera: true },
      status: 'active',
      price_per_day: 120000,
      currency: 'ARS',
      rating_avg: 4.9,
      rating_count: 15,
      location_city: 'Córdoba',
      location_state: 'Córdoba',
      location_province: 'Córdoba',
      location_country: 'AR',
      photos: [
        {
          url: 'https://www.ford.com.ar/content/dam/Ford/website-assets/latam/ar/nameplate/2023/ranger/v778/billboard/foco-lanzamiento/AR_Ranger_2023_Hero_V2.jpg',
        } as Partial<CarPhoto>,
      ],
      mileage: 25000,
      cancel_policy: 'moderate',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      owner_id: 'owner3',
      title: 'Peugeot 208 2021',
      description: 'Ágil y moderno, ideal para la ciudad.',
      brand_id: 'peugeot',
      model_id: '208',
      brand_text_backup: 'Peugeot',
      model_text_backup: '208',
      year: 2021,
      transmission: 'automatic',
      fuel_type: 'gasoline',
      seats: 5,
      doors: 5,
      color: 'Azul',
      features: { ac: true, bluetooth: true, sunroof: true },
      status: 'active',
      price_per_day: 70000,
      currency: 'ARS',
      rating_avg: 4.7,
      rating_count: 40,
      location_city: 'Rosario',
      location_state: 'Santa Fe',
      location_province: 'Santa Fe',
      location_country: 'AR',
      photos: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Peugeot_208_GT_Line_2020_%2850014695802%29.jpg/1200px-Peugeot_208_GT_Line_2020_%2850014695802%29.jpg',
        } as Partial<CarPhoto>,
      ],
      mileage: 60000,
      cancel_policy: 'strict',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ] as unknown as Car[];

  constructor() {}

  getCars(): Observable<Car[]> {
    return of(this.cars);
  }

  getCar(id: string): Observable<Car | undefined> {
    return of(this.cars.find((car) => car.id === id));
  }
}
