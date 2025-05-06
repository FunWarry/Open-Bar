import {bootstrapApplication} from '@angular/platform-browser';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {provideStore} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {provideRouter} from '@angular/router';
import {AuthService} from './app/core/services/auth.service';
import {importProvidersFrom} from '@angular/core';

import {AppComponent} from './app/app.component';
import {routes} from './app/app.routes';
import {authReducer} from './app/core/store/auth.reducer';
import {AuthEffects} from './app/core/store/auth.effects';
import {authInterceptor} from './app/core/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideStore({auth: authReducer}),
    // provideEffects([AuthEffects]),
    importProvidersFrom(EffectsModule.forRoot([AuthEffects])), // a dellet quand NgRx seras en V19.2.0
    provideRouter(routes),
    AuthService
  ]
}).catch(err => console.error(err));
