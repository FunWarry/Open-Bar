import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject, Observable } from 'rxjs';

export type SupportedLanguage = 'fr' | 'en';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly translocoService = inject(TranslocoService);
  private readonly currentLangSubject = new BehaviorSubject<SupportedLanguage>('fr');
  public currentLang$: Observable<SupportedLanguage> = this.currentLangSubject.asObservable();

  constructor() {
    const savedLang = localStorage.getItem('openbar_lang') as SupportedLanguage;
    const initialLang = (savedLang === 'fr' || savedLang === 'en') ? savedLang : 'fr';
    this.setLanguage(initialLang);
  }

  public get currentLanguage(): SupportedLanguage {
    return this.currentLangSubject.value;
  }

  public setLanguage(lang: SupportedLanguage): void {
    this.translocoService.setActiveLang(lang);
    localStorage.setItem('openbar_lang', lang);
    this.currentLangSubject.next(lang);
  }

  public toggleLanguage(): void {
    const nextLang = this.currentLanguage === 'fr' ? 'en' : 'fr';
    this.setLanguage(nextLang);
  }
}
