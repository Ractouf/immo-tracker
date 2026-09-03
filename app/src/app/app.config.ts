import localeFrBe from '@angular/common/locales/fr-BE';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localeFrBe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'fr-BE' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
  ]
};
