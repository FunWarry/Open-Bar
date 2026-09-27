import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { PurchaseOrderFormModalComponent } from '../../../app/features/purchases/purchase-order-form-modal/purchase-order-form-modal.component';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { Supplier } from '../../../app/core/models/supplier.model';
import { Ingredient } from '../../../app/core/models/ingredient.model';

describe('PurchaseOrderFormModalComponent', () => {
  let component: PurchaseOrderFormModalComponent;
  let fixture: ComponentFixture<PurchaseOrderFormModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;

  const mockSuppliers: Supplier[] = [
    { id: 1, nom: 'Distillerie des Alpes', actif: true },
    { id: 2, nom: 'Grossiste Boissons Rhône', actif: true }
  ];

  const mockIngredients: Ingredient[] = [
    {
      id: 10,
      nom: 'Rhum Blanc',
      quantiteStock: 5,
      seuilAlerte: 2,
      unitCost: 18.5,
      uniteMesure: 'Bouteille',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 20,
      nom: 'Gin',
      quantiteStock: 3,
      seuilAlerte: 1,
      unitCost: 22.0,
      uniteMesure: 'Bouteille',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 30,
      nom: 'Vodka',
      quantiteStock: 200,
      seuilAlerte: 50,
      prixUnitaire: 0.30,
      uniteMesure: 'cl',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 31,
      nom: 'Sirop Sucre',
      quantiteStock: 10,
      seuilAlerte: 2,
      prixUnitaire: 8.00,
      uniteMesure: 'l',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 32,
      nom: 'Menthe Fraîche',
      quantiteStock: 150,
      seuilAlerte: 30,
      prixUnitaire: 0.04,
      uniteMesure: 'feuille',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 33,
      nom: 'Sucre de Canne',
      quantiteStock: 2000,
      seuilAlerte: 500,
      prixUnitaire: 0.01,
      uniteMesure: 'g',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 34,
      nom: 'Citrons Frais',
      quantiteStock: 5,
      seuilAlerte: 1,
      prixUnitaire: 3.50,
      uniteMesure: 'kg',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 35,
      nom: 'Glaçons',
      quantiteStock: 10,
      seuilAlerte: 2,
      uniteMesure: 'Sac',
      purchaseUnit: 'Sac 5kg',
      packagingCapacity: 5,
      packagingPriceHt: 6.50,
      prixUnitaire: 6.50,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 36,
      nom: 'Paille Inox',
      quantiteStock: 50,
      seuilAlerte: 10,
      prixUnitaire: 0.50,
      uniteMesure: 'pièce',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    }
  ];

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getByBarcode']);

    const toastSpyObj = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpyObj));

    await TestBed.configureTestingModule({
      imports: [
        PurchaseOrderFormModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderFormModalComponent);
    component = fixture.componentInstance;
    component.suppliers = mockSuppliers;
    component.ingredients = mockIngredients;
    fixture.detectChanges();
  });

  it('should initialize form with default values and 1 item row', () => {
    expect(component.form).toBeDefined();
    expect(component.form.get('supplierId')?.value).toBe(1);
    expect(component.items).toHaveSize(1);
  });

  it('addItem() adds a new line item to the form', () => {
    component.addItem(20, 22.0, 20);
    expect(component.items).toHaveSize(2);
    expect(component.items.at(1).get('ingredientId')?.value).toBe(20);
    expect(component.items.at(1).get('prixUnitaireHt')?.value).toBe(22.0);
  });

  it('removeItem() removes a line item when more than 1 exist', () => {
    component.addItem(20, 22.0, 20);
    expect(component.items).toHaveSize(2);

    component.removeItem(0);
    expect(component.items).toHaveSize(1);

    // Should not remove last item
    component.removeItem(0);
    expect(component.items).toHaveSize(1);
  });

  it('onIngredientSelected() updates prixUnitaireHt from ingredient unitCost', () => {
    component.onIngredientSelected(0, 10);
    expect(component.items.at(0).get('prixUnitaireHt')?.value).toBe(18.5);
  });

  it('onIngredientSelected() preloads smart commercial packaging for liquid ingredients (cl)', () => {
    component.onIngredientSelected(0, 30);
    const line = component.items.at(0);
    expect(line.get('purchaseUnit')?.value).toBe('Bouteille 70cl');
    expect(line.get('packagingCapacity')?.value).toBe(70);
    expect(line.get('prixUnitaireHt')?.value).toBe(21.0);
  });

  it('onIngredientSelected() preloads smart packaging for 1L liquid ingredients', () => {
    component.onIngredientSelected(0, 31);
    const line = component.items.at(0);
    expect(line.get('purchaseUnit')?.value).toBe('Bouteille 1L');
    expect(line.get('packagingCapacity')?.value).toBe(1);
    expect(line.get('prixUnitaireHt')?.value).toBe(8.00);
  });

  it('onIngredientSelected() preloads bunch packaging for mint leaves (feuille)', () => {
    component.onIngredientSelected(0, 32);
    const line = component.items.at(0);
    expect(line.get('purchaseUnit')?.value).toBe('Botte (≈ 50 feuilles)');
    expect(line.get('packagingCapacity')?.value).toBe(50);
    expect(line.get('prixUnitaireHt')?.value).toBe(2.00);
  });

  it('onIngredientSelected() preloads 1kg packaging for gram ingredients (g)', () => {
    component.onIngredientSelected(0, 33);
    const line = component.items.at(0);
    expect(line.get('purchaseUnit')?.value).toBe('Paquet 1kg');
    expect(line.get('packagingCapacity')?.value).toBe(1000);
    expect(line.get('prixUnitaireHt')?.value).toBe(10.00);
  });

  it('onIngredientSelected() preloads packaging for kg ingredients', () => {
    component.onIngredientSelected(0, 34);
    const line = component.items.at(0);
    expect(line.get('purchaseUnit')?.value).toBe('Paquet 1kg');
    expect(line.get('packagingCapacity')?.value).toBe(1);
    expect(line.get('prixUnitaireHt')?.value).toBe(3.50);
  });

  it('onIngredientSelected() preserves existing custom packaging when already defined', () => {
    component.onIngredientSelected(0, 35);
    const line = component.items.at(0);
    expect(line.get('purchaseUnit')?.value).toBe('Sac 5kg');
    expect(line.get('packagingCapacity')?.value).toBe(5);
    expect(line.get('prixUnitaireHt')?.value).toBe(6.50);
  });

  it('onIngredientSelected() handles piece/other units fallback', () => {
    component.onIngredientSelected(0, 36);
    const line = component.items.at(0);
    expect(line.get('purchaseUnit')?.value).toBe('pièce');
    expect(line.get('packagingCapacity')?.value).toBe(1);
    expect(line.get('prixUnitaireHt')?.value).toBe(0.50);
  });

  it('onIngredientSelected() accepts SearchableOption object and handles null/unknown gracefully', () => {
    component.onIngredientSelected(0, { value: 30, label: 'Vodka' });
    expect(component.items.at(0).get('purchaseUnit')?.value).toBe('Bouteille 70cl');

    // Should return early and not throw when null or unknown
    expect(() => component.onIngredientSelected(0, null)).not.toThrow();
    expect(() => component.onIngredientSelected(0, 9999)).not.toThrow();
  });

  it('getEquivalentStock() computes inventory quantity from line item quantity and packaging capacity', () => {
    component.onIngredientSelected(0, 30);
    const line = component.items.at(0);
    line.patchValue({ ingredientId: 30, quantiteCommandee: 3, packagingCapacity: 70 });

    const eq = component.getEquivalentStock(line);
    expect(eq.qty).toBe(210);
    expect(eq.unit).toBe('cl');
  });

  it('initOptions() builds commercial packaging subLabels for ingredients', () => {
    const vodkaOpt = component.ingredientOptions.find(o => o.value === 30);
    expect(vodkaOpt?.subLabel).toContain('Bouteille 70cl');
    expect(vodkaOpt?.subLabel).toContain('21.00 €');

    const mintOpt = component.ingredientOptions.find(o => o.value === 32);
    expect(mintOpt?.subLabel).toContain('Botte (≈ 50 feuilles)');
    expect(mintOpt?.subLabel).toContain('2.00 €');
  });

  it('getPackagingPresets() provides standard bar presets including Magnum 1.75L', () => {
    component.onIngredientSelected(0, 30);
    const line = component.items.at(0);
    const presets = component.getPackagingPresets(line);
    const units = presets.map(p => p.unit);

    expect(units).toContain('Bouteille 70cl');
    expect(units).toContain('Bouteille 1L');
    expect(units).toContain('Magnum 1.75L');
    expect(units).toContain('Fût 20L');
    expect(units).toContain('CUSTOM');
  });

  it('onPackagingSelected() updates line packaging, capacity and scales suggested unit price', () => {
    component.onIngredientSelected(0, 30);
    const line = component.items.at(0);

    const mockEvent = {
      target: { value: 'Magnum 1.75L' }
    } as unknown as Event;

    component.onPackagingSelected(0, mockEvent);

    expect(line.get('purchaseUnit')?.value).toBe('Magnum 1.75L');
    expect(line.get('packagingCapacity')?.value).toBe(175);
    expect(line.get('prixUnitaireHt')?.value).toBe(52.50);

    line.patchValue({ quantiteCommandee: 2 });
    const eq = component.getEquivalentStock(line);
    expect(eq.qty).toBe(350);
    expect(eq.unit).toBe('cl');
  });

  it('onPackagingSelected() handles CUSTOM packaging selection', () => {
    component.onIngredientSelected(0, 30);
    const line = component.items.at(0);

    const mockCustomEvent = {
      target: { value: 'CUSTOM' }
    } as unknown as Event;

    component.onPackagingSelected(0, mockCustomEvent);
    expect(line.get('purchaseUnit')?.value).toBe('Format sur-mesure');
    expect(line.get('packagingCapacity')?.value).toBe(1);
  });

  it('getPackagingOptions() returns SearchableOption list with badges and icons for searchable select component', () => {
    component.onIngredientSelected(0, 30);
    const line = component.items.at(0);
    const options = component.getPackagingOptions(line);

    expect(options.length).toBeGreaterThan(0);
    const b70 = options.find(o => o.value === 'Bouteille 70cl');
    expect(b70).toBeDefined();
    expect(b70?.label).toBe('Bouteille 70cl');
    expect(b70?.badge).toBe('70 cl');
    expect(b70?.icon).toBe('wine-outline');

    const custom = options.find(o => o.value === 'Format sur-mesure');
    expect(custom).toBeDefined();
    expect(custom?.icon).toBe('create-outline');
  });

  it('onPackagingSelected() supports SearchableOption object directly', () => {
    component.onIngredientSelected(0, 30);
    const line = component.items.at(0);

    component.onPackagingSelected(0, {
      value: 'Magnum 1.75L',
      label: 'Magnum 1.75L'
    });

    expect(line.get('purchaseUnit')?.value).toBe('Magnum 1.75L');
    expect(line.get('packagingCapacity')?.value).toBe(175);
    expect(line.get('prixUnitaireHt')?.value).toBe(52.50);
  });

  it('calculates totalHt, totalTva and totalTtc correctly', () => {
    component.items.at(0).patchValue({
      ingredientId: 10,
      quantiteCommandee: 2,
      prixUnitaireHt: 50,
      tauxTva: 20
    });

    expect(component.totalHt).toBe(100);
    expect(component.totalTva).toBe(20);
    expect(component.totalTtc).toBe(120);
  });

  it('onSubmit() marks form as touched if invalid', () => {
    component.items.at(0).patchValue({ ingredientId: '' });
    component.onSubmit();
    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('onSubmit() dismisses with payload when form is valid', () => {
    component.form.patchValue({
      supplierId: 1,
      dateLivraisonPrevue: '2026-09-25T00:00:00.000Z',
      referenceFactureFournisseur: 'FA-1234',
      notes: 'Urgent order'
    });
    component.items.at(0).patchValue({
      ingredientId: 10,
      quantiteCommandee: 2,
      prixUnitaireHt: 18.5,
      tauxTva: 20
    });

    component.onSubmit();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({
      confirmed: true,
      order: jasmine.objectContaining({
        supplierId: 1,
        referenceFactureFournisseur: 'FA-1234',
        notes: 'Urgent order'
      })
    }));
  });

  it('onCancel() dismisses modal without confirming', () => {
    component.onCancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ confirmed: false });
  });

  it('openBarcodeScanner() increments quantity when ingredient already present', async () => {
    ingredientServiceSpy.getByBarcode.and.returnValue(of(mockIngredients[0]));

    const subModalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onWillDismiss']);
    subModalSpy.present.and.returnValue(Promise.resolve());
    subModalSpy.onWillDismiss.and.returnValue(Promise.resolve({
      data: { barcode: '3256220148521', cancelled: false }
    }));
    modalCtrlSpy.create.and.returnValue(Promise.resolve(subModalSpy));

    component.items.at(0).patchValue({
      ingredientId: 10,
      quantiteCommandee: 1,
      prixUnitaireHt: 18.5
    });

    await component.openBarcodeScanner();

    expect(ingredientServiceSpy.getByBarcode).toHaveBeenCalledWith('3256220148521');
    expect(component.items.at(0).get('quantiteCommandee')?.value).toBe(2);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('openBarcodeScanner() displays warning toast if barcode not found', async () => {
    ingredientServiceSpy.getByBarcode.and.returnValue(throwError(() => new Error('Not found')));

    const subModalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onWillDismiss']);
    subModalSpy.present.and.returnValue(Promise.resolve());
    subModalSpy.onWillDismiss.and.returnValue(Promise.resolve({
      data: { barcode: '9999999999999', cancelled: false }
    }));
    modalCtrlSpy.create.and.returnValue(Promise.resolve(subModalSpy));

    await component.openBarcodeScanner();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'warning'
    }));
  });

  it('should initialize form with existing order when editing', () => {
    const editFixture = TestBed.createComponent(PurchaseOrderFormModalComponent);
    const editComp = editFixture.componentInstance;
    editComp.suppliers = mockSuppliers;
    editComp.ingredients = mockIngredients;
    editComp.order = {
      id: 99,
      numeroCommande: 'CMD-2026-099',
      supplierId: 2,
      supplierNom: 'Grossiste Boissons Rhône',
      dateLivraisonPrevue: '2026-09-30T00:00:00',
      status: 'DRAFT',
      totalHt: 100,
      totalTva: 20,
      totalTtc: 120,
      notes: 'Test edit draft',
      items: [
        { ingredientId: 10, quantiteCommandee: 4, prixUnitaireHt: 18.5, tauxTva: 20 }
      ]
    };
    editFixture.detectChanges();

    expect(editComp.isEditing).toBeTrue();
    expect(editComp.form.get('supplierId')?.value).toBe(2);
    expect(editComp.form.get('notes')?.value).toBe('Test edit draft');
    expect(editComp.items).toHaveSize(1);
    expect(editComp.items.at(0).get('quantiteCommandee')?.value).toBe(4);
  });

  describe('Custom Packaging & Pack Builder', () => {
    it('parseCustomText() accurately parses standard packs and units', () => {
      const p1 = component.parseCustomText('6x70cl', 'cl');
      expect(p1).toEqual({ pack: 6, size: 70, unit: 'cl' });

      const p2 = component.parseCustomText('Carton 6 x 75 cl', 'cl');
      expect(p2).toEqual({ pack: 6, size: 75, unit: 'cl' });

      const p3 = component.parseCustomText('12x33cl', 'cl');
      expect(p3).toEqual({ pack: 12, size: 33, unit: 'cl' });

      const p4 = component.parseCustomText('6x1L', 'cl');
      expect(p4).toEqual({ pack: 6, size: 1, unit: 'L' });

      const p5 = component.parseCustomText('10x1kg', 'g');
      expect(p5).toEqual({ pack: 10, size: 1, unit: 'kg' });

      const s1 = component.parseCustomText('75cl', 'cl');
      expect(s1).toEqual({ pack: 1, size: 75, unit: 'cl' });

      const s2 = component.parseCustomText('1.5L', 'cl');
      expect(s2).toEqual({ pack: 1, size: 1.5, unit: 'L' });

      expect(component.parseCustomText('', 'cl')).toBeNull();
      expect(component.parseCustomText('invalid_pack', 'cl')).toBeNull();
    });

    it('getConversionFactor() accurately handles volume and weight conversions', () => {
      expect(component.getConversionFactor('L', 'cl')).toBe(100);
      expect(component.getConversionFactor('ml', 'cl')).toBe(0.1);
      expect(component.getConversionFactor('cl', 'ml')).toBe(10);
      expect(component.getConversionFactor('kg', 'g')).toBe(1000);
      expect(component.getConversionFactor('g', 'kg')).toBe(0.001);
      expect(component.getConversionFactor('cl', 'cl')).toBe(1);
      expect(component.getConversionFactor('pièce', 'pièce')).toBe(1);
    });

    it('calculateCustomCapacity() converts packs with unit conversion into stock capacity', () => {
      // 6 bottles of 70 cl (recipe unit cl) = 420 cl
      expect(component.calculateCustomCapacity(6, 70, 'cl', 'cl')).toBe(420);

      // 6 bottles of 1 L (recipe unit cl) = 600 cl
      expect(component.calculateCustomCapacity(6, 1, 'L', 'cl')).toBe(600);

      // 10 bags of 1 kg (recipe unit g) = 10,000 g
      expect(component.calculateCustomCapacity(10, 1, 'kg', 'g')).toBe(10000);

      // 1 bottle of 75 cl (recipe unit cl) = 75 cl
      expect(component.calculateCustomCapacity(1, 75, 'cl', 'cl')).toBe(75);
    });

    it('formatCustomPurchaseUnit() generates clear format labels', () => {
      expect(component.formatCustomPurchaseUnit(6, 70, 'cl')).toBe('Carton 6x70cl');
      expect(component.formatCustomPurchaseUnit(12, 33, 'cl')).toBe('Carton 12x33cl');
      expect(component.formatCustomPurchaseUnit(1, 70, 'cl')).toBe('Bouteille 70cl');
      expect(component.formatCustomPurchaseUnit(1, 1, 'kg')).toBe('Paquet 1kg');
      expect(component.formatCustomPurchaseUnit(1, 10, 'pièces')).toBe('10 pièces');
    });

    it('applyCustomPackaging() patches line with capacity, unit name and price', () => {
      component.onIngredientSelected(0, 30); // Vodka: base price 0.30 €/cl
      component.applyCustomPackaging(0, 6, 70, 'cl');

      const line = component.items.at(0);
      expect(line.get('isCustom')?.value).toBeTrue();
      expect(line.get('purchaseUnit')?.value).toBe('Carton 6x70cl');
      expect(line.get('packagingCapacity')?.value).toBe(420);
      expect(line.get('prixUnitaireHt')?.value).toBe(126.0); // 420 * 0.30

      line.patchValue({ quantiteCommandee: 2 });
      const eq = component.getEquivalentStock(line);
      expect(eq.qty).toBe(840);
      expect(eq.unit).toBe('cl');
    });

    it('onQuickCustomInput() parses pack text and updates line reactively', () => {
      component.onIngredientSelected(0, 30);
      const mockEvent = {
        target: { value: '12x33cl' }
      } as unknown as Event;

      component.onQuickCustomInput(0, mockEvent);

      const line = component.items.at(0);
      expect(line.get('purchaseUnit')?.value).toBe('Carton 12x33cl');
      expect(line.get('packagingCapacity')?.value).toBe(396);
    });

    it('onCustomPackChange() updates pack count and recalculates capacity', () => {
      component.onIngredientSelected(0, 30);
      component.applyCustomPackaging(0, 6, 70, 'cl');

      const mockEvent = {
        target: { value: '12' }
      } as unknown as Event;

      component.onCustomPackChange(0, mockEvent);

      const line = component.items.at(0);
      expect(line.get('packagingCapacity')?.value).toBe(840);
      expect(line.get('purchaseUnit')?.value).toBe('Carton 12x70cl');
    });

    it('onCustomUnitChange() converts unit to recipe unit', () => {
      component.onIngredientSelected(0, 30); // Vodka: unit cl
      component.applyCustomPackaging(0, 6, 1, 'cl');

      const mockEvent = {
        target: { value: 'L' }
      } as unknown as Event;

      component.onCustomUnitChange(0, mockEvent);

      const line = component.items.at(0);
      expect(line.get('packagingCapacity')?.value).toBe(600); // 6 * 1L = 600 cl
      expect(line.get('purchaseUnit')?.value).toBe('Carton 6x1L');
    });

    it('isCustomPackaging() returns true when isCustom or custom unit is set', () => {
      const line = component.items.at(0);
      line.patchValue({ isCustom: false, purchaseUnit: 'Bouteille 70cl' });
      expect(component.isCustomPackaging(line)).toBeFalse();

      line.patchValue({ isCustom: true });
      expect(component.isCustomPackaging(line)).toBeTrue();

      line.patchValue({ isCustom: false, purchaseUnit: 'Format sur-mesure' });
      expect(component.isCustomPackaging(line)).toBeTrue();
    });
  });
});
