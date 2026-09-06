import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular/standalone';
import { HappyHourConfigComponent } from '../../../../app/features/admin/settings/components/happy-hour-config/happy-hour-config.component';
import { HappyHourService } from '../../../../app/core/services/happy-hour.service';
import { CocktailService } from '../../../../app/core/services/cocktail.service';
import { AppSettingsService } from '../../../../app/core/services/app-settings.service';
import { HappyHourRule } from '../../../../app/core/models/happy-hour.model';
import { Cocktail } from '../../../../app/core/models/cocktail.model';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('HappyHourConfigComponent', () => {
  let component: HappyHourConfigComponent;
  let fixture: ComponentFixture<HappyHourConfigComponent>;
  let happyHourServiceSpy: jasmine.SpyObj<HappyHourService>;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let appSettingsServiceSpy: jasmine.SpyObj<AppSettingsService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;

  const rulesSignalMock = signal<HappyHourRule[]>([]);

  const mockRule: HappyHourRule = {
    id: 1,
    name: 'Standard Happy Hour',
    startTime: '18:00',
    endTime: '20:00',
    daysOfWeek: ['THURSDAY', 'FRIDAY'],
    discountType: 'PERCENTAGE',
    discountValue: 20,
    active: true,
    categories: ['COCKTAIL'],
    cocktailIds: [10]
  };

  const mockCocktails: Cocktail[] = [
    { id: 10, nom: 'Mojito', prix: 9.0, disponible: true, categorie: 'COCKTAIL' } as any,
    { id: 11, nom: 'Pina Colada', prix: 10.0, disponible: true, categorie: 'COCKTAIL' } as any,
  ];

  beforeEach(async () => {
    rulesSignalMock.set([mockRule]);

    happyHourServiceSpy = jasmine.createSpyObj('HappyHourService', [
      'getAllRules',
      'getActiveRules',
      'createRule',
      'updateRule',
      'toggleRule',
      'deleteRule',
      'simulateRule',
      'resolvePrice',
      'isRuleApplicableNow'
    ], {
      rules: rulesSignalMock.asReadonly()
    });
    happyHourServiceSpy.getAllRules.and.returnValue(of([mockRule]));
    happyHourServiceSpy.createRule.and.returnValue(of({ ...mockRule, id: 2, name: 'New Rule' }));
    happyHourServiceSpy.updateRule.and.returnValue(of({ ...mockRule, name: 'Updated Rule' }));
    happyHourServiceSpy.toggleRule.and.returnValue(of({ ...mockRule, active: false }));
    happyHourServiceSpy.deleteRule.and.returnValue(of(undefined));
    happyHourServiceSpy.resolvePrice.and.returnValue({
      effectivePrice: 7.2,
      isHappyHour: true,
      appliedRule: mockRule,
      savings: 1.8
    });
    happyHourServiceSpy.isRuleApplicableNow.and.returnValue(true);

    cocktailServiceSpy = jasmine.createSpyObj('CocktailService', ['getAll']);
    cocktailServiceSpy.getAll.and.returnValue(of(mockCocktails));

    appSettingsServiceSpy = jasmine.createSpyObj('AppSettingsService', ['getSettings', 'formatCurrency']);
    appSettingsServiceSpy.formatCurrency.and.callFake((val: number | null | undefined) => `${val ?? 0} €`);

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve({
      present: jasmine.createSpy('present')
    } as any));

    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrlSpy.create.and.returnValue(Promise.resolve({
      present: jasmine.createSpy('present')
    } as any));

    await TestBed.configureTestingModule({
      imports: [
        HappyHourConfigComponent,
        ReactiveFormsModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: HappyHourService, useValue: happyHourServiceSpy },
        { provide: CocktailService, useValue: cocktailServiceSpy },
        { provide: AppSettingsService, useValue: appSettingsServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HappyHourConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize, load rules and cocktails', () => {
    expect(component).toBeTruthy();
    expect(happyHourServiceSpy.getAllRules).toHaveBeenCalled();
    expect(cocktailServiceSpy.getAll).toHaveBeenCalled();
    expect(component.cocktails()).toHaveSize(2);
    expect(component.rules()).toHaveSize(1);
  });

  it('should toggle day selection correctly', () => {
    expect(component.selectedDays()).toEqual([]);
    component.toggleDay('FRIDAY');
    expect(component.selectedDays()).toContain('FRIDAY');
    expect(component.isDaySelected('FRIDAY')).toBeTrue();

    // Toggle off
    component.toggleDay('FRIDAY');
    expect(component.selectedDays()).not.toContain('FRIDAY');
    expect(component.isDaySelected('FRIDAY')).toBeFalse();
  });

  it('should add and remove category scoping chips', () => {
    component.onAddCategoryOption({ value: 'BEER', label: 'BEER' });
    expect(component.selectedCategories()).toContain('BEER');

    // Duplicate should not be re-added
    component.onAddCategoryOption({ value: 'BEER', label: 'BEER' });
    expect(component.selectedCategories()).toHaveSize(1);

    component.removeCategory('BEER');
    expect(component.selectedCategories()).not.toContain('BEER');
  });

  it('should add and remove cocktail scoping chips', () => {
    component.onAddCocktailOption({ value: 10, label: 'Mojito' });
    expect(component.selectedCocktailIds()).toContain(10);

    // Duplicate should not be re-added
    component.onAddCocktailOption({ value: 10, label: 'Mojito' });
    expect(component.selectedCocktailIds()).toHaveSize(1);

    component.removeCocktail(10);
    expect(component.selectedCocktailIds()).not.toContain(10);
  });

  it('openCreateModal() resets form and opens modal in creation mode', () => {
    component.openCreateModal();
    expect(component.showModal()).toBeTrue();
    expect(component.isEditing()).toBeFalse();
    expect(component.editingRuleId()).toBeNull();
    expect(component.selectedDays().length).toBeGreaterThan(0); // Default weekdays
  });

  it('openEditModal() populates form with existing rule data', () => {
    component.openEditModal(mockRule);
    expect(component.showModal()).toBeTrue();
    expect(component.isEditing()).toBeTrue();
    expect(component.editingRuleId()).toBe(1);
    expect(component.ruleForm.value.name).toBe('Standard Happy Hour');
    expect(component.selectedDays()).toEqual(['THURSDAY', 'FRIDAY']);
    expect(component.selectedCategories()).toEqual(['COCKTAIL']);
    expect(component.selectedCocktailIds()).toEqual([10]);
  });

  it('closeModal() closes modal and resets states', () => {
    component.openCreateModal();
    expect(component.showModal()).toBeTrue();
    component.closeModal();
    expect(component.showModal()).toBeFalse();
  });

  it('saveRule() validates form and creates rule when in creation mode', fakeAsync(() => {
    component.openCreateModal();
    component.ruleForm.patchValue({
      name: 'Afterwork Promo',
      startTime: '17:00',
      endTime: '19:00',
      discountType: 'PERCENTAGE',
      discountValue: 25,
      active: true
    });
    component.selectedDays.set(['MONDAY', 'TUESDAY']);

    component.saveRule();
    tick();

    expect(happyHourServiceSpy.createRule).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(component.showModal()).toBeFalse();
  }));

  it('saveRule() updates existing rule when in edit mode', fakeAsync(() => {
    component.openEditModal(mockRule);
    component.ruleForm.patchValue({
      name: 'Updated Promo Name'
    });

    component.saveRule();
    tick();

    expect(happyHourServiceSpy.updateRule).toHaveBeenCalledWith(1, jasmine.objectContaining({
      name: 'Updated Promo Name'
    }));
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(component.showModal()).toBeFalse();
  }));

  it('toggleRuleActive() calls happyHourService.toggleRule', fakeAsync(() => {
    component.toggleRuleActive(mockRule, new MouseEvent('click'));
    tick();

    expect(happyHourServiceSpy.toggleRule).toHaveBeenCalledWith(1);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('confirmDelete() presents confirmation alert dialog', async () => {
    await component.confirmDelete(mockRule, new MouseEvent('click'));
    expect(alertCtrlSpy.create).toHaveBeenCalled();
  });

  it('runSimulation() computes effective pricing for the selected cocktail and simulated time', fakeAsync(() => {
    component.onSimulationCocktailChange(10);
    component.onSimulationTimeChange('19:00');
    tick();

    expect(happyHourServiceSpy.resolvePrice).toHaveBeenCalled();
    const res = component.simulationResult();
    expect(res).not.toBeNull();
    expect(res?.cocktailNom).toBe('Mojito');
    expect(res?.effectivePrice).toBe(7.2);
    expect(res?.isHappyHour).toBeTrue();
  }));
});
