import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { from, Observable, map } from 'rxjs';

export interface SeoPageData {
  type: 'brand' | 'city' | 'brand_city';
  h1: string;
  meta_title: string;
  meta_description: string;
  stats: {
    count: number;
    min_price: number;
  };
  cars: Array<{
    id: string;
    brand: string;
    model: string;
    year: number;
    price_per_day: number;
    currency: string;
    image_url: string;
    location_city: string;
  }>;
  breadcrumbs: Array<{
    label: string;
    url: string | null;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class SeoLandingService {
  private readonly supabase = injectSupabase();

  /**
   * Fetches SEO landing page data from the Edge Function / RPC
   * @param segment1 - First URL segment (e.g. 'toyota' or 'palermo')
   * @param segment2 - Second URL segment (optional, e.g. 'palermo' if segment1 was 'toyota')
   */
  getPageData(segment1: string, segment2?: string): Observable<SeoPageData | null> {
    return from(
      this.supabase.rpc('get_seo_page_data', {
        p_segment1: segment1,
        p_segment2: segment2 || null,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('[SeoLandingService] RPC Error:', error);
          throw error;
        }
        return (data as unknown as SeoPageData) || null;
      })
    );
  }
}
