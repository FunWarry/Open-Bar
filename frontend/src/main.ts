import {bootstrapApplication} from '@angular/platform-browser';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {provideStore} from '@ngrx/store';
import {provideEffects} from '@ngrx/effects';
import {provideStoreDevtools} from '@ngrx/store-devtools';
import {provideRouter} from '@angular/router';
import {isDevMode} from '@angular/core';
import {provideTransloco} from '@jsverse/transloco';
import {provideIonicAngular} from '@ionic/angular/standalone';

import {AppComponent} from './app/app.component';
import {routes} from './app/app.routes';
import {authReducer} from './app/core/store/auth.reducer';
import {AuthEffects} from './app/core/store/auth.effects';
import {authInterceptor} from './app/core/interceptors/auth.interceptor';
import {errorInterceptor} from './app/core/interceptors/error.interceptor';
import {TranslocoHttpLoader} from './app/core/transloco-loader';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideIonicAngular(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
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
