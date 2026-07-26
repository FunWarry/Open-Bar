import { TestBed } from '@angular/core/testing';
import { ThemeService, AppTheme } from '../../../app/core/services/theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove('dark-theme', 'light-theme');

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.body.classList.remove('dark-theme', 'light-theme');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to dark theme when no preference is saved', () => {
    expect(service.currentTheme).toBe('dark');
    expect(service.isDark).toBeTrue();
    expect(service.isLight).toBeFalse();
  });

  it('should apply light theme and update document.body class', () => {
    service.setTheme('light');
    expect(service.currentTheme).toBe('light');
    expect(service.isLight).toBeTrue();
    expect(document.body.classList.contains('light-theme')).toBeTrue();
    expect(document.body.classList.contains('dark-theme')).toBeFalse();
    expect(localStorage.getItem('openbar_theme_preference')).toBe('light');
  });

  it('should toggle theme from dark to light and vice versa', () => {
    service.setTheme('dark');
    const next = service.toggleTheme();
    expect(next).toBe('light');
    expect(service.currentTheme).toBe('light');

    const backToDark = service.toggleTheme();
    expect(backToDark).toBe('dark');
    expect(service.currentTheme).toBe('dark');
  });

  it('should notify subscribers via theme$ Observable', (done) => {
    const states: AppTheme[] = [];
    service.theme$.subscribe((t: AppTheme) => {
      states.push(t);
      if (states.length === 3) {
        expect(states).toEqual(['dark', 'light', 'dark']);
        done();
      }
    });

    service.setTheme('light');
    service.setTheme('dark');
  });
});
