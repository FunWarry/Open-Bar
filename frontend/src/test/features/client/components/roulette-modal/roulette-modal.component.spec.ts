import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RouletteModalComponent } from '../../../../../app/features/client/components/roulette-modal/roulette-modal.component';
import { RouletteService } from '../../../../../app/core/services/roulette.service';
import { RoulettePublicConfig, RouletteSpinResult } from '../../../../../app/core/models/roulette.model';

describe('RouletteModalComponent', () => {
  let component: RouletteModalComponent;
  let fixture: ComponentFixture<RouletteModalComponent>;
  let rouletteServiceMock: jasmine.SpyObj<RouletteService>;
  let modalCtrlMock: jasmine.SpyObj<ModalController>;
  let toastCtrlMock: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  const mockConfig: RoulettePublicConfig = {
    enabled: true,
    priceCocktail: 7.5,
    priceMocktail: 5.5,
    stockBias: 'BALANCED',
    soundProfile: 'CSGO',
    sectors: [
      { id: 1, label: 'Mojito', prizeType: 'COCKTAIL', colorHex: '#10b981', iconName: 'wine-outline', probabilityWeight: 2, active: true, displayOrder: 0 }
    ],
    availableCategories: ['ALL', 'GIN', 'RUM']
  };

  const mockSpinResult: RouletteSpinResult = {
    sectorId: 1,
    winningIndex: 0,
    prizeType: 'COCKTAIL',
    cocktailId: 10,
    cocktailNom: 'Mojito',
    prix: 7.5,
    isMysteryDrink: true,
    addedToCart: true,
    activeSectors: mockConfig.sectors
  };

  beforeEach(async () => {
    rouletteServiceMock = jasmine.createSpyObj('RouletteService', ['getPublicConfig', 'spin']);
    rouletteServiceMock.getPublicConfig.and.returnValue(of(mockConfig));
    rouletteServiceMock.spin.and.returnValue(of(mockSpinResult));

    modalCtrlMock = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlMock.dismiss.and.returnValue(Promise.resolve(true));

    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlMock = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlMock.create.and.returnValue(Promise.resolve(toastSpy));

    await TestBed.configureTestingModule({
      imports: [
        RouletteModalComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'fr' }
        })
      ],
      providers: [
        { provide: RouletteService, useValue: rouletteServiceMock },
        { provide: ModalController, useValue: modalCtrlMock },
        { provide: ToastController, useValue: toastCtrlMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RouletteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create and load config on init', () => {
    expect(component).toBeTruthy();
    expect(rouletteServiceMock.getPublicConfig).toHaveBeenCalled();
    expect(component.config).toEqual(mockConfig);
    expect(component.isLoading).toBeFalse();
  });

  it('should handle config load error gracefully', () => {
    rouletteServiceMock.getPublicConfig.and.returnValue(throwError(() => new Error('Network error')));
    component.loadConfig();

    expect(component.isLoading).toBeFalse();
    expect(toastCtrlMock.create).toHaveBeenCalled();
  });

  it('should allow category selection when not spinning', () => {
    component.isSpinning = false;
    component.selectCategory('GIN');
    expect(component.selectedCategory).toBe('GIN');
  });

  it('should ignore category selection when spinning', () => {
    component.isSpinning = true;
    component.selectCategory('VODKA');
    expect(component.selectedCategory).toBe('ALL');
  });

  it('should start spin and store pending result on success', () => {
    component.selectedCategory = 'GIN';
    component.startSpin();

    expect(rouletteServiceMock.spin).toHaveBeenCalledWith(jasmine.objectContaining({
      spiritCategory: 'GIN',
      nonAlcoholicOnly: false,
      autoAddToCart: false
    }));
    expect(component.isSpinning).toBeTrue();
  });

  it('should start spin with nonAlcoholicOnly true when MOCKTAIL is selected', () => {
    component.selectedCategory = 'MOCKTAIL';
    component.startSpin();

    expect(rouletteServiceMock.spin).toHaveBeenCalledWith(jasmine.objectContaining({
      nonAlcoholicOnly: true,
      autoAddToCart: false
    }));
  });

  it('should handle spin error gracefully and reset isSpinning', () => {
    rouletteServiceMock.spin.and.returnValue(throwError(() => ({ error: { message: 'Out of stock' } })));
    component.startSpin();

    expect(component.isSpinning).toBeFalse();
    expect(toastCtrlMock.create).toHaveBeenCalled();
  });

  it('should update winningResult when onSpinComplete is invoked', () => {
    component.startSpin();
    component.onSpinComplete({ sector: mockConfig.sectors[0], index: 0 });

    expect(component.isSpinning).toBeFalse();
    expect(component.winningResult()).toEqual(mockSpinResult);
  });

  it('should dismiss modal with winning result when confirmAndAddToCart is called', () => {
    component.winningResult.set(mockSpinResult);
    component.confirmAndAddToCart();

    expect(modalCtrlMock.dismiss).toHaveBeenCalledWith({
      action: 'ADD_TO_CART',
      result: mockSpinResult
    });
  });

  it('should dismiss modal with null when confirmAndAddToCart is called with null winningResult', () => {
    component.winningResult.set(null);
    component.confirmAndAddToCart();

    expect(modalCtrlMock.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should dismiss modal with null when dismiss is called', () => {
    component.dismiss();
    expect(modalCtrlMock.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });
});
