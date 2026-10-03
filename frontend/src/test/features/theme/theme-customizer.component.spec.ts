import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { of } from 'rxjs';
import { ThemeCustomizerComponent } from '../../../app/features/theme/theme-customizer.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import {
  ThemeService,
  DEFAULT_FIGMA_PALETTE,
  THEME_PRESETS
} from '../../../app/core/services/theme.service';

describe('ThemeCustomizerComponent', () => {
  let component: ThemeCustomizerComponent;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  beforeEach(async () => {
    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastSpy.present.and.returnValue(Promise.resolve());

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    themeServiceSpy = jasmine.createSpyObj('ThemeService', [
      'setTheme',
      'applyPreset',
      'setCustomColors',
      'generatePaletteFromPrimary',
      'resetToDefaultColors'
    ], {
      currentTheme: 'dark',
      currentCustomColors: { ...DEFAULT_FIGMA_PALETTE }
    });

    themeServiceSpy.generatePaletteFromPrimary.and.returnValue({
      ...DEFAULT_FIGMA_PALETTE,
      primary: '#FF007F'
    });

    await TestBed.configureTestingModule({
      imports: [
        ThemeCustomizerComponent,
        ReactiveFormsModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ThemeCustomizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize activeTheme and colorForm from ThemeService', () => {
    expect(component.activeTheme).toBe('dark');
    expect(component.colorForm.get('primary')?.value).toBe(DEFAULT_FIGMA_PALETTE.primary);
    expect(component.colorForm.get('bgDark')?.value).toBe(DEFAULT_FIGMA_PALETTE.bgDark);
  });

  it('onSetThemeMode() updates activeTheme and delegates to ThemeService', () => {
    component.onSetThemeMode('light');
    expect(component.activeTheme).toBe('light');
    expect(themeServiceSpy.setTheme).toHaveBeenCalledWith('light');
  });

  it('onApplyPreset() patches colorForm, calls applyPreset and emits themeChange', () => {
    spyOn(component.themeChange, 'emit');
    component.onApplyPreset('cyberpunk');
    expect(themeServiceSpy.applyPreset).toHaveBeenCalledWith('cyberpunk');
    expect(component.colorForm.get('primary')?.value).toBe(THEME_PRESETS['cyberpunk'].colors.primary);
    expect(component.themeChange.emit).toHaveBeenCalledWith(THEME_PRESETS['cyberpunk'].colors);
  });

  it('isPresetActive() correctly detects active preset matching primary color', () => {
    component.onApplyPreset('emerald');
    expect(component.isPresetActive('emerald')).toBeTrue();
    expect(component.isPresetActive('cyberpunk')).toBeFalse();
  });

  it('onAutoGeneratePalette() generates harmonious colors and presents toast', async () => {
    component.colorForm.patchValue({ primary: '#6C7FE8' });
    await component.onAutoGeneratePalette();

    expect(themeServiceSpy.generatePaletteFromPrimary).toHaveBeenCalledWith('#6C7FE8');
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(toastSpy.present).toHaveBeenCalled();
  });

  it('onResetToDefaultTheme() resets colors to Figma defaults and presents info toast', async () => {
    await component.onResetToDefaultTheme();
    expect(themeServiceSpy.resetToDefaultColors).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(toastSpy.present).toHaveBeenCalled();
  });

  it('emits themeChange and updates ThemeService when colorForm values change', () => {
    spyOn(component.themeChange, 'emit');
    component.colorForm.patchValue({ primary: '#123456' });

    expect(themeServiceSpy.setCustomColors).toHaveBeenCalled();
    expect(component.themeChange.emit).toHaveBeenCalled();
  });

  it('should unsubscribe on destroy without throwing', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
