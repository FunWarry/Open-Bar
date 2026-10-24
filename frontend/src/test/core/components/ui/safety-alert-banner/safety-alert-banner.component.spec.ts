import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SafetyAlertBannerComponent } from '../../../../../app/core/components/ui/safety-alert-banner/safety-alert-banner.component';
import { SafetyAlertService } from '../../../../../app/core/services/safety-alert.service';
import { AuthService } from '../../../../../app/core/services/auth.service';
import { SafetyAlert } from '../../../../../app/core/models/safety-alert.model';

describe('SafetyAlertBannerComponent', () => {
  let component: SafetyAlertBannerComponent;
  let fixture: ComponentFixture<SafetyAlertBannerComponent>;
  let safetyAlertServiceMock: jasmine.SpyObj<SafetyAlertService> & { activeAlerts: any };
  let authServiceMock: jasmine.SpyObj<AuthService>;

  const mockAlert: SafetyAlert = {
    id: 101,
    tableId: 3,
    tableNumero: 7,
    type: 'ANGEL_SHOT_LIME',
    typeLabel: 'Citron',
    status: 'ACTIVE',
    comment: 'Individual being aggressive',
    createdAt: '2026-10-23T12:00:00'
  };

  beforeEach(async () => {
    safetyAlertServiceMock = jasmine.createSpyObj('SafetyAlertService', ['resolveAlert']);
    safetyAlertServiceMock.activeAlerts = signal<SafetyAlert[]>([]);
    safetyAlertServiceMock.resolveAlert.and.returnValue(of({ ...mockAlert, status: 'RESOLVED', resolvedBy: 'Max' }));

    authServiceMock = jasmine.createSpyObj('AuthService', ['getStoredUser']);
    authServiceMock.getStoredUser.and.returnValue({ username: 'Max' });

    await TestBed.configureTestingModule({
      imports: [
        SafetyAlertBannerComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'fr' }
        })
      ],
      providers: [
        { provide: SafetyAlertService, useValue: safetyAlertServiceMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SafetyAlertBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render nothing when activeAlerts is empty', () => {
    expect(component).toBeTruthy();
    expect(component.activeAlerts.length).toBe(0);

    const bannerElement = fixture.nativeElement.querySelector('.safety-alerts-wrapper');
    expect(bannerElement).toBeNull();
  });

  it('should render alert strip when activeAlerts contains an alert', () => {
    safetyAlertServiceMock.activeAlerts.set([mockAlert]);
    fixture.detectChanges();

    const bannerElement = fixture.nativeElement.querySelector('.safety-alerts-wrapper');
    expect(bannerElement).toBeTruthy();

    const tableTag = fixture.nativeElement.querySelector('.table-tag');
    expect(tableTag.textContent).toContain('7');
  });

  it('should resolve alert when resolve button is clicked', () => {
    safetyAlertServiceMock.activeAlerts.set([mockAlert]);
    fixture.detectChanges();

    component.resolveAlert(mockAlert);

    expect(safetyAlertServiceMock.resolveAlert).toHaveBeenCalledWith(101, 'Max');
  });

  it('should fallback to Staff as resolvedBy when authService has no stored user', () => {
    authServiceMock.getStoredUser.and.returnValue(null);

    component.resolveAlert(mockAlert);

    expect(safetyAlertServiceMock.resolveAlert).toHaveBeenCalledWith(101, 'Staff');
  });
});
