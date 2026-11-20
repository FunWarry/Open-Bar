import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { getTranslocoTestingModule } from '../transloco-testing.module';
import fr from '../../assets/i18n/fr.json';
import en from '../../assets/i18n/en.json';

/**
 * Interface representing a nested translation structure.
 */
interface TranslationTree {
  [key: string]: string | TranslationTree;
}

/**
 * Recursively extracts dot-notation leaf keys from a nested translation tree.
 *
 * @param obj - Translation object or subtree
 * @param prefix - Accumulated key prefix
 * @returns Array of full dot-notated translation keys
 */
function extractLeafKeys(obj: TranslationTree, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(extractLeafKeys(v as TranslationTree, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Traverses a nested object by dot-notation path to get the translation value.
 *
 * @param obj - Translation tree
 * @param keyPath - Dot-notated key path
 * @returns The resolved string value or undefined
 */
function resolveKeyValue(obj: TranslationTree, keyPath: string): string | undefined {
  const parts = keyPath.split('.');
  let current: TranslationTree | string | undefined = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

describe('I18nIntegritySpec', () => {
  let translocoService: TranslocoService;
  let frKeys: string[];
  let enKeys: string[];

  beforeAll(() => {
    frKeys = extractLeafKeys(fr as unknown as TranslationTree);
    enKeys = extractLeafKeys(en as unknown as TranslationTree);
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        getTranslocoTestingModule({
          langs: { fr, en },
          translocoConfig: {
            availableLangs: ['fr', 'en'],
            defaultLang: 'fr',
            fallbackLang: 'en',
          },
        }),
      ],
    });

    translocoService = TestBed.inject(TranslocoService);
  });

  it('should maintain 100% key parity between fr.json and en.json', () => {
    const frSet = new Set(frKeys);
    const enSet = new Set(enKeys);

    const missingInEn = frKeys.filter(k => !enSet.has(k));
    const missingInFr = enKeys.filter(k => !frSet.has(k));

    expect(missingInEn).withContext('Keys present in fr.json but missing in en.json').toEqual([]);
    expect(missingInFr).withContext('Keys present in en.json but missing in fr.json').toEqual([]);
    expect(frKeys.length).toBe(enKeys.length);
  });

  it('should contain zero empty string translation values in fr.json and en.json', () => {
    const emptyFrKeys = frKeys.filter(k => {
      const val = resolveKeyValue(fr as unknown as TranslationTree, k);
      return val === undefined || val.trim() === '';
    });

    const emptyEnKeys = enKeys.filter(k => {
      const val = resolveKeyValue(en as unknown as TranslationTree, k);
      return val === undefined || val.trim() === '';
    });

    expect(emptyFrKeys).withContext('Keys with empty values in fr.json').toEqual([]);
    expect(emptyEnKeys).withContext('Keys with empty values in en.json').toEqual([]);
  });

  it('should preserve all mandatory core domain namespaces after pruning', () => {
    const coreNamespaces = [
      'COMMON',
      'NAV',
      'AUTH',
      'COMMANDES',
      'TABLES',
      'FACTURES',
      'DASHBOARD',
      'CLIENT_QR',
      'COCKTAILS',
      'INGREDIENTS',
      'ERRORS',
      'SETUP',
    ];

    for (const ns of coreNamespaces) {
      const hasNamespace = frKeys.some(k => k.startsWith(`${ns}.`));
      expect(hasNamespace).withContext(`Core namespace ${ns} must be present`).toBeTrue();
    }
  });

  it('should preserve all dynamic enum keys for order statuses and roles', () => {
    const expectedOrderStatuses = [
      'COMMANDES.STATUTS.EN_ATTENTE',
      'COMMANDES.STATUTS.EN_PREPARATION',
      'COMMANDES.STATUTS.PRET',
      'COMMANDES.STATUTS.LIVREE',
      'COMMANDES.STATUTS.REGLEE',
      'COMMANDES.STATUTS.ANNULEE',
    ];

    for (const statusKey of expectedOrderStatuses) {
      expect(frKeys).toContain(statusKey);
      expect(enKeys).toContain(statusKey);
    }
  });

  it('should translate core runtime keys properly without returning fallback keys', () => {
    translocoService.setActiveLang('fr');
    expect(translocoService.translate('COMMON.SAVE')).not.toBe('COMMON.SAVE');
    expect(translocoService.translate('COMMON.CANCEL')).not.toBe('COMMON.CANCEL');

    translocoService.setActiveLang('en');
    expect(translocoService.translate('COMMON.SAVE')).not.toBe('COMMON.SAVE');
    expect(translocoService.translate('COMMON.CANCEL')).not.toBe('COMMON.CANCEL');
  });
});
