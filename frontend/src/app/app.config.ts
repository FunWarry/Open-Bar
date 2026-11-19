import { ApplicationConfig, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideTransloco } from '@jsverse/transloco';
import { provideIonicAngular } from '@ionic/angular';

import { routes } from './app.routes';
import { authReducer } from './core/store/auth.reducer';
import { AuthEffects } from './core/store/auth.effects';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { offlineSyncInterceptor } from './core/interceptors/offline-sync.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { TranslocoHttpLoader } from './core/transloco-loader';

/**
 * Builds the root Angular {@link ApplicationConfig} for OpenBar.
 * Registers routing, HTTP interceptors, NgRx authentication store, Ionic UI,
 * Transloco i18n, and Angular Service Worker for PWA installability and app-shell caching.
 *
 * @param devMode Whether the application runs in development mode (disables service worker registration)
 * @returns Configured Angular ApplicationConfig instance
 */
export function createAppConfig(devMode: boolean = isDevMode()): ApplicationConfig {
  return {
    providers: [
      provideZoneChangeDetection(),
      provideIonicAngular(),
      provideHttpClient(withXhr(), withInterceptors([authInterceptor, offlineSyncInterceptor, errorInterceptor])),
      provideStore({ auth: authReducer }),
      provideEffects([AuthEffects]),
      ...(devMode ? [provideStoreDevtools({ maxAge: 25, logOnly: false })] : []),
      provideRouter(routes),
      provideTransloco({
        config: {
          availableLangs: ['fr', 'en'],
          defaultLang: 'fr',
          reRenderOnLangChange: true,
          prodMode: !devMode,
          missingHandler: { logMissingKey: devMode },
          fallbackLang: 'fr',
        },
        loader: TranslocoHttpLoader,
      }),
      provideServiceWorker('ngsw-worker.js', {
        enabled: !devMode,
        registrationStrategy: 'registerWhenStable:5000',
      }),
    ],
  };
}

/**
 * Default root application configuration used to bootstrap OpenBar.
 */
export const appConfig: ApplicationConfig = createAppConfig();
