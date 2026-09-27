import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RouletteWheelComponent } from '../../../../../app/core/components/ui/roulette-wheel/roulette-wheel.component';
import { RouletteAudioService } from '../../../../../app/core/services/roulette-audio.service';
import { RouletteWheelSector } from '../../../../../app/core/models/roulette.model';

describe('RouletteWheelComponent', () => {
  let component: RouletteWheelComponent;
  let fixture: ComponentFixture<RouletteWheelComponent>;
  let audioServiceMock: jasmine.SpyObj<RouletteAudioService>;

  const mockSectors: RouletteWheelSector[] = [
    { id: 1, label: 'Mojito', prizeType: 'COCKTAIL', colorHex: '#10b981', iconName: 'wine-outline', probabilityWeight: 2, active: true, displayOrder: 0 },
    { id: 2, label: 'Margarita', prizeType: 'COCKTAIL', colorHex: '#ec4899', iconName: 'wine-outline', probabilityWeight: 2, active: true, displayOrder: 1 }
  ];

  beforeEach(async () => {
    audioServiceMock = jasmine.createSpyObj('RouletteAudioService', ['playTick', 'playWinFanfare']);

    await TestBed.configureTestingModule({
      imports: [
        RouletteWheelComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'fr' }
        })
      ],
      providers: [
        { provide: RouletteAudioService, useValue: audioServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RouletteWheelComponent);
    component = fixture.componentInstance;
    component.sectors = mockSectors;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redraw wheel on ngOnChanges when sectors input changes', () => {
    const newSectors: RouletteWheelSector[] = [
      ...mockSectors,
      { id: 3, label: 'Daiquiri', prizeType: 'COCKTAIL', colorHex: '#f59e0b', iconName: 'wine-outline', probabilityWeight: 1, active: true, displayOrder: 2 }
    ];
    component.sectors = newSectors;
    expect(() => {
      component.ngOnChanges({
        sectors: new SimpleChange(mockSectors, newSectors, false)
      });
    }).not.toThrow();
  });

  it('should emit spinRequested when onSpinClick is called and not spinning', () => {
    spyOn(component.spinRequested, 'emit');
    component.isSpinning = false;
    component.readOnly = false;

    component.onSpinClick();
    expect(component.spinRequested.emit).toHaveBeenCalled();
  });

  it('should not emit spinRequested when already spinning or in readOnly mode', () => {
    spyOn(component.spinRequested, 'emit');

    component.isSpinning = true;
    component.onSpinClick();
    expect(component.spinRequested.emit).not.toHaveBeenCalled();

    component.isSpinning = false;
    component.readOnly = true;
    component.onSpinClick();
    expect(component.spinRequested.emit).not.toHaveBeenCalled();
  });

  it('should spinTo targetIndex and eventually emit spinComplete', (done) => {
    spyOn(component.spinComplete, 'emit').and.callFake((val) => {
      expect(val).toBeDefined();
      if (val) {
        expect(val.index).toBe(1);
        expect(val.sector.label).toBe('Margarita');
      }
      done();
    });

    // Use very short duration for test execution
    component.spinTo(1, 0.05);
  });
});
