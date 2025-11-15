import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export type GoogleCalendarView = 'month' | 'week' | 'day' | 'agenda';
export type GoogleCalendarLanguage = 'es' | 'en' | 'pt';

export interface GoogleCalendarConfig {
  calendarId: string;
  view?: GoogleCalendarView;
  language?: GoogleCalendarLanguage;
  height?: number;
  showTitle?: boolean;
  showDateNavigation?: boolean;
  showPrint?: boolean;
  showTabs?: boolean;
  showCalendars?: boolean;
  showTimezone?: boolean;
  wkst?: number; // Week start: 1 = Monday, 0 = Sunday
}

@Component({
  selector: 'app-google-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './google-calendar.component.html',
  styleUrls: ['./google-calendar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleCalendarComponent implements OnInit, OnChanges {
  private readonly sanitizer = inject(DomSanitizer);

  @Input() calendarId: string = '';
  @Input() view: GoogleCalendarView = 'month';
  @Input() language: GoogleCalendarLanguage = 'es';
  @Input() height: number = 600;
  @Input() showTitle: boolean = true;
  @Input() showDateNavigation: boolean = true;
  @Input() showPrint: boolean = true;
  @Input() showTabs: boolean = true;
  @Input() showCalendars: boolean = true;
  @Input() showTimezone: boolean = true;
  @Input() wkst: number = 1; // Monday by default
  @Input() config: GoogleCalendarConfig | null = null;

  readonly calendarUrl = signal<SafeResourceUrl | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly iframeHeight = computed(() => `${this.height}px`);

  ngOnInit(): void {
    this.buildCalendarUrl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['calendarId'] ||
      changes['view'] ||
      changes['language'] ||
      changes['config'] ||
      changes['height'] ||
      changes['showTitle'] ||
      changes['showDateNavigation'] ||
      changes['showPrint'] ||
      changes['showTabs'] ||
      changes['showCalendars'] ||
      changes['showTimezone'] ||
      changes['wkst']
    ) {
      this.buildCalendarUrl();
    }
  }

  /**
   * Construye la URL del iframe de Google Calendar
   */
  private buildCalendarUrl(): void {
    // Si hay un config, usar esos valores, sino usar los inputs individuales
    const config = this.config || {
      calendarId: this.calendarId,
      view: this.view,
      language: this.language,
      height: this.height,
      showTitle: this.showTitle,
      showDateNavigation: this.showDateNavigation,
      showPrint: this.showPrint,
      showTabs: this.showTabs,
      showCalendars: this.showCalendars,
      showTimezone: this.showTimezone,
      wkst: this.wkst,
    };

    if (!config.calendarId) {
      this.hasError.set(true);
      this.errorMessage.set('Calendar ID is required');
      this.calendarUrl.set(null);
      return;
    }

    try {
      // Construir la URL base de Google Calendar embed
      const baseUrl = 'https://calendar.google.com/calendar/embed';
      const params = new URLSearchParams();

      // Calendar ID - usar 'cid' para calendarios secundarios públicos
      // Si el ID contiene '@group.calendar.google.com', es un calendario secundario
      const isSecondaryCalendar = config.calendarId.includes('@group.calendar.google.com');

      if (isSecondaryCalendar) {
        // Para calendarios secundarios, usar 'cid' que funciona mejor con calendarios públicos
        params.set('cid', config.calendarId);
      } else {
        // Para calendarios primarios (emails), usar 'src'
        params.set('src', config.calendarId);
      }

      // Vista del calendario
      params.set('mode', config.view || 'month');

      // Idioma
      params.set('hl', config.language || 'es');

      // Opciones de visualización
      if (config.showTitle !== undefined) {
        params.set('showTitle', config.showTitle ? '1' : '0');
      }
      if (config.showDateNavigation !== undefined) {
        params.set('showNav', config.showDateNavigation ? '1' : '0');
      }
      if (config.showPrint !== undefined) {
        params.set('showPrint', config.showPrint ? '1' : '0');
      }
      if (config.showTabs !== undefined) {
        params.set('showTabs', config.showTabs ? '1' : '0');
      }
      if (config.showCalendars !== undefined) {
        params.set('showCalendars', config.showCalendars ? '1' : '0');
      }
      if (config.showTimezone !== undefined) {
        params.set('showTz', config.showTimezone ? '1' : '0');
      }

      // Día de inicio de semana (0 = Domingo, 1 = Lunes)
      if (config.wkst !== undefined) {
        params.set('wkst', config.wkst.toString());
      }

      // ✅ CRITICAL: Add color parameter to ensure proper rendering
      params.set('color', '%23039BE5'); // Blue color

      const fullUrl = `${baseUrl}?${params.toString()}`;
      console.log('📅 Calendar URL:', fullUrl);
      console.log('📅 Calendar ID:', config.calendarId);
      console.log('📅 Is secondary calendar:', isSecondaryCalendar);

      this.calendarUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl));
      this.hasError.set(false);
      this.errorMessage.set('');
      this.isLoading.set(false);
    } catch (error) {
      console.error('Error building Google Calendar URL:', error);
      this.hasError.set(true);
      this.errorMessage.set('Error al construir la URL del calendario');
      this.calendarUrl.set(null);
    }
  }

  /**
   * Maneja el evento de carga del iframe
   */
  onIframeLoad(): void {
    this.isLoading.set(false);
  }

  /**
   * Maneja errores del iframe
   */
  onIframeError(): void {
    this.isLoading.set(false);
    this.hasError.set(true);
    this.errorMessage.set('Error al cargar el calendario de Google');
  }
}
