import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { SeoLandingService, SeoPageData } from '@core/services/seo/seo-landing.service';
import { catchError, of } from 'rxjs';

export const seoPageResolver: ResolveFn<SeoPageData | null> = (route) => {
  const service = inject(SeoLandingService);
  
  const segment1 = route.paramMap.get('segment1');
  const segment2 = route.paramMap.get('segment2');

  if (!segment1) {
    return of(null);
  }

  return service.getPageData(segment1, segment2 || undefined).pipe(
    catchError((err) => {
      console.error('SeoPageResolver failed:', err);
      // Optional: Redirect to marketplace on failure instead of showing broken page
      // router.navigate(['/cars']);
      return of(null);
    })
  );
};
