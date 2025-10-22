import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

registerLocaleData(localeEsAr);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [...(appConfig.providers ?? []), provideAnimations()],
}).catch((err) => console.error('Bootstrap failed', err));
