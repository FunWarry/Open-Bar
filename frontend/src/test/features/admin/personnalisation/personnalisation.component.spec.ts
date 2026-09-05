import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { PersonnalisationComponent } from '../../../../app/features/admin/personnalisation/personnalisation.component';
import { ThemeService, DEFAULT_FIGMA_PALETTE } from '../../../../app/core/services/theme.service';

describe('PersonnalisationComponent (Theme Customizer Studio)', () => {
  let component: PersonnalisationComponent;
  let themeService: ThemeService;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  beforeEach(async () => {
    localStorage.clear();
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    const toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    await TestBed.configureTestingModule({
      imports: [
        PersonnalisationComponent,
        ReactiveFormsModule,
        TranslocoTestingModule.forRoot({
          langs: { fr: {}, en: {} },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] }
        })
      ],
      providers: [
        ThemeService,
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    themeService = TestBed.inject(ThemeService);
    const fixture = TestBed.createComponent(PersonnalisationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create and initialize color form with default palette', () => {
    expect(component).toBeTruthy();
    expect(component.colorForm.get('primary')?.value).toBe(DEFAULT_FIGMA_PALETTE.primary);
    expect(component.colorForm.get('roleAdmin')?.value).toBe(DEFAULT_FIGMA_PALETTE.roleAdmin);
  });

  it('should change active theme mode', () => {
    component.onSetThemeMode('light');
    expect(component.activeTheme).toBe('light');
    expect(themeService.currentTheme).toBe('light');
  });

  it('should apply a theme preset', () => {
    component.onApplyPreset('cyberpunk');
    expect(component.colorForm.get('primary')?.value).toBe('#FF007F');
    expect(themeService.currentCustomColors.primary).toBe('#FF007F');
  });

  it('should auto-generate palette from primary color', () => {
    component.colorForm.get('primary')?.setValue('#10B981');
    component.onAutoGeneratePalette();

    expect(component.colorForm.get('primary')?.value).toBe('#10B981');
    expect(component.colorForm.get('roleAdmin')?.value).toBeDefined();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should reset colors to Figma defaults', () => {
    component.onApplyPreset('cyberpunk');
    expect(component.colorForm.get('primary')?.value).toBe('#FF007F');

    component.onResetToDefault();
    expect(component.colorForm.get('primary')?.value).toBe(DEFAULT_FIGMA_PALETTE.primary);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should submit valid form and present toast', async () => {
    await component.onSubmit();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });
});
