import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
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
    { id: 1, nom: 'Terrasse Principale', etage: 'TERRASSE' },
    { id: 2, nom: 'Bar Counter', etage: 'RDC' }
  ];

  const mockEtages: EtageBar[] = [
    { id: 1, code: 'RDC', nom: 'Ground Floor', ordre: 1 },
    { id: 2, code: 'TERRASSE', nom: 'Terrace / Outdoor', ordre: 2 }
  ];

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    zoneServiceSpy = jasmine.createSpyObj('ZoneService', ['getAll', 'create', 'update', 'delete']);
    zoneServiceSpy.getAll.and.returnValue(of(mockZones));
    zoneServiceSpy.create.and.returnValue(of({ id: 3, nom: 'VIP', etage: 'RDC' }));
    zoneServiceSpy.update.and.returnValue(of({ id: 1, nom: 'Terrace Modified', etage: 'TERRASSE' }));
    zoneServiceSpy.delete.and.returnValue(of(undefined));

    etageServiceSpy = jasmine.createSpyObj('EtageService', ['getAll', 'create', 'update', 'delete']);
    etageServiceSpy.getAll.and.returnValue(of(mockEtages));
    etageServiceSpy.create.and.returnValue(of({ id: 3, code: 'ROOFTOP', nom: 'Rooftop', ordre: 3 }));
    etageServiceSpy.update.and.returnValue(of({ id: 1, code: 'RDC', nom: 'Ground Floor Modified', ordre: 1 }));
    etageServiceSpy.delete.and.returnValue(of(undefined));

    const mockConfirmModal = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: { confirmed: true } }))
    };

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss', 'create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockConfirmModal as any));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [ZoneManagerComponent, IonicModule.forRoot(), ReactiveFormsModule, FormsModule, getTranslocoTestingModule()],
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
    expect(component.zones).toHaveSize(2);
    expect(component.etages).toHaveSize(2);
  });

  it('should format etage label and options correctly', () => {
    expect(component.getEtageLabel('TERRASSE')).toBe('Terrace / Outdoor');
    expect(component.getEtageLabel('UNKNOWN')).toBe('UNKNOWN');
    expect(component.etageOptions).toHaveSize(2);
    expect(component.etageOptions[0].value).toBe('RDC');
  });

  it('should filter zones by search query and floor filter', () => {
    expect(component.filteredZones).toHaveSize(2);

    component.searchQuery = 'Terrasse';
    expect(component.filteredZones).toHaveSize(1);
    expect(component.filteredZones[0].nom).toBe('Terrasse Principale');

    component.searchQuery = '';
    component.setFloorFilter('RDC');
    expect(component.filteredZones).toHaveSize(1);
    expect(component.filteredZones[0].nom).toBe('Bar Counter');
  });

  it('should filter and sort etages by search query and display order', () => {
    expect(component.filteredEtages).toHaveSize(2);

    component.searchQuery = 'Terrace';
    expect(component.filteredEtages).toHaveSize(1);
    expect(component.filteredEtages[0].code).toBe('TERRASSE');
  });

  it('should count zones associated with each etage', () => {
    expect(component.getZonesForEtage('TERRASSE')).toHaveSize(1);
    expect(component.getZonesForEtage('RDC')).toHaveSize(1);
    expect(component.getZonesForEtage('NON_EXISTENT')).toHaveSize(0);
  });

  it('should switch active tab and reset search query', () => {
    expect(component.activeTab).toBe('zones');
    component.searchQuery = 'test';

    component.onTabChange({ detail: { value: 'etages' } } as any);
    expect(component.activeTab).toBe('etages');
    expect(component.searchQuery).toBe('');
  });

  it('should open and save new zone', () => {
    component.toggleAddForm();
    expect(component.showAddForm).toBeTrue();

    component.zoneForm.setValue({ nom: 'Indoor Room', etage: 'RDC' });
    component.onSave();

    expect(zoneServiceSpy.create).toHaveBeenCalledWith({ nom: 'Indoor Room', etage: 'RDC' });
    expect(component.showAddForm).toBeFalse();
  });

  it('should open and edit existing zone', () => {
    component.onEdit(mockZones[0]);
    expect(component.editingZoneId).toBe(1);
    expect(component.showAddForm).toBeTrue();
    expect(component.zoneForm.value.nom).toBe('Terrasse Principale');

    component.zoneForm.setValue({ nom: 'Terrace Modified', etage: 'TERRASSE' });
    component.onSave();

    expect(zoneServiceSpy.update).toHaveBeenCalledWith(1, { nom: 'Terrace Modified', etage: 'TERRASSE' });
  });

  it('should open and save new etage', () => {
    component.toggleAddEtageForm();
    expect(component.showAddEtageForm).toBeTrue();

    component.etageForm.setValue({ nom: 'Rooftop', code: 'ROOFTOP', ordre: 3 });
    component.onSaveEtage();

    expect(etageServiceSpy.create).toHaveBeenCalledWith({ nom: 'Rooftop', code: 'ROOFTOP', ordre: 3 });
    expect(component.showAddEtageForm).toBeFalse();
  });

  it('should open and edit existing etage', () => {
    component.onEditEtage(mockEtages[0]);
    expect(component.editingEtageId).toBe(1);
    expect(component.showAddEtageForm).toBeTrue();
    expect(component.etageForm.value.code).toBe('RDC');

    component.etageForm.setValue({ nom: 'Ground Floor Modified', code: 'RDC', ordre: 1 });
    component.onSaveEtage();

    expect(etageServiceSpy.update).toHaveBeenCalledWith(1, { nom: 'Ground Floor Modified', code: 'RDC', ordre: 1 });
  });

  it('should handle error when saving zone fails', () => {
    zoneServiceSpy.create.and.returnValue(throwError(() => new Error('Creation failed')));
    component.toggleAddForm();
    component.zoneForm.setValue({ nom: 'Fail Zone', etage: 'RDC' });
    component.onSave();

    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should delete a zone after confirmation modal', fakeAsync(() => {
    component.onDelete(mockZones[0]);
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(zoneServiceSpy.delete).toHaveBeenCalledWith(1);
  }));

  it('should delete an etage after confirmation modal', fakeAsync(() => {
    component.onDeleteEtage(mockEtages[0]);
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(etageServiceSpy.delete).toHaveBeenCalledWith(1);
  }));

  it('should handle error when deleting etage fails', fakeAsync(() => {
    etageServiceSpy.delete.and.returnValue(throwError(() => new Error('Delete failed')));
    component.onDeleteEtage(mockEtages[0]);
    tick();

    expect(toastCtrlSpy.create).toHaveBeenCalled();
  }));

  it('should handle error when loading data fails', async () => {
    etageServiceSpy.getAll.and.returnValue(throwError(() => new Error('Load failed')));
    zoneServiceSpy.getAll.and.returnValue(throwError(() => new Error('Load failed')));

    component.loadData();
    await fixture.whenStable();

    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(component.isLoading).toBeFalse();
  });

  it('should not delete zone if id is undefined', fakeAsync(() => {
    const zoneWithoutId: ZoneBar = { nom: 'Sans ID', etage: 'RDC' };
    component.onDelete(zoneWithoutId);
    tick();
    expect(zoneServiceSpy.delete).not.toHaveBeenCalled();
  }));

  it('should not delete etage if id is undefined', fakeAsync(() => {
    const etageWithoutId: EtageBar = { code: 'SANS', nom: 'Sans ID', ordre: 99 };
    component.onDeleteEtage(etageWithoutId);
    tick();
    expect(etageServiceSpy.delete).not.toHaveBeenCalled();
  }));

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
