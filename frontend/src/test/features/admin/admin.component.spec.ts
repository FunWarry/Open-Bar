import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { AdminComponent } from '../../../app/features/admin/admin.component';
import { NavigationService } from '../../../app/core/services/navigation.service';
import { selectCurrentUser } from '../../../app/core/store/auth.selectors';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let storeSpy: jasmine.SpyObj<Store>;
  let navigationServiceSpy: jasmine.SpyObj<NavigationService>;

  const mockUser = {
    id: 1,
    username: 'admin',
    email: 'admin@bar.com',
    roles: ['ADMIN'],
    enabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01')
  };

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(mockUser));

    navigationServiceSpy = jasmine.createSpyObj('NavigationService', [
      'navigateTo',
      'goBack',
      'navigateToHome'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        AdminComponent,
        IonicModule.forRoot(),
        RouterTestingModule
      ],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: NavigationService, useValue: navigationServiceSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('currentUser$ should emit the current user from the store', (done) => {
    component.currentUser$.subscribe((user) => {
      expect(user).toEqual(mockUser as any);
      done();
    });
  });

  it('should select currentUser from store via selectCurrentUser selector', () => {
    expect(storeSpy.select as any).toHaveBeenCalledWith(selectCurrentUser);
  });

  it('navigationService should be accessible as a protected property', () => {
    expect((component as any).navigationService).toBe(navigationServiceSpy);
  });

  it('currentUser$ should emit null when no user is logged in', async () => {
    storeSpy.select.and.returnValue(of(null));

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        AdminComponent,
        IonicModule.forRoot(),
        RouterTestingModule
      ],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: NavigationService, useValue: navigationServiceSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    comp.currentUser$.subscribe((user) => {
      expect(user).toBeNull();
    });
  });

  it('ngOnInit should not throw', () => {
    expect(() => component.ngOnInit()).not.toThrow();
  });
});
