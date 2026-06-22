import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { CommandeListComponent } from '../../../app/features/commandes/commande-list/commande-list.component';
import { selectIsAdmin } from '../../../app/core/store/auth.selectors';

describe('CommandeListComponent', () => {
  let component: CommandeListComponent;
  let fixture: ComponentFixture<CommandeListComponent>;
  let store: MockStore;

  const initialState = {
    auth: {
      user: null,
      token: null,
      loading: false,
      error: null
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommandeListComponent,
        IonicModule.forRoot(),
        RouterTestingModule
      ],
      providers: [
        provideMockStore({
          initialState,
          selectors: [
            { selector: selectIsAdmin, value: false }
          ]
        })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(CommandeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('isAdmin$ observable doit émettre la valeur du store', (done) => {
    store.overrideSelector(selectIsAdmin, true);
    store.refreshState();

    component.isAdmin$.subscribe(isAdmin => {
      expect(isAdmin).toBe(true);
      done();
    });
  });

  it('isAdmin$ observable doit émettre false quand l\'utilisateur n\'est pas admin', (done) => {
    store.overrideSelector(selectIsAdmin, false);
    store.refreshState();

    component.isAdmin$.subscribe(isAdmin => {
      expect(isAdmin).toBe(false);
      done();
    });
  });

  it('items doit être un tableau vide à l\'initialisation', () => {
    expect(component.items).toEqual([]);
    expect(Array.isArray(component.items)).toBe(true);
  });

  describe('getStatusColor()', () => {
    it('retourne "warning" pour EN_ATTENTE', () => {
      expect(component.getStatusColor('EN_ATTENTE')).toBe('warning');
    });

    it('retourne "tertiary" pour EN_PREPARATION', () => {
      expect(component.getStatusColor('EN_PREPARATION')).toBe('tertiary');
    });

    it('retourne "success" pour PRETE', () => {
      expect(component.getStatusColor('PRETE')).toBe('success');
    });

    it('retourne "medium" pour SERVIE', () => {
      expect(component.getStatusColor('SERVIE')).toBe('medium');
    });

    it('retourne "danger" pour ANNULEE', () => {
      expect(component.getStatusColor('ANNULEE')).toBe('danger');
    });

    it('retourne "primary" pour un statut inconnu', () => {
      expect(component.getStatusColor('STATUT_INCONNU')).toBe('primary');
    });

    it('retourne "primary" pour une chaîne vide', () => {
      expect(component.getStatusColor('')).toBe('primary');
    });
  });

  describe('trackById()', () => {
    it('retourne item.id quand il est défini', () => {
      const item = { id: 42, nom: 'Commande test' };
      expect(component.trackById(0, item)).toBe(42);
    });

    it('retourne l\'index quand item.id est undefined', () => {
      const item = { nom: 'Commande sans id' };
      expect(component.trackById(3, item)).toBe(3);
    });

    it('retourne item.id = 0 (falsy) — utilise l\'index via nullish coalescing', () => {
      const item = { id: 0 };
      // id ?? index => 0 ?? 3 => 0 (nullish coalescing, 0 est conservé)
      expect(component.trackById(3, item)).toBe(0);
    });
  });

  describe('méthodes d\'action (stubs)', () => {
    it('onAdd() ne lève pas d\'erreur', () => {
      expect(() => component.onAdd()).not.toThrow();
    });

    it('onView() ne lève pas d\'erreur', () => {
      const commande = { id: 1, statut: 'EN_ATTENTE' };
      expect(() => component.onView(commande)).not.toThrow();
    });

    it('onEdit() ne lève pas d\'erreur', () => {
      const commande = { id: 1, statut: 'EN_ATTENTE' };
      expect(() => component.onEdit(commande)).not.toThrow();
    });

    it('onDelete() ne lève pas d\'erreur', () => {
      const commande = { id: 1, statut: 'EN_ATTENTE' };
      expect(() => component.onDelete(commande)).not.toThrow();
    });
  });

  it('ngOnInit() ne lève pas d\'erreur (TODO chargement commandes)', () => {
    expect(() => component.ngOnInit()).not.toThrow();
  });
});
