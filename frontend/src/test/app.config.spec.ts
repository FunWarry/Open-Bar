import { isDevMode } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwPush, SwRegistrationOptions, SwUpdate } from '@angular/service-worker';
import { appConfig, createAppConfig } from '../app/app.config';

describe('appConfig', () => {
  describe('default dev configuration', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: appConfig.providers,
      });
    });

    it('should define application providers including Angular Service Worker', () => {
      expect(appConfig).toBeTruthy();
      expect(Array.isArray(appConfig.providers)).toBeTrue();
      expect(appConfig.providers.length).toBeGreaterThan(0);
    });

    it('should provide SwRegistrationOptions disabled in dev mode with bounded stabilization strategy', () => {
      const options = TestBed.inject(SwRegistrationOptions);

      expect(options).toBeTruthy();
      expect(options.enabled).toBe(!isDevMode());
      expect(options.registrationStrategy).toBe('registerWhenStable:5000');
    });

    it('should register SwUpdate and SwPush injectable services without errors', () => {
      const swUpdate = TestBed.inject(SwUpdate);
      const swPush = TestBed.inject(SwPush);

      expect(swUpdate).toBeTruthy();
      expect(swPush).toBeTruthy();
      expect(swUpdate.isEnabled).toBeFalse();
      expect(swPush.isEnabled).toBeFalse();
    });
  });

  describe('production configuration', () => {
    beforeEach(() => {
      if ('serviceWorker' in navigator) {
        spyOn(navigator.serviceWorker, 'register').and.resolveTo({} as ServiceWorkerRegistration);
      }
      TestBed.configureTestingModule({
        providers: createAppConfig(false).providers,
      });
    });

    it('should enable Angular Service Worker when devMode is false', () => {
      const options = TestBed.inject(SwRegistrationOptions);
      const swUpdate = TestBed.inject(SwUpdate);

      expect(options.enabled).toBeTrue();
      expect(options.registrationStrategy).toBe('registerWhenStable:5000');
      expect(swUpdate.isEnabled).toBe('serviceWorker' in navigator);
    });
  });
});
