import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';
import { ConfirmDeleteModalComponent } from '../../../../app/core/components/ui/confirm-delete-modal/confirm-delete-modal.component';

describe('ConfirmDeleteModalComponent', () => {
  let component: ConfirmDeleteModalComponent;
  let fixture: ComponentFixture<ConfirmDeleteModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [
        ConfirmDeleteModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    component = fixture.componentInstance;
    component.title = 'Supprimer la Table 999';
    component.itemName = 'Table 999';
    component.metaTags = [{ icon: 'restaurant-outline', text: 'Table 999' }];
    component.detailsSummary = [{ label: 'Zone', value: 'Terrasse' }];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onCancel() dismisses modal with confirmed: false', async () => {
    await component.onCancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ confirmed: false });
  });

  it('onConfirm() dismisses modal with confirmed: true when not blocked', async () => {
    await component.onConfirm();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ confirmed: true });
  });

  it('onConfirm() does not dismiss when cannotDeleteReason is present', async () => {
    component.cannotDeleteReason = 'Active orders exist';
    await component.onConfirm();
    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
  });

  it('onConfirm() does not dismiss when isDeleting is true', async () => {
    component.isDeleting = true;
    await component.onConfirm();
    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
  });
});
