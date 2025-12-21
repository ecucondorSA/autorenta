import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface StockPhoto {
  id: string;
  url: string;
  downloadUrl: string;
  photographer: string;
  photographerUrl: string;
  width: number;
  height: number;
}

interface UnsplashResponse {
  results: Array<{
    id: string;
    urls: {
      regular: string;
      full: string;
      raw: string;
    };
    user: {
      name: string;
      links: {
        html: string;
      };
    };
    width: number;
    height: number;
  }>;
  total: number;
}

/**
 * Servicio para obtener fotos de stock de autos
 * Usa Unsplash API (gratis hasta 50 requests/hora)
 */
@Injectable({
  providedIn: 'root',
})
export class StockPhotosService {
  private readonly http = inject(HttpClient);

  // Unsplash API - Demo access key (reemplazar con tu propia key en producción)
  // Obtener gratis en: https://unsplash.com/developers
  private readonly UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY_HERE';
  private readonly UNSPLASH_API = 'https://api.unsplash.com';

  /**
   * Busca fotos de un auto específico
   */
  async searchCarPhotos(params: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
  }): Promise<StockPhoto[]> {
    // Construir query optimizado para fotos de autos
    const queryParts = [params.brand, params.model];

    if (params.year) {
      queryParts.push(params.year.toString());
    }

    if (params.color) {
      queryParts.push(params.color);
    }

    queryParts.push('car', 'automobile');

    const query = queryParts.join(' ');

    try {
      const response = await firstValueFrom(
        this.http.get<UnsplashResponse>(`${this.UNSPLASH_API}/search/photos`, {
          params: {
            query,
            per_page: '9',
            orientation: 'landscape',
            client_id: this.UNSPLASH_ACCESS_KEY,
          },
        }),
      );

      return response.results.map((photo) => ({
        id: photo.id,
        url: photo.urls.regular,
        downloadUrl: photo.urls.full,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        width: photo.width,
        height: photo.height,
      }));
    } catch {
      // Fallback: buscar fotos genéricas de autos
      return this.getFallbackPhotos(params.brand);
    }
  }

  /**
   * Descarga una foto como File
   */
  async downloadPhoto(stockPhoto: StockPhoto): Promise<File> {
    try {
      const response = await firstValueFrom(
        this.http.get(stockPhoto.downloadUrl, {
          responseType: 'blob',
        }),
      );

      // Crear File desde Blob
      return new File([response], `${stockPhoto.id}.jpg`, {
        type: 'image/jpeg',
      });
    } catch {
      throw new Error('No se pudo descargar la foto');
    }
  }

  /**
   * Fotos de fallback si falla la API
   */
  private async getFallbackPhotos(brand: string): Promise<StockPhoto[]> {
    // Búsqueda genérica por marca
    const fallbackQuery = `${brand} car`;

    try {
      const response = await firstValueFrom(
        this.http.get<UnsplashResponse>(`${this.UNSPLASH_API}/search/photos`, {
          params: {
            query: fallbackQuery,
            per_page: '6',
            client_id: this.UNSPLASH_ACCESS_KEY,
          },
        }),
      );

      return response.results.map((photo) => ({
        id: photo.id,
        url: photo.urls.regular,
        downloadUrl: photo.urls.full,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        width: photo.width,
        height: photo.height,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Trigger de descarga (Unsplash requiere tracking de descargas)
   */
  async trackDownload(photoId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.get(`${this.UNSPLASH_API}/photos/${photoId}/download`, {
          params: {
            client_id: this.UNSPLASH_ACCESS_KEY,
          },
        }),
      );
    } catch {
      // No crítico si falla el tracking
    }
  }
}
