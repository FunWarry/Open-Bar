import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { ZoneManagerComponent } from '../../../app/features/tables/zone-manager/zone-manager.component';
import { ZoneService, ZoneBar } from '../../../app/core/services/zone.service';
import { EtageService, EtageBar } from '../../../app/core/services/etage.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('ZoneManagerComponent', () => {
  let component: ZoneManagerComponent;
  let fixture: ComponentFixture<ZoneManagerComponent>;
  let zoneServiceSpy: jasmine.SpyObj<ZoneService>;
  let etageServiceSpy: jasmine.SpyObj<EtageService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const mockZones: ZoneBar[] = [
    { id: 1, nom: 'Terrasse Principale', etage: 'TERRASSE' }
  ];

  const mockEtages: EtageBar[] = [
    { id: 1, code: 'RDC', nom: 'Rez-de-chaussée', ordre: 1 },
    { id: 2, code: 'TERRASSE', nom: 'Terrasse / Extérieur', ordre: 2 }
  ];

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    zoneServiceSpy = jasmine.createSpyObj('ZoneService', ['getAll', 'create', 'update', 'delete']);
    zoneServiceSpy.getAll.and.returnValue(of(mockZones));
    zoneServiceSpy.create.and.returnValue(of({ id: 2, nom: 'VIP', etage: 'RDC' }));
    zoneServiceSpy.update.and.returnValue(of({ id: 1, nom: 'Terrasse Modifiée', etage: 'TERRASSE' }));
    zoneServiceSpy.delete.and.returnValue(of(undefined));

    etageServiceSpy = jasmine.createSpyObj('EtageService', ['getAll', 'create', 'update', 'delete']);
    etageServiceSpy.getAll.and.returnValue(of(mockEtages));
    etageServiceSpy.create.and.returnValue(of({ id: 3, code: 'ROOFTOP', nom: 'Rooftop', ordre: 3 }));
    etageServiceSpy.update.and.returnValue(of({ id: 1, code: 'RDC', nom: 'Rez-de-chaussée Modifié', ordre: 1 }));
    etageServiceSpy.delete.and.returnValue(of(undefined));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [ZoneManagerComponent, IonicModule.forRoot(), ReactiveFormsModule, getTranslocoTestingModule()],
      providers: [
        { provide: ZoneService, useValue: zoneServiceSpy },
        { provide: EtageService, useValue: etageServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ZoneManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load initial zones and etages', () => {
    expect(component).toBeTruthy();
    expect(zoneServiceSpy.getAll).toHaveBeenCalled();
    expect(etageServiceSpy.getAll).toHaveBeenCalled();
    expect(component.zones).toHaveSize(1);
    expect(component.etages).toHaveSize(2);
  });

  it('should format etage label correctly', () => {
    expect(component.getEtageLabel('TERRASSE')).toBe('Terrasse / Extérieur');
    expect(component.getEtageLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('should switch active tab', () => {
    expect(component.activeTab).toBe('zones');
    component.onTabChange({ detail: { value: 'etages' } } as any);
    expect(component.activeTab).toBe('etages');
  });

  it('should open and save new zone', () => {
    component.toggleAddForm();
    expect(component.showAddForm).toBeTrue();

    component.zoneForm.setValue({ nom: 'Salle Intérieure', etage: 'RDC' });
    component.onSave();

    expect(zoneServiceSpy.create).toHaveBeenCalledWith({ nom: 'Salle Intérieure', etage: 'RDC' });
  });

  it('should open and edit existing zone', () => {
    component.onEdit(mockZones[0]);
    expect(component.editingZoneId).toBe(1);
    expect(component.zoneForm.value.nom).toBe('Terrasse Principale');

    component.zoneForm.setValue({ nom: 'Terrasse Modifiée', etage: 'TERRASSE' });
    component.onSave();

    expect(zoneServiceSpy.update).toHaveBeenCalledWith(1, { nom: 'Terrasse Modifiée', etage: 'TERRASSE' });
  });

  it('should open and save new etage', () => {
    component.toggleAddEtageForm();
    expect(component.showAddEtageForm).toBeTrue();

    component.etageForm.setValue({ nom: 'Rooftop', code: 'ROOFTOP', ordre: 3 });
    component.onSaveEtage();

    expect(etageServiceSpy.create).toHaveBeenCalledWith({ nom: 'Rooftop', code: 'ROOFTOP', ordre: 3 });
  });

  it('should open and edit existing etage', () => {
    component.onEditEtage(mockEtages[0]);
    expect(component.editingEtageId).toBe(1);
    expect(component.etageForm.value.code).toBe('RDC');

    component.etageForm.setValue({ nom: 'Rez-de-chaussée Modifié', code: 'RDC', ordre: 1 });
    component.onSaveEtage();

    expect(etageServiceSpy.update).toHaveBeenCalledWith(1, { nom: 'Rez-de-chaussée Modifié', code: 'RDC', ordre: 1 });
  });

  it('should handle error when saving zone fails', () => {
    zoneServiceSpy.create.and.returnValue(throwError(() => new Error('Creation failed')));
    component.toggleAddForm();
    component.zoneForm.setValue({ nom: 'Fail Zone', etage: 'RDC' });
    component.onSave();

    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should handle error when deleting etage fails', () => {
    etageServiceSpy.delete.and.returnValue(throwError(() => new Error('Delete failed')));
    component.onDeleteEtage(mockEtages[0]);

    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should delete a zone', () => {
    component.onDelete(mockZones[0]);
    expect(zoneServiceSpy.delete).toHaveBeenCalledWith(1);
  });

  it('should delete an etage', () => {
    component.onDeleteEtage(mockEtages[0]);
    expect(etageServiceSpy.delete).toHaveBeenCalledWith(1);
  });


  it('should handle error when loading data fails', async () => {
    etageServiceSpy.getAll.and.returnValue(throwError(() => new Error('Load failed')));
    zoneServiceSpy.getAll.and.returnValue(throwError(() => new Error('Load failed')));

    component.loadData();
    await fixture.whenStable();

    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(component.isLoading).toBeFalse();
  });

  it('should not delete zone if id is undefined', () => {
    const zoneWithoutId: ZoneBar = { nom: 'Sans ID', etage: 'RDC' };
    component.onDelete(zoneWithoutId);
    expect(zoneServiceSpy.delete).not.toHaveBeenCalled();
  });

  it('should not delete etage if id is undefined', () => {
    const etageWithoutId: EtageBar = { code: 'SANS', nom: 'Sans ID', ordre: 99 };
    component.onDeleteEtage(etageWithoutId);
    expect(etageServiceSpy.delete).not.toHaveBeenCalled();
  });

  it('should handle error when saving etage fails', () => {
    etageServiceSpy.create.and.returnValue(throwError(() => ({ error: { message: 'Conflict' } })));
    component.toggleAddEtageForm();
    component.etageForm.setValue({ nom: 'Fail Etage', code: 'FAIL', ordre: 5 });
    component.onSaveEtage();

    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should dismiss modal on close', () => {
    component.onClose();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });
});
