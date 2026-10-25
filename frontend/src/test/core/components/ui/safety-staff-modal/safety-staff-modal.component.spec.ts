import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SafetyStaffModalComponent } from '../../../../../app/core/components/ui/safety-staff-modal/safety-staff-modal.component';
import { SafetyAlertService } from '../../../../../app/core/services/safety-alert.service';
import { TableService } from '../../../../../app/core/services/table.service';
import { TableBar } from '../../../../../app/core/models/table.model';
import { SafetyAlert } from '../../../../../app/core/models/safety-alert.model';

describe('SafetyStaffModalComponent', () => {
  let component: SafetyStaffModalComponent;
  let fixture: ComponentFixture<SafetyStaffModalComponent>;
  let safetyAlertServiceMock: jasmine.SpyObj<SafetyAlertService>;
  let tableServiceMock: jasmine.SpyObj<TableService>;

  const mockTables: TableBar[] = [
    { id: 1, numero: 5, emplacement: 'Window Booth', capacite: 4, zone: 'Main', occupee: true, createdAt: '', updatedAt: '' } as unknown as TableBar,
    { id: 2, numero: 12, emplacement: 'Counter 2', capacite: 2, zone: 'Bar', occupee: true, createdAt: '', updatedAt: '' } as unknown as TableBar,
  ];

  const mockCreatedAlert: SafetyAlert = {
    id: 42,
    tableId: 1,
    tableNumero: 5,
    type: 'ANGEL_SHOT_NEAT',
    typeLabel: 'Direct',
    status: 'ACTIVE',
    comment: 'Patron requested escort',
    createdAt: '2026-10-23T14:00:00',
  };

  beforeEach(async () => {
    safetyAlertServiceMock = jasmine.createSpyObj('SafetyAlertService', ['triggerStaffAlert']);
    safetyAlertServiceMock.triggerStaffAlert.and.returnValue(of(mockCreatedAlert));

    tableServiceMock = jasmine.createSpyObj('TableService', ['getAll']);
    tableServiceMock.getAll.and.returnValue(of(mockTables));

    await TestBed.configureTestingModule({
      imports: [
        SafetyStaffModalComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'fr' },
        }),
      ],
      providers: [
        { provide: SafetyAlertService, useValue: safetyAlertServiceMock },
        { provide: TableService, useValue: tableServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SafetyStaffModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and populate tables on init', () => {
    expect(component).toBeTruthy();
    expect(tableServiceMock.getAll).toHaveBeenCalled();
    expect(component.tableOptions).toHaveSize(2);
    expect(component.selectedTableId).toBe(1);
    expect(component.activeTab).toBe('memo');
  });

  it('should switch active tab and variant', () => {
    component.activeTab = 'trigger';
    expect(component.activeTab).toBe('trigger');

    component.selectVariant('ANGEL_SHOT_LIME');
    expect(component.selectedVariant).toBe('ANGEL_SHOT_LIME');
  });

  it('should dispatch alert successfully with selected table and variant', () => {
    component.selectedTableId = 1;
    component.selectedVariant = 'ANGEL_SHOT_ICE';
    component.note = 'Patron needs a cab called immediately';

    component.dispatchAlert();

    expect(safetyAlertServiceMock.triggerStaffAlert).toHaveBeenCalledWith(
      1,
      'ANGEL_SHOT_ICE',
      'Patron needs a cab called immediately'
    );
    expect(component.isSuccess()).toBeTrue();
    expect(component.isSubmitting()).toBeFalse();
    expect(component.errorMessage()).toBeNull();
  });

  it('should handle dispatch error gracefully', () => {
    safetyAlertServiceMock.triggerStaffAlert.and.returnValue(
      throwError(() => ({ error: { message: 'Network dispatch failure' } }))
    );

    component.selectedTableId = 2;
    component.dispatchAlert();

    expect(component.isSubmitting()).toBeFalse();
    expect(component.isSuccess()).toBeFalse();
    expect(component.errorMessage()).toBe('Network dispatch failure');
  });

  it('should validate table selection before dispatching', () => {
    component.selectedTableId = null;
    component.dispatchAlert();

    expect(safetyAlertServiceMock.triggerStaffAlert).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBeTruthy();
  });

  it('should emit modalClosed when dismissed', () => {
    spyOn(component.modalClosed, 'emit');
    component.dismiss();
    expect(component.modalClosed.emit).toHaveBeenCalled();
  });

  it('should load emergency numbers on init', () => {
    expect(component.emergencyNumbers.length).toBeGreaterThan(0);
    expect(component.emergencyNumbers.some(e => e.number === '17')).toBeTrue();
  });
});
