import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NavbarComponent } from '../../../app/core/components/navbar/navbar.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MemoizedSelector } from '@ngrx/store';
import {
  selectIsAuthenticated,
  selectIsAdmin,
  selectCurrentUser,
} from '../../../app/core/store/auth.selectors';
import * as AuthActions from '../../../app/core/store/auth.actions';
import { NavigationService } from '../../../app/core/services/navigation.service';
import { NotificationService } from '../../../app/core/services/notification.service';
import { IonicModule } from '@ionic/angular';
import { PopoverController } from '@ionic/angular/standalone';
import { EMPTY, of } from 'rxjs';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TranslocoService } from '@jsverse/transloco';
import { SoundService } from '../../../app/core/services/sound.service';
import { User } from '../../../app/core/models/user.model';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let store: MockStore;
  let mockNavigationService: jasmine.SpyObj<NavigationService>;

  let mockSelectIsAuthenticated: MemoizedSelector<any, boolean>;
  let mockSelectIsAdmin: MemoizedSelector<any, boolean>;
  let mockSelectCurrentUser: MemoizedSelector<any, any>;

  const initialState = {
    auth: { token: null, user: null, error: null },
  };

  const mockAdminUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@bar.com',
    roles: ['ADMIN'],
    enabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    mockNavigationService = jasmine.createSpyObj('NavigationService', [
      'navigateToHome',
      'navigateToLogin',
      'navigateToAdmin',
      'navigateToUserProfile',
    ]);

    const mockNotifService = jasmine.createSpyObj('NotificationService', [
      'onNotification', 'onStockAlert', 'getNonLues', 'getHistory', 'marquerLue', 'marquerToutLu',
    ]);
    mockNotifService.onNotification.and.returnValue(of());
    mockNotifService.onStockAlert.and.returnValue(EMPTY);
    mockNotifService.getNonLues.and.returnValue(0);

    const mockSoundService = jasmine.createSpyObj('SoundService', ['toggleSound', 'isSoundEnabled']);
    mockSoundService.isSoundEnabled.and.returnValue(true);

    const mockPopoverCtrl = jasmine.createSpyObj('PopoverController', ['create']);

    await TestBed.configureTestingModule({
      imports: [
        NavbarComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        provideMockStore({ initialState }),
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: NotificationService, useValue: mockNotifService },
        { provide: SoundService, useValue: mockSoundService },
        { provide: PopoverController, useValue: mockPopoverCtrl },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);

    mockSelectIsAuthenticated = store.overrideSelector(selectIsAuthenticated, false);
    mockSelectIsAdmin = store.overrideSelector(selectIsAdmin, false);
    mockSelectCurrentUser = store.overrideSelector(selectCurrentUser, null);

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('isAdmin$ should emit false when store returns non-admin', (done) => {
    mockSelectIsAdmin.setResult(false);
    store.refreshState();

    component.isAdmin$.subscribe(val => {
      expect(val).toBeFalse();
      done();
    });
  });

  it('isAdmin$ should emit true for user with ADMIN role', (done) => {
    mockSelectIsAdmin.setResult(true);
    store.refreshState();

    component.isAdmin$.subscribe(val => {
      expect(val).toBeTrue();
      done();
    });
  });

  it('currentUser$ should emit null when no user is in the store', (done) => {
    mockSelectCurrentUser.setResult(null);
    store.refreshState();

    component.currentUser$.subscribe(val => {
      expect(val).toBeNull();
      done();
    });
  });

  it('currentUser$ should emit user data when logged in', (done) => {
    mockSelectCurrentUser.setResult(mockAdminUser);
    store.refreshState();

    component.currentUser$.subscribe(val => {
      expect(val).toEqual(mockAdminUser);
      done();
    });
  });

  it('nonLues should default to 0', () => {
    expect(component.nonLues).toBe(0);
  });

  it('onLogout() should dispatch AuthActions.logout', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onLogout();
    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.logout());
  });

  it('onLogout() should dispatch exactly one action', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onLogout();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it('shouldShowNavbar$ should emit false when user is not authenticated', (done) => {
    mockSelectIsAuthenticated.setResult(false);
    store.refreshState();

    component.shouldShowNavbar$.subscribe(show => {
      expect(show).toBeFalse();
      done();
    });
  });

  it('shouldShowNavbar$ should emit true when authenticated on a non-auth route', (done) => {
    store.overrideSelector(selectIsAuthenticated, true);
    store.refreshState();

    component.shouldShowNavbar$.subscribe(show => {
      expect(show).toBeTrue();
      done();
    });
  });

  it('toggleSound() should call soundService.toggleSound()', () => {
    component.toggleSound();
    expect(component.soundService.toggleSound).toHaveBeenCalled();
  });

  // --- New tests for #208 features ---

  describe('getPrimaryRole()', () => {
    it('should return ADMIN when user has ADMIN role', () => {
      expect(component.getPrimaryRole(mockAdminUser)).toBe('ADMIN');
    });

    it('should return MANAGER when user has MANAGER role', () => {
      const user: User = { ...mockAdminUser, roles: ['MANAGER'] };
      expect(component.getPrimaryRole(user)).toBe('MANAGER');
    });

    it('should return BARMAN when user has BARMAN role', () => {
      const user: User = { ...mockAdminUser, roles: ['BARMAN'] };
      expect(component.getPrimaryRole(user)).toBe('BARMAN');
    });

    it('should return SERVEUR when user has SERVEUR role', () => {
      const user: User = { ...mockAdminUser, roles: ['SERVEUR'] };
      expect(component.getPrimaryRole(user)).toBe('SERVEUR');
    });

    it('should prefer ADMIN over other roles when user has multiple roles', () => {
      const user: User = { ...mockAdminUser, roles: ['SERVEUR', 'ADMIN'] };
      expect(component.getPrimaryRole(user)).toBe('ADMIN');
    });

    it('should return empty string when user is null', () => {
      expect(component.getPrimaryRole(null)).toBe('');
    });

    it('should return empty string when user has no roles', () => {
      const user: User = { ...mockAdminUser, roles: [] };
      expect(component.getPrimaryRole(user)).toBe('');
    });
  });

  describe('getRoleBadgeColor()', () => {
    it('should return the Figma purple color for ADMIN role', () => {
      expect(component.getRoleBadgeColor('ADMIN')).toBe('#9b8af2');
    });

    it('should return the Figma orange color for MANAGER role', () => {
      expect(component.getRoleBadgeColor('MANAGER')).toBe('#f0a33b');
    });

    it('should return the Figma green color for SERVEUR role', () => {
      expect(component.getRoleBadgeColor('SERVEUR')).toBe('#34c77b');
    });

    it('should return the Figma cyan color for BARMAN role', () => {
      expect(component.getRoleBadgeColor('BARMAN')).toBe('#4fc3f7');
    });

    it('should return the default text color for an unknown role', () => {
      expect(component.getRoleBadgeColor('UNKNOWN')).toBe('#eceefb');
    });
  });

  describe('localTime signal', () => {
    it('should contain a formatted time string in HH:mm format', () => {
      const time = component.localTime();
      expect(time).toMatch(/^\d{1,2}:\d{2}$/);
    });
  });

  describe('pageTitleKey$', () => {
    it('should emit a translation key string for an authenticated route', (done) => {
      component.pageTitleKey$.subscribe(key => {
        expect(typeof key).toBe('string');
        expect(key).toContain('NAV.TOPBAR.PAGE_TITLES');
        done();
      });
    });
  });
});
