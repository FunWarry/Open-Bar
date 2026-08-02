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
    expect(component.zones.length).toBe(1);
    expect(component.etages.length).toBe(2);
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

  it('should open and save new etage', () => {
    component.toggleAddEtageForm();
    expect(component.showAddEtageForm).toBeTrue();

    component.etageForm.setValue({ nom: 'Rooftop', code: 'ROOFTOP', ordre: 3 });
    component.onSaveEtage();

    expect(etageServiceSpy.create).toHaveBeenCalledWith({ nom: 'Rooftop', code: 'ROOFTOP', ordre: 3 });
  });

  it('should delete a zone', () => {
    component.onDelete(mockZones[0]);
    expect(zoneServiceSpy.delete).toHaveBeenCalledWith(1);
  });

  it('should delete an etage', () => {
    component.onDeleteEtage(mockEtages[0]);
    expect(etageServiceSpy.delete).toHaveBeenCalledWith(1);
  });

  it('should dismiss modal on close', () => {
    component.onClose();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });
});
