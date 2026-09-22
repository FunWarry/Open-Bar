import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { SupplierFormModalComponent } from '../../../app/features/purchases/supplier-form-modal/supplier-form-modal.component';
import { Supplier } from '../../../app/core/models/supplier.model';

describe('SupplierFormModalComponent', () => {
  let component: SupplierFormModalComponent;
  let fixture: ComponentFixture<SupplierFormModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockSupplier: Supplier = {
    id: 1,
    nom: 'Brasserie du Mont-Blanc',
    contactNom: 'Sylvain Favre',
    email: 'contact@montblanc.fr',
    telephone: '+33 4 50 00 00 00',
    adresse: '125 Rue des Brasseurs',
    codePostal: '74000',
    ville: 'Annecy',
    siret: '43920192800025',
    notes: 'Preferred craft beer supplier',
    actif: true
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    await TestBed.configureTestingModule({
      imports: [
        SupplierFormModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierFormModalComponent);
    component = fixture.componentInstance;
  });

  it('creates the component and initializes empty form by default', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.form).toBeDefined();
    expect(component.form.get('nom')?.value).toBe('');
    expect(component.form.get('actif')?.value).toBeTrue();
    expect(component.form.valid).toBeFalse();
  });

  it('initializes form with existing supplier values when editing', () => {
    component.supplier = mockSupplier;
    fixture.detectChanges();

    expect(component.form.get('nom')?.value).toBe('Brasserie du Mont-Blanc');
    expect(component.form.get('contactNom')?.value).toBe('Sylvain Favre');
    expect(component.form.get('email')?.value).toBe('contact@montblanc.fr');
    expect(component.form.get('ville')?.value).toBe('Annecy');
    expect(component.form.get('actif')?.value).toBeTrue();
    expect(component.form.valid).toBeTrue();
  });

  it('marks all fields as touched and prevents submission when form is invalid', () => {
    fixture.detectChanges();
    component.form.get('nom')?.setValue('');

    component.onSubmit();

    expect(component.form.touched).toBeTrue();
    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
  });

  it('submits valid payload and dismisses modal with confirmed true', () => {
    fixture.detectChanges();
    component.form.patchValue({
      nom: 'Distillerie des Alpes',
      contactNom: 'Marc Veyrat',
      email: 'marc@alpes.fr',
      telephone: '+33 4 79 00 00 00',
      ville: 'Chambéry',
      actif: true
    });

    component.onSubmit();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      supplier: jasmine.objectContaining({
        nom: 'Distillerie des Alpes',
        contactNom: 'Marc Veyrat',
        email: 'marc@alpes.fr'
      }),
      confirmed: true
    });
  });

  it('dismisses modal with confirmed false on cancel', () => {
    fixture.detectChanges();
    component.onCancel();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ confirmed: false });
  });
});
