import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { By } from '@angular/platform-browser';
import { HeaderComponent } from '../../../app/core/components/header/header.component';
import { selectCurrentUser } from '../../../app/core/store/auth.selectors';
import * as AuthActions from '../../../app/core/store/auth.actions';
import { User } from '../../../app/core/models/user.model';

const mockUserServeur: User = {
  id: 1,
  email: 'serveur@bar.fr',
  username: 'serveur01',
  roles: ['SERVEUR'],
  enabled: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
};

const mockUserAdmin: User = {
  id: 2,
  email: 'admin@bar.fr',
  username: 'admin',
  roles: ['ADMIN'],
  enabled: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
};

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HeaderComponent,
        RouterTestingModule
      , getTranslocoTestingModule()],
      providers: [
        provideMockStore({
          initialState: {
            auth: { user: null, token: null, error: null }
          }
        })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('currentUser$ émet la valeur du store via selectCurrentUser', () => {
    store.overrideSelector(selectCurrentUser, mockUserServeur);
    store.refreshState();

    let emittedUser: User | null | undefined;
    component.currentUser$.subscribe(u => (emittedUser = u));

    expect(emittedUser).toEqual(mockUserServeur);
  });

  it('currentUser$ émet null quand aucun utilisateur connecté', () => {
    store.overrideSelector(selectCurrentUser, null);
    store.refreshState();

    let emittedUser: User | null | undefined;
    component.currentUser$.subscribe(u => (emittedUser = u));

    expect(emittedUser).toBeNull();
  });

  it('onLogout() dispatche l\'action AuthActions.logout', () => {
    const dispatchSpy = spyOn(store, 'dispatch');

    component.onLogout();

    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.logout());
  });

  it('onLogout() ne dispatche qu\'une seule action par appel', () => {
    const dispatchSpy = spyOn(store, 'dispatch');

    component.onLogout();

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it('affiche le username de l\'utilisateur connecté dans le header', async () => {
    store.overrideSelector(selectCurrentUser, mockUserServeur);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    const headerEl = fixture.nativeElement as HTMLElement;
    expect(headerEl.textContent).toContain('serveur01');
  });

  it('masque le bouton utilisateur quand aucun utilisateur connecté', async () => {
    store.overrideSelector(selectCurrentUser, null);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    const userTriggerBtn = fixture.nativeElement.querySelector('#header-user-trigger');
    expect(userTriggerBtn).toBeFalsy();
  });

  it('affiche le lien Administration dans le menu pour un ADMIN', async () => {
    store.overrideSelector(selectCurrentUser, mockUserAdmin);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    const headerEl = fixture.nativeElement as HTMLElement;
    expect(headerEl.textContent).toContain('Administration');
  });

  it('masque le lien Administration dans le menu pour un non-ADMIN', async () => {
    store.overrideSelector(selectCurrentUser, mockUserServeur);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    const headerEl = fixture.nativeElement as HTMLElement;
    expect(headerEl.textContent).not.toContain('Administration');
  });

  it('affiche les liens de navigation communs (Cocktails, Commandes, Tables)', async () => {
    store.overrideSelector(selectCurrentUser, mockUserServeur);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    const headerEl = fixture.nativeElement as HTMLElement;
    expect(headerEl.textContent).toContain('Cocktails');
    expect(headerEl.textContent).toContain('Commandes');
    expect(headerEl.textContent).toContain('Tables');
  });

  it('affiche le titre OpenBar dans la toolbar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const headerEl = fixture.nativeElement as HTMLElement;
    expect(headerEl.textContent).toContain('OpenBar');
  });
});
