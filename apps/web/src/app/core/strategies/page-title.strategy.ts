import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const DEFAULT_TITLE = 'AutoRentar - Alquiler de Autos entre Personas';
const SUFFIX = ' | AutoRentar';

/**
 * Custom TitleStrategy that appends " | AutoRentar" to route titles.
 * Reads `title` from route data and applies suffix automatically.
 * Falls back to DEFAULT_TITLE when no route title is defined.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly titleService = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    this.titleService.setTitle(title ? `${title}${SUFFIX}` : DEFAULT_TITLE);
  }
}
