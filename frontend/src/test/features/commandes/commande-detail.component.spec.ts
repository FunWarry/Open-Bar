import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { CommandeDetailComponent } from '../../../app/features/commandes/commande-detail/commande-detail.component';

describe('CommandeDetailComponent', () => {
  let component: CommandeDetailComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? '42' : null)
      }
    }
  };

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);

    const toastMock = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastMock as any));

    await TestBed.configureTestingModule({
      imports: [
        CommandeDetailComponent,
        RouterTestingModule
      ],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(CommandeDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('commandeId doit être initialisé depuis les paramètres de route', () => {
    expect(component.commandeId).toBe(42);
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
      expect(component.getStatusColor('INCONNU')).toBe('primary');
    });
  });

  describe('onEdit()', () => {
    it('navigue vers /commandes/:id/edit', () => {
      component.commandeId = 42;
      component.onEdit();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/commandes', 42, 'edit']);
    });
  });

  describe('onDelete()', () => {
    it('affiche un toast de succès puis navigue vers /commandes', async () => {
      await component.onDelete();
      expect(toastCtrlSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Commande supprimée avec succès',
          duration: 3000,
          color: 'success'
        })
      );
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/commandes']);
    });
  });
});
