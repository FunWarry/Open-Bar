import { TestBed } from '@angular/core/testing';
import { ThemeService, AppTheme, DEFAULT_FIGMA_PALETTE, THEME_PRESETS } from '../../../app/core/services/theme.service';

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

  it('should manage custom colors and update CSS custom properties', () => {
    const customPalette = { ...DEFAULT_FIGMA_PALETTE, primary: '#FF007F' };
    service.setCustomColors(customPalette);

    expect(service.currentCustomColors.primary).toBe('#FF007F');
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#FF007F');
    expect(localStorage.getItem('openbar_custom_colors')).toContain('#FF007F');
  });

  it('should apply theme presets correctly', () => {
    service.applyPreset('cyberpunk');
    expect(service.currentCustomColors.primary).toBe('#FF007F');
    expect(service.currentCustomColors.roleAdmin).toBe('#C084FC');
  });

  it('should generate palette automatically from primary color', () => {
    const generated = service.generatePaletteFromPrimary('#10B981');
    expect(generated.primary).toBe('#10B981');
    expect(generated.roleAdmin).toBeDefined();
    expect(generated.roleManager).toBeDefined();
    expect(generated.roleServeur).toBeDefined();
    expect(generated.roleBarman).toBeDefined();
  });

  it('should reset custom colors to default Figma palette', () => {
    service.applyPreset('cyberpunk');
    expect(service.currentCustomColors.primary).toBe('#FF007F');

    service.resetToDefaultColors();
    expect(service.currentCustomColors.primary).toBe(DEFAULT_FIGMA_PALETTE.primary);
    expect(localStorage.getItem('openbar_custom_colors')).toBeNull();
  });
});
