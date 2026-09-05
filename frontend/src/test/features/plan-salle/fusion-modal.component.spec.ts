import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
import { FusionModalComponent } from '../../../app/features/plan-salle/components/fusion-modal/fusion-modal.component';
import { TableBar } from '../../../app/core/models/table.model';

describe('FusionModalComponent', () => {
  let component: FusionModalComponent;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    await TestBed.configureTestingModule({
      imports: [FusionModalComponent, CommonModule, getTranslocoTestingModule()],
      providers: [{ provide: ModalController, useValue: modalCtrlSpy }],
    }).compileComponents();

    const fixture = TestBed.createComponent(FusionModalComponent);
    component = fixture.componentInstance;
    component.sourceTable = { id: 1, numero: 2, capacite: 2, occupee: true, zone: 'INTERIEUR', createdAt: '', updatedAt: '' };
    component.targetTable = { id: 2, numero: 3, capacite: 4, occupee: true, zone: 'INTERIEUR', createdAt: '', updatedAt: '' };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('cancel() calls modalCtrl.dismiss with cancel role', () => {
    component.cancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('confirm() calls modalCtrl.dismiss with confirmed: true', () => {
    component.confirm();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ confirmed: true }, 'confirm');
  });
});
