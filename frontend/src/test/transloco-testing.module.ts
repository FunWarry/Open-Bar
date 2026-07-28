import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import fr from '../assets/i18n/fr.json';

/**
 * Returns a pre-configured {@link TranslocoTestingModule} for use in Angular unit tests.
 *
 * Loads the French translation file so that `| transloco` pipes resolve correctly
 * without making HTTP requests during testing.
 *
 * @param options - Optional overrides forwarded to {@link TranslocoTestingModule.forRoot}.
 * @returns A configured testing module ready to be included in `TestBed.configureTestingModule`.
 */
export function getTranslocoTestingModule(options: TranslocoTestingOptions = {}) {
  return TranslocoTestingModule.forRoot({
    langs: { fr },
    translocoConfig: {
      availableLangs: ['fr'],
      defaultLang: 'fr',
    },
    preloadLangs: true,
    ...options,
  });
}
