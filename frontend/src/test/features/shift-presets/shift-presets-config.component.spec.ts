import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShiftPresetsConfigComponent } from '../../../app/features/shift-presets/shift-presets-config.component';
import { ShiftService } from '../../../app/core/services/shift.service';
import { ToastController, AlertController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ShiftPreset } from '../../../app/core/models/shift.model';

describe('ShiftPresetsConfigComponent', () => {
  let component: ShiftPresetsConfigComponent;
  let fixture: ComponentFixture<ShiftPresetsConfigComponent>;
  let mockShiftService: jasmine.SpyObj<ShiftService>;
  let mockToastCtrl: jasmine.SpyObj<ToastController>;
  let mockAlertCtrl: jasmine.SpyObj<AlertController>;

  const samplePresets: ShiftPreset[] = [
    { id: 1, typeShift: 'MATIN', nom: 'Service Matin', heureDebut: '08:00', heureFin: '16:00', dureePauseMinutes: 30 },
    { id: 2, typeShift: 'SOIR', nom: 'Service Soir', heureDebut: '16:00', heureFin: '00:00', dureePauseMinutes: 30 },
    { id: 3, typeShift: 'COUPURE', nom: 'Service Coupure', heureDebut: '11:00', heureFin: '22:00', dureePauseMinutes: 120 },
    { id: 4, typeShift: 'NUIT', nom: 'Service Nuit', heureDebut: '22:00', heureFin: '06:00', dureePauseMinutes: 30 },
    { id: 5, typeShift: 'CONGE', nom: 'Congé / Absence', heureDebut: '00:00', heureFin: '00:00', dureePauseMinutes: 0 }
  ];

  beforeEach(async () => {
    mockShiftService = jasmine.createSpyObj('ShiftService', ['getPresets', 'updatePreset']);
    mockToastCtrl = jasmine.createSpyObj('ToastController', ['create']);
    mockAlertCtrl = jasmine.createSpyObj('AlertController', ['create']);

    mockShiftService.getPresets.and.returnValue(of(samplePresets));
    mockToastCtrl.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));
    mockAlertCtrl.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    await TestBed.configureTestingModule({
      imports: [
        ShiftPresetsConfigComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              SHIFTS: {
                CONFIG: {
                  TITLE: 'Preset Configuration',
                  SUBTITLE: 'Define default schedules',
                  SAVE_SUCCESS: 'Template updated successfully',
                  SAVE_ERROR: 'Failed to update template',
                  RESET_CONFIRM_TITLE: 'Reset templates?',
                  RESET_CONFIRM_MSG: 'Reset message'
                },
                SHIFT_TYPES: {
                  MATIN: 'Matin',
                  SOIR: 'Soir',
                  COUPURE: 'Coupure',
                  NUIT: 'Nuit',
                  CONGE: 'Congé'
                }
              },
              COMMON: {
                CANCEL: 'Cancel',
                CONFIRM: 'Confirm'
              }
            }
          },
          translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' }
        })
      ],
      providers: [
        provideRouter([]),
        { provide: ShiftService, useValue: mockShiftService },
        { provide: ToastController, useValue: mockToastCtrl },
        { provide: AlertController, useValue: mockAlertCtrl }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftPresetsConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and load all shift presets', () => {
    expect(component).toBeTruthy();
    expect(mockShiftService.getPresets).toHaveBeenCalled();
    expect(component.presets).toHaveSize(5);
    expect(component.loading).toBeFalse();
  });

  it('should handle loadPresets error gracefully', () => {
    mockShiftService.getPresets.and.returnValue(throwError(() => new Error('Network error')));
    component.loadPresets();
    expect(component.loading).toBeFalse();
  });

  it('should save preset and present success toast with Transloco translation', async () => {
    const target = samplePresets[0];
    mockShiftService.updatePreset.and.returnValue(of(target));

    await component.savePreset(target);

    expect(mockShiftService.updatePreset).toHaveBeenCalledWith('MATIN', target);
    expect(mockToastCtrl.create).toHaveBeenCalled();
    expect(component.savingMap['MATIN']).toBeFalse();
  });

  it('should handle savePreset error and present danger toast', async () => {
    const target = samplePresets[1];
    mockShiftService.updatePreset.and.returnValue(throwError(() => new Error('Server error')));

    await component.savePreset(target);

    expect(mockShiftService.updatePreset).toHaveBeenCalledWith('SOIR', target);
    expect(mockToastCtrl.create).toHaveBeenCalled();
    expect(component.savingMap['SOIR']).toBeFalse();
  });

  it('should calculate accurate effective duration for standard morning shift', () => {
    const morningPreset = samplePresets[0]; // 08:00 to 16:00, 30m break
    const calc = component.calculateEffectiveDuration(morningPreset);

    expect(calc.grossFormatted).toBe('8h');
    expect(calc.effectiveFormatted).toBe('7h 30min');
    expect(calc.isOvernight).toBeFalse();
    expect(calc.netMinutes).toBe(450); // 8 * 60 - 30 = 450
  });

  it('should calculate accurate duration for night shift crossing midnight', () => {
    const nightPreset = samplePresets[3]; // 22:00 to 06:00, 30m break
    const calc = component.calculateEffectiveDuration(nightPreset);

    expect(calc.grossFormatted).toBe('8h');
    expect(calc.effectiveFormatted).toBe('7h 30min');
    expect(calc.isOvernight).toBeTrue();
    expect(calc.netMinutes).toBe(450);
  });

  it('should handle time off / CONGE correctly in duration calculations', () => {
    const congePreset = samplePresets[4]; // 00:00 to 00:00
    const calc = component.calculateEffectiveDuration(congePreset);

    expect(calc.grossFormatted).toBe('0h');
    expect(calc.effectiveFormatted).toBe('0h');
    expect(calc.isOvernight).toBeFalse();
    expect(calc.netMinutes).toBe(0);
  });

  it('should update break duration using quick chip helper', () => {
    const target = samplePresets[0];
    component.setBreakDuration(target, 45);
    expect(target.dureePauseMinutes).toBe(45);
  });

  it('should compute average effective duration and average break time', () => {
    const avgDuration = component.getAverageEffectiveDuration();
    const avgBreak = component.getAverageBreakDuration();

    expect(avgDuration).toBeTruthy();
    expect(avgBreak).toBeGreaterThan(0);
  });

  it('should present alert confirmation and execute reset to defaults on confirm', async () => {
    let alertButtons: any[] = [];
    mockAlertCtrl.create.and.callFake((opts: any) => {
      alertButtons = opts.buttons;
      return Promise.resolve({ present: () => Promise.resolve() } as any);
    });
    mockShiftService.updatePreset.and.returnValue(of(samplePresets[0]));

    await component.confirmResetToDefaults();
    expect(mockAlertCtrl.create).toHaveBeenCalled();

    // Trigger confirm handler
    const confirmBtn = alertButtons.find(b => b.text === 'Confirm');
    expect(confirmBtn).toBeDefined();
    confirmBtn.handler();

    expect(mockShiftService.updatePreset).toHaveBeenCalled();
  });

  it('getShiftBadgeColor and getShiftIcon should return correct badge styles', () => {
    expect(component.getShiftBadgeColor('MATIN')).toBe('warning');
    expect(component.getShiftBadgeColor('SOIR')).toBe('primary');
    expect(component.getShiftBadgeColor('COUPURE')).toBe('tertiary');
    expect(component.getShiftBadgeColor('NUIT')).toBe('secondary');
    expect(component.getShiftBadgeColor('CONGE')).toBe('medium');

    expect(component.getShiftIcon('MATIN')).toBe('sunny-outline');
    expect(component.getShiftIcon('SOIR')).toBe('time-outline');
    expect(component.getShiftIcon('COUPURE')).toBe('cafe-outline');
    expect(component.getShiftIcon('NUIT')).toBe('moon-outline');
    expect(component.getShiftIcon('CONGE')).toBe('fitness-outline');
  });
});
