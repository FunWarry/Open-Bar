import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShiftPresetsConfigComponent } from '../../../app/features/shift-presets/shift-presets-config.component';
import { ShiftService } from '../../../app/core/services/shift.service';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ShiftPreset } from '../../../app/core/models/shift.model';

describe('ShiftPresetsConfigComponent', () => {
  let component: ShiftPresetsConfigComponent;
  let fixture: ComponentFixture<ShiftPresetsConfigComponent>;
  let mockShiftService: jasmine.SpyObj<ShiftService>;
  let mockToastCtrl: jasmine.SpyObj<ToastController>;

  const samplePresets: ShiftPreset[] = [
    { id: 1, typeShift: 'MATIN', nom: 'Service Matin', heureDebut: '08:00', heureFin: '16:00', dureePauseMinutes: 30 },
    { id: 2, typeShift: 'SOIR', nom: 'Service Soir', heureDebut: '16:00', heureFin: '00:00', dureePauseMinutes: 30 }
  ];

  beforeEach(async () => {
    mockShiftService = jasmine.createSpyObj('ShiftService', ['getPresets', 'updatePreset']);
    mockToastCtrl = jasmine.createSpyObj('ToastController', ['create']);

    mockShiftService.getPresets.and.returnValue(of(samplePresets));
    mockToastCtrl.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    await TestBed.configureTestingModule({
      imports: [
        ShiftPresetsConfigComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              SHIFTS: {
                CONFIG: {
                  TITLE: 'Configuration des Modèles',
                  SUBTITLE: 'Définissez les horaires par défaut'
                },
                PRESETS: {
                  SAVE_PRESET: 'Enregistrer le modèle'
                }
              }
            }
          },
          translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' }
        })
      ],
      providers: [
        provideRouter([]),
        { provide: ShiftService, useValue: mockShiftService },
        { provide: ToastController, useValue: mockToastCtrl }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftPresetsConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and load shift presets', () => {
    expect(component).toBeTruthy();
    expect(mockShiftService.getPresets).toHaveBeenCalled();
    expect(component.presets).toHaveSize(2);
  });

  it('should save preset and present success toast', async () => {
    const target = samplePresets[0];
    mockShiftService.updatePreset.and.returnValue(of(target));

    await component.savePreset(target);

    expect(mockShiftService.updatePreset).toHaveBeenCalledWith('MATIN', target);
    expect(mockToastCtrl.create).toHaveBeenCalled();
  });
});
