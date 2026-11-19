import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr, 'fr');

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

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

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));

