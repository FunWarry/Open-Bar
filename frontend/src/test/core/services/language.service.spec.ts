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
  });

  afterEach(() => {
    localStorage.removeItem('openbar_lang');
  });

  it('should default to fr when no localStorage value is present', () => {
    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslocoService, useValue: translocoSpy },
      ],
    });
    service = TestBed.inject(LanguageService);

    expect(service).toBeTruthy();
    expect(service.currentLanguage).toBe('fr');
    expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('fr');
  });

  it('should initialize with saved language from localStorage if valid', () => {
    localStorage.setItem('openbar_lang', 'en');
    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslocoService, useValue: translocoSpy },
      ],
    });
    service = TestBed.inject(LanguageService);

    expect(service.currentLanguage).toBe('en');
    expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('en');
  });

  it('should fallback to fr if localStorage contains invalid language', () => {
    localStorage.setItem('openbar_lang', 'invalid_lang');
    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslocoService, useValue: translocoSpy },
      ],
    });
    service = TestBed.inject(LanguageService);

    expect(service.currentLanguage).toBe('fr');
  });

  it('should change language to en and persist in localStorage', () => {
    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslocoService, useValue: translocoSpy },
      ],
    });
    service = TestBed.inject(LanguageService);

    service.setLanguage('en');
    expect(service.currentLanguage).toBe('en');
    expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('en');
    expect(localStorage.getItem('openbar_lang')).toBe('en');
  });

  it('should toggle language from fr to en and back to fr', () => {
    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslocoService, useValue: translocoSpy },
      ],
    });
    service = TestBed.inject(LanguageService);

    expect(service.currentLanguage).toBe('fr');
    service.toggleLanguage();
    expect(service.currentLanguage).toBe('en');
    service.toggleLanguage();
    expect(service.currentLanguage).toBe('fr');
  });
});
