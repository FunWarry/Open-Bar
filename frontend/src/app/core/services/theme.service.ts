import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type AppTheme = 'dark' | 'light' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'openbar_theme_preference';
  private readonly themeSubject = new BehaviorSubject<AppTheme>('dark');
  public readonly theme$: Observable<AppTheme> = this.themeSubject.asObservable();

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    const saved = localStorage.getItem(this.THEME_KEY) as AppTheme | null;
    const initialTheme = saved ?? 'dark';
    this.setTheme(initialTheme);
  }

  setTheme(theme: AppTheme) {
    this.themeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyThemeToDOM(theme);
  }

  toggleTheme(): AppTheme {
    const current = this.themeSubject.value;
    const nextTheme: AppTheme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
    return nextTheme;
  }

  get currentTheme(): AppTheme {
    return this.themeSubject.value;
  }

  get isDark(): boolean {
    return this.themeSubject.value === 'dark';
  }

  get isLight(): boolean {
    return this.themeSubject.value === 'light';
  }

  private applyThemeToDOM(theme: AppTheme) {
    const body = document.body;
    body.classList.remove('dark-theme', 'light-theme');

    if (theme === 'light') {
      body.classList.add('light-theme');
    } else if (theme === 'dark') {
      body.classList.add('dark-theme');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    }
  }
}
