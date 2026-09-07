import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject, Observable } from 'rxjs';
/**
 * Supported i18n interface languages.
 */

export type SupportedLanguage = 'fr' | 'en';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly translocoService = inject(TranslocoService);
  private readonly currentLangSubject = new BehaviorSubject<SupportedLanguage>('fr');
  public currentLang$: Observable<SupportedLanguage> = this.currentLangSubject.asObservable();

  /**
   * Initializes LanguageService, loading previously saved language preference from localStorage.
   */
  constructor() {
    const savedLang = localStorage.getItem('openbar_lang') as SupportedLanguage;
    const initialLang = (savedLang === 'fr' || savedLang === 'en') ? savedLang : 'fr';
    this.setLanguage(initialLang);
  }

  public get currentLanguage(): SupportedLanguage {
    return this.currentLangSubject.value;
  }

  /**
   * Sets and persists active application language.
   * @param lang Supported language code
   */
  public setLanguage(lang: SupportedLanguage): void {
    this.translocoService.setActiveLang(lang);
    localStorage.setItem('openbar_lang', lang);
    this.currentLangSubject.next(lang);
  }

  /**
   * Toggles application language between English and French.
   */
  public toggleLanguage(): void {
    const nextLang = this.currentLanguage === 'fr' ? 'en' : 'fr';
    this.setLanguage(nextLang);
  }
}
