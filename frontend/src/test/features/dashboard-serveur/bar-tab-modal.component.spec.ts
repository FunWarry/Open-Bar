import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ModalController, ToastController, provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { BarTabModalComponent } from '../../../app/features/dashboard-serveur/components/bar-tab-modal/bar-tab-modal.component';
import { BarTabService } from '../../../app/core/services/bar-tab.service';
import { BarTab } from '../../../app/core/models/bar-tab.model';

import { TableService } from '../../../app/core/services/table.service';

describe('BarTabModalComponent', () => {
  let component: BarTabModalComponent;
  let fixture: ComponentFixture<BarTabModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let barTabServiceSpy: jasmine.SpyObj<BarTabService>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;

  const mockTab: BarTab = {
    id: 42,
    nom: 'VIP Dupont',
    clientReference: 'CB-1234',
    notes: 'Table habituelle',
    cautionMontant: 50,
    statut: 'ACTIVE',
    openedAt: '2026-09-18T20:00:00',
    total: 0,
    activeOrdersCount: 0,
    itemsCount: 0,
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    const toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    barTabServiceSpy = jasmine.createSpyObj('BarTabService', ['createTab', 'updateTab']);
    barTabServiceSpy.createTab.and.returnValue(of(mockTab));
    barTabServiceSpy.updateTab.and.returnValue(of(mockTab));

    tableServiceSpy = jasmine.createSpyObj('TableService', ['getAll']);
    tableServiceSpy.getAll.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        BarTabModalComponent,
        ReactiveFormsModule,
        CommonModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        provideIonicAngular(),
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: BarTabService, useValue: barTabServiceSpy },
        { provide: TableService, useValue: tableServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BarTabModalComponent);
    component = fixture.componentInstance;
  });

  it('should initialize form in creation mode with empty fields', () => {
    fixture.detectChanges();
    expect(component.tab).toBeUndefined();
    expect(component.form.get('nom')?.value).toBe('');
    expect(component.form.valid).toBeFalse();
  });

  it('should initialize form in edit mode with tab values', () => {
    component.tab = mockTab;
    fixture.detectChanges();
    expect(component.tab?.id).toBe(42);
    expect(component.form.get('nom')?.value).toBe('VIP Dupont');
    expect(component.form.get('clientReference')?.value).toBe('CB-1234');
    expect(component.form.get('cautionMontant')?.value).toBe(50);
    expect(component.form.get('notes')?.value).toBe('Table habituelle');
    expect(component.form.valid).toBeTrue();
  });

  it('should dismiss modal when dismiss() is called', () => {
    fixture.detectChanges();
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should create new tab and dismiss on submit in creation mode', fakeAsync(() => {
    fixture.detectChanges();
    component.form.patchValue({
      nom: 'VIP Dupont',
      clientReference: 'CB-1234',
      cautionMontant: 50,
      notes: 'Table habituelle',
    });

    component.onSubmit();
    tick();

    expect(barTabServiceSpy.createTab).toHaveBeenCalled();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(mockTab, 'confirm');
  }));

  it('should update tab and dismiss on submit in edit mode', fakeAsync(() => {
    component.tab = mockTab;
    fixture.detectChanges();
    component.form.patchValue({
      nom: 'VIP Dupont Modified',
    });

    component.onSubmit();
    tick();

    expect(barTabServiceSpy.updateTab).toHaveBeenCalled();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(mockTab, 'confirm');
  }));

  it('should switch location type between BAR and TABLE and update validators', () => {
    fixture.detectChanges();
    component.setLocationType('TABLE');
    expect(component.form.get('locationType')?.value).toBe('TABLE');
    expect(component.form.get('tableOriginaleId')?.validator).toBeDefined();

    component.setLocationType('BAR');
    expect(component.form.get('locationType')?.value).toBe('BAR');
    expect(component.form.get('tableOriginaleId')?.value).toBeNull();
  });

  it('should pass tableOriginaleId when submitting with TABLE location', fakeAsync(() => {
    fixture.detectChanges();
    component.setLocationType('TABLE');
    component.form.patchValue({
      nom: 'VIP Dupont Table',
      tableOriginaleId: 12,
    });

    component.onSubmit();
    tick();

    expect(barTabServiceSpy.createTab).toHaveBeenCalledWith(
      jasmine.objectContaining({
        nom: 'VIP Dupont Table',
        tableOriginaleId: 12,
      })
    );
  }));

  it('should display danger toast when createTab fails', fakeAsync(() => {
    barTabServiceSpy.createTab.and.returnValue(throwError(() => new Error('Creation failed')));
    fixture.detectChanges();
    component.form.patchValue({ nom: 'Test Error' });

    component.onSubmit();
    tick();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'danger' })
    );
    expect(component.isSubmitting).toBeFalse();
  }));

  it('should display danger toast when updateTab fails', fakeAsync(() => {
    barTabServiceSpy.updateTab.and.returnValue(throwError(() => new Error('Update failed')));
    component.tab = mockTab;
    fixture.detectChanges();
    component.form.patchValue({ nom: 'Test Error Update' });

    component.onSubmit();
    tick();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ color: 'danger' })
    );
    expect(component.isSubmitting).toBeFalse();
  }));
});

