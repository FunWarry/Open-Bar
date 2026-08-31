import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TableAssistanceBarComponent } from '../../../app/features/client/components/table-assistance-bar/table-assistance-bar.component';
import { TableAppelService } from '../../../app/core/services/table-appel.service';
import { ToastController } from '@ionic/angular/standalone';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { of, throwError } from 'rxjs';
import { TableAppel } from '../../../app/core/models/table-appel.model';

describe('TableAssistanceBarComponent', () => {
  let component: TableAssistanceBarComponent;
  let fixture: ComponentFixture<TableAssistanceBarComponent>;
  let tableAppelServiceSpy: jasmine.SpyObj<TableAppelService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let mockToast: { present: jasmine.Spy };

  const mockAppelResponse: TableAppel = {
    id: 1,
    tableId: 5,
    tableNumero: 5,
    type: 'ASSISTANCE',
    statut: 'EN_ATTENTE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(async () => {
    mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    tableAppelServiceSpy = jasmine.createSpyObj('TableAppelService', ['appelerServeur']);
    tableAppelServiceSpy.appelerServeur.and.returnValue(of(mockAppelResponse));

    await TestBed.configureTestingModule({
      imports: [
        TableAssistanceBarComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: TableAppelService, useValue: tableAppelServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TableAssistanceBarComponent);
    component = fixture.componentInstance;
    component.tableNumero = 5;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component.cooldownSeconds).toBe(0);
    expect(component.isCallingServer).toBeFalse();
  });

  it('should trigger waiter assistance call and start 60s cooldown timer', fakeAsync(() => {
    component.appelerServeur('ASSISTANCE');
    expect(tableAppelServiceSpy.appelerServeur).toHaveBeenCalledWith(5, 'ASSISTANCE');
    tick();

    expect(component.activeCallType).toBe('ASSISTANCE');
    expect(component.cooldownSeconds).toBe(60);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'success'
    }));

    // Advance 30 seconds
    tick(30000);
    expect(component.cooldownSeconds).toBe(30);

    // Advance remaining 30 seconds
    tick(30000);
    expect(component.cooldownSeconds).toBe(0);
    expect(component.activeCallType).toBeNull();
  }));

  it('should trigger bill request alert and start cooldown', fakeAsync(() => {
    tableAppelServiceSpy.appelerServeur.and.returnValue(of({
      ...mockAppelResponse,
      type: 'ADDITION'
    }));

    component.appelerServeur('ADDITION');
    expect(tableAppelServiceSpy.appelerServeur).toHaveBeenCalledWith(5, 'ADDITION');
    tick();

    expect(component.activeCallType).toBe('ADDITION');
    expect(component.cooldownSeconds).toBe(60);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'success'
    }));

    // Clean up timer
    tick(60000);
  }));

  it('should prevent calling server when cooldown is active or tableNumero is missing', () => {
    component.cooldownSeconds = 45;
    component.appelerServeur('ASSISTANCE');
    expect(tableAppelServiceSpy.appelerServeur).not.toHaveBeenCalled();

    component.cooldownSeconds = 0;
    component.tableNumero = 0;
    component.appelerServeur('ASSISTANCE');
    expect(tableAppelServiceSpy.appelerServeur).not.toHaveBeenCalled();
  });

  it('should display error toast on 400 cooldown or server error', fakeAsync(() => {
    tableAppelServiceSpy.appelerServeur.and.returnValue(throwError(() => ({ status: 400 })));

    component.appelerServeur('ASSISTANCE');
    tick();

    expect(component.isCallingServer).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger'
    }));
  }));

  it('should clean up interval timer on ngOnDestroy', fakeAsync(() => {
    component.appelerServeur('ASSISTANCE');
    tick();
    expect(component.cooldownSeconds).toBe(60);

    component.ngOnDestroy();
    tick(10000);
    // Timer was stopped so countdown stops
    expect(component.cooldownSeconds).toBe(60);
  }));
});
