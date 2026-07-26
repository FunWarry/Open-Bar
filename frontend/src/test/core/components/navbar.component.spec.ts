import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NavbarComponent } from '../../../app/core/components/navbar/navbar.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MemoizedSelector } from '@ngrx/store';
import {
  selectIsAuthenticated,
  selectIsAdmin,
  selectCurrentUser
} from '../../../app/core/store/auth.selectors';
import * as AuthActions from '../../../app/core/store/auth.actions';
import { NavigationService } from '../../../app/core/services/navigation.service';
import { NotificationService } from '../../../app/core/services/notification.service';
import { IonicModule } from '@ionic/angular';
import { PopoverController } from '@ionic/angular/standalone';
import { EMPTY, of } from 'rxjs';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let store: MockStore;
  let mockNavigationService: jasmine.SpyObj<NavigationService>;

  let mockSelectIsAuthenticated: MemoizedSelector<any, boolean>;
  let mockSelectIsAdmin: MemoizedSelector<any, boolean>;
  let mockSelectCurrentUser: MemoizedSelector<any, any>;

  const initialState = {
    auth: {
      token: null,
      user: null,
      error: null
    }
  };

  beforeEach(async () => {
    mockNavigationService = jasmine.createSpyObj('NavigationService', [
      'navigateToHome',
      'navigateToLogin',
      'navigateToAdmin',
      'navigateToUserProfile'
    ]);

    const mockNotifService = jasmine.createSpyObj('NotificationService', ['onNotification', 'onStockAlert', 'getNonLues', 'getHistory', 'marquerLue', 'marquerToutLu']);
    mockNotifService.onNotification.and.returnValue(of());
    mockNotifService.onStockAlert.and.returnValue(EMPTY);
    mockNotifService.getNonLues.and.returnValue(0);

    const mockPopoverCtrl = jasmine.createSpyObj('PopoverController', ['create']);

    await TestBed.configureTestingModule({
      imports: [NavbarComponent, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        provideMockStore({ initialState }),
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: NotificationService, useValue: mockNotifService },
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

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });

  it('isAuthenticated$ émet false quand le store retourne non authentifié', (done) => {
    mockSelectIsAuthenticated.setResult(false);
    store.refreshState();

    component.isAuthenticated$.subscribe(val => {
      expect(val).toBeFalse();
      done();
    });
  });

  it('isAuthenticated$ émet true quand un token est présent dans le store', (done) => {
    mockSelectIsAuthenticated.setResult(true);
    store.refreshState();

    component.isAuthenticated$.subscribe(val => {
      expect(val).toBeTrue();
      done();
    });
  });

  it('isAdmin$ émet false pour un utilisateur non admin', (done) => {
    mockSelectIsAdmin.setResult(false);
    store.refreshState();

    component.isAdmin$.subscribe(val => {
      expect(val).toBeFalse();
      done();
    });
  });

  it('isAdmin$ émet true pour un utilisateur avec rôle ADMIN', (done) => {
    mockSelectIsAdmin.setResult(true);
    store.refreshState();

    component.isAdmin$.subscribe(val => {
      expect(val).toBeTrue();
      done();
    });
  });

  it('currentUser$ émet null quand aucun utilisateur dans le store', (done) => {
    mockSelectCurrentUser.setResult(null);
    store.refreshState();

    component.currentUser$.subscribe(val => {
      expect(val).toBeNull();
      done();
    });
  });

  it('currentUser$ émet les données utilisateur quand connecté', (done) => {
    const user = { id: 1, email: 'test@bar.com', roles: ['SERVEUR'] };
    mockSelectCurrentUser.setResult(user);
    store.refreshState();

    component.currentUser$.subscribe(val => {
      expect(val).toEqual(user);
      done();
    });
  });

  it('nonLues est 0 par défaut', () => {
    expect(component.nonLues).toBe(0);
  });

  it('onLogout() dispatche l\'action AuthActions.logout', () => {
    const dispatchSpy = spyOn(store, 'dispatch');

    component.onLogout();

    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.logout());
  });

  it('onLogout() dispatche exactement une action', () => {
    const dispatchSpy = spyOn(store, 'dispatch');

    component.onLogout();

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it('shouldShowNavbar$ émet false si l\'utilisateur n\'est pas authentifié', (done) => {
    mockSelectIsAuthenticated.setResult(false);
    store.refreshState();

    component.shouldShowNavbar$.subscribe(show => {
      expect(show).toBeFalse();
      done();
    });
  });

  it('shouldShowNavbar$ émet true si l\'utilisateur est authentifié sur une page hors auth/setup', (done) => {
    store.overrideSelector(selectIsAuthenticated, true);
    store.refreshState();

    component.shouldShowNavbar$.subscribe(show => {
      expect(show).toBeTrue();
      done();
    });
  });
});
