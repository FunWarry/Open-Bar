import {bootstrapApplication} from '@angular/platform-browser';
import {provideHttpClient, withInterceptors, withXhr} from '@angular/common/http';
import {provideStore} from '@ngrx/store';
import {provideEffects} from '@ngrx/effects';
import {provideStoreDevtools} from '@ngrx/store-devtools';
import {provideRouter} from '@angular/router';
import {isDevMode, provideZoneChangeDetection} from '@angular/core';
import {provideTransloco} from '@jsverse/transloco';
import {registerLocaleData} from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {provideIonicAngular} from '@ionic/angular';

registerLocaleData(localeFr, 'fr');

import {AppComponent} from './app/app.component';
import {routes} from './app/app.routes';
import {authReducer} from './app/core/store/auth.reducer';
import {AuthEffects} from './app/core/store/auth.effects';
import {authInterceptor} from './app/core/interceptors/auth.interceptor';
import {offlineSyncInterceptor} from './app/core/interceptors/offline-sync.interceptor';
import {errorInterceptor} from './app/core/interceptors/error.interceptor';
import {TranslocoHttpLoader} from './app/core/transloco-loader';

/**
 * Automatically recover from stale chunk hashes or failed dynamic module imports
 * (e.g. following dev server recompilation or deployment of new builds).
 */
if (typeof window !== 'undefined') {
  const isChunkError = (msg: string) =>
    /Failed to fetch dynamically imported module|Loading chunk \d+ failed/i.test(msg);

  const handleReload = () => {
    const lastReload = sessionStorage.getItem('openbar_last_chunk_reload');
    const now = Date.now();
    if (!lastReload || now - Number.parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('openbar_last_chunk_reload', String(now));
      window.location.reload();
    }
  };

  window.addEventListener('error', (event) => {
    if (isChunkError(event?.message || '')) {
      handleReload();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (isChunkError(reason)) {
      handleReload();
    }
  });
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideIonicAngular(),
    provideHttpClient(withXhr(), withInterceptors([authInterceptor, offlineSyncInterceptor, errorInterceptor])),
    provideStore({auth: authReducer}),
    provideEffects([AuthEffects]),
    ...(isDevMode() ? [provideStoreDevtools({ maxAge: 25, logOnly: false })] : []),
    provideRouter(routes),
    provideTransloco({
      config: {
        availableLangs: ['fr', 'en'],
        defaultLang: 'fr',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { logMissingKey: isDevMode() },
        fallbackLang: 'fr',
      },
      loader: TranslocoHttpLoader,
    }),
  ]
}).catch(err => console.error(err));

