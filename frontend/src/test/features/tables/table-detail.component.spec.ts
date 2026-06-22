import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TableDetailComponent } from '../../../app/features/tables/table-detail/table-detail.component';
import { selectIsAdmin } from '../../../app/core/store/auth.selectors';

describe('TableDetailComponent', () => {
  let component: TableDetailComponent;
  let router: Router;
  let store: MockStore;

  const initialState = { auth: { user: null, isAdmin: false } };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TableDetailComponent,
        RouterTestingModule
      ],
      providers: [
        provideMockStore({
          initialState,
          selectors: [{ selector: selectIsAdmin, value: false }]
        }),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } }
        }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);

    const fixture = TestBed.createComponent(TableDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isAdmin$', () => {
    it('should emit false when user is not admin', (done) => {
      component.isAdmin$.subscribe(isAdmin => {
        expect(isAdmin).toBeFalse();
        done();
      });
    });

    it('should emit true when user is admin', (done) => {
      store.overrideSelector(selectIsAdmin, true);
      store.refreshState();

      component.isAdmin$.subscribe(isAdmin => {
        expect(isAdmin).toBeTrue();
        done();
      });
    });
  });

  describe('getStatusColor()', () => {
    it('should return "warning" for EN_ATTENTE', () => {
      expect(component.getStatusColor('EN_ATTENTE')).toBe('warning');
    });

    it('should return "tertiary" for EN_PREPARATION', () => {
      expect(component.getStatusColor('EN_PREPARATION')).toBe('tertiary');
    });

    it('should return "success" for PRETE', () => {
      expect(component.getStatusColor('PRETE')).toBe('success');
    });

    it('should return "medium" for SERVIE', () => {
      expect(component.getStatusColor('SERVIE')).toBe('medium');
    });

    it('should return "primary" for unknown status', () => {
      expect(component.getStatusColor('INCONNU')).toBe('primary');
    });
  });

  describe('onBack()', () => {
    it('should navigate to /tables', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.onBack();
      expect(navigateSpy).toHaveBeenCalledWith(['/tables']);
    });
  });

  describe('onEdit()', () => {
    it('should navigate to /tables/:id/edit when table is set', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.table = { id: 5 };
      component.onEdit();
      expect(navigateSpy).toHaveBeenCalledWith(['/tables', 5, 'edit']);
    });
  });

  describe('onViewCommande()', () => {
    it('should navigate to /commandes/:id when table has a currentCommande', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.table = { id: 5, currentCommande: { id: 99 } };
      component.onViewCommande();
      expect(navigateSpy).toHaveBeenCalledWith(['/commandes', 99]);
    });

    it('should not navigate when table has no currentCommande', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.table = { id: 5, currentCommande: null };
      component.onViewCommande();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should not navigate when table is undefined', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.table = undefined;
      component.onViewCommande();
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('commandesDataSource', () => {
    it('should be initialized as an empty array', () => {
      expect(component.commandesDataSource).toEqual([]);
    });
  });
});
