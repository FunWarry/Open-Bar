import {bootstrapApplication} from '@angular/platform-browser';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {provideStore} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {provideRouter} from '@angular/router';
import {AuthService} from './app/core/services/auth.service';
import {importProvidersFrom, isDevMode} from '@angular/core';
import {provideTransloco} from '@ngneat/transloco';

import {AppComponent} from './app/app.component';
import {routes} from './app/app.routes';
import {authReducer} from './app/core/store/auth.reducer';
import {AuthEffects} from './app/core/store/auth.effects';
import {authInterceptor} from './app/core/interceptors/auth.interceptor';
import {TranslocoHttpLoader} from './app/core/transloco-loader';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideStore({auth: authReducer}),
    // provideEffects([AuthEffects]),
    importProvidersFrom(EffectsModule.forRoot([AuthEffects])), // a dellet quand NgRx seras en V19.2.0
    provideRouter(routes),
    AuthService,
    provideTransloco({
      config: {
        availableLangs: ['fr', 'en'],
        defaultLang: 'fr',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ]
}).catch(err => console.error(err));
