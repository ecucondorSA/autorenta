import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExternalNavigationService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  redirect(url: string): void {
    if (!this.isBrowser) return;
    window.location.href = url;
  }
}
