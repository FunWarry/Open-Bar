import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../app/core/services/language.service';
import { TranslocoService } from '@jsverse/transloco';

describe('LanguageService', () => {
  let service: LanguageService;
  let translocoSpy: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    translocoSpy = jasmine.createSpyObj('TranslocoService', ['setActiveLang', 'getActiveLang']);
    translocoSpy.getActiveLang.and.returnValue('fr');

    localStorage.removeItem('openbar_lang');

    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslocoService, useValue: translocoSpy },
      ],
    });

    service = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    localStorage.removeItem('openbar_lang');
  });

  it('should be created and default to fr', () => {
    expect(service).toBeTruthy();
    expect(service.currentLanguage).toBe('fr');
    expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('fr');
  });

  it('should change language to en and persist in localStorage', () => {
    service.setLanguage('en');
    expect(service.currentLanguage).toBe('en');
    expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('en');
    expect(localStorage.getItem('openbar_lang')).toBe('en');
  });

  it('should toggle language from fr to en and back to fr', () => {
    expect(service.currentLanguage).toBe('fr');
    service.toggleLanguage();
    expect(service.currentLanguage).toBe('en');
    service.toggleLanguage();
    expect(service.currentLanguage).toBe('fr');
  });
});
