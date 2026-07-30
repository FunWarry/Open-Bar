import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MemoizedSelector } from '@ngrx/store';
import { IonicModule } from '@ionic/angular';
import { SidebarComponent } from '../../../app/core/components/sidebar/sidebar.component';
import { selectCurrentUser } from '../../../app/core/store/auth.selectors';
import * as AuthActions from '../../../app/core/store/auth.actions';
import { User } from '../../../app/core/models/user.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { NavigationService } from '../../../app/core/services/navigation.service';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let store: MockStore;
  let mockSelectCurrentUser: MemoizedSelector<any, User | null>;
  let mockNavigationService: jasmine.SpyObj<NavigationService>;

  const initialState = {
    auth: { token: 'mock-jwt-token', user: null, error: null },
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

  const mockServeurUser: User = {
    id: 2,
    username: 'john_serveur',
    email: 'john@bar.com',
    roles: ['SERVEUR'],
    enabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockBarmanUser: User = {
    id: 3,
    username: 'alex_barman',
    email: 'alex@bar.com',
    roles: ['BARMAN'],
    enabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    mockNavigationService = jasmine.createSpyObj('NavigationService', [
      'navigateToHome', 'navigateToLogin', 'navigateToAdmin', 'navigateToUserProfile'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        SidebarComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        provideMockStore({ initialState }),
        { provide: NavigationService, useValue: mockNavigationService },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    mockSelectCurrentUser = store.overrideSelector(selectCurrentUser, mockAdminUser);

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create the SidebarComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should start with isCollapsed set to false', () => {
    expect(component.isCollapsed()).toBeFalse();
  });

  it('toggleCollapse() should invert isCollapsed signal value', () => {
    component.toggleCollapse();
    expect(component.isCollapsed()).toBeTrue();

    component.toggleCollapse();
    expect(component.isCollapsed()).toBeFalse();
  });

  describe('getUserInitial()', () => {
    it('should return uppercase first letter of username', () => {
      expect(component.getUserInitial(mockAdminUser)).toBe('A');
      expect(component.getUserInitial(mockServeurUser)).toBe('J');
    });

    it('should return fallback U when user or username is missing', () => {
      expect(component.getUserInitial(null)).toBe('U');
      expect(component.getUserInitial({ ...mockAdminUser, username: '' })).toBe('U');
    });
  });

  describe('getRoleColor()', () => {
    it('should return correct Figma hex color per primary role', () => {
      expect(component.getRoleColor(mockAdminUser)).toBe('#9b8af2');
      expect(component.getRoleColor(mockServeurUser)).toBe('#34c77b');
      expect(component.getRoleColor(mockBarmanUser)).toBe('#4fc3f7');
    });

    it('should return default Admin purple color for unknown role or null', () => {
      expect(component.getRoleColor(null)).toBe('#9b8af2');
    });
  });

  describe('getNavItemsForUser()', () => {
    it('should return all main section items accessible to ADMIN', () => {
      const mainItems = component.getNavItemsForUser(mockAdminUser, 'main');
      expect(mainItems.length).toBeGreaterThan(0);
      expect(mainItems.some(i => i.route === '/serveur')).toBeTrue();
      expect(mainItems.some(i => i.route === '/barman')).toBeTrue();
      expect(mainItems.some(i => i.route === '/manager')).toBeTrue();
    });

    it('should return admin section items accessible to ADMIN', () => {
      const adminItems = component.getNavItemsForUser(mockAdminUser, 'admin');
      expect(adminItems.length).toBeGreaterThan(0);
      expect(adminItems.some(i => i.route === '/admin/audit-logs')).toBeTrue();
      expect(adminItems.some(i => i.route === '/ingredients')).toBeTrue();
    });

    it('should exclude admin-only routes for SERVEUR role', () => {
      const adminItems = component.getNavItemsForUser(mockServeurUser, 'admin');
      expect(adminItems.some(i => i.route === '/admin')).toBeFalse();
      expect(adminItems.some(i => i.route === '/admin/audit-logs')).toBeFalse();
    });

    it('should include barman routes for BARMAN role', () => {
      const mainItems = component.getNavItemsForUser(mockBarmanUser, 'main');
      expect(mainItems.some(i => i.route === '/barman')).toBeTrue();
    });

    it('should return empty array when user is null', () => {
      expect(component.getNavItemsForUser(null, 'main')).toEqual([]);
    });
  });

  describe('onLogout()', () => {
    it('should dispatch AuthActions.logout', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.onLogout();
      expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.logout());
    });
  });

  describe('DOM rendering', () => {
    it('should render sidebar container element', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const sidebarEl = compiled.querySelector('[data-testid="sidebar-container"]');
      expect(sidebarEl).toBeTruthy();
    });

    it('should apply collapsed class when isCollapsed is true', () => {
      component.isCollapsed.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const sidebarEl = compiled.querySelector('[data-testid="sidebar-container"]');
      expect(sidebarEl?.classList.contains('collapsed')).toBeTrue();
    });

    it('should render user avatar with initial letter', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const avatarEl = compiled.querySelector('[data-testid="sidebar-avatar"]');
      expect(avatarEl?.textContent?.trim()).toBe('A');
    });
  });
});
