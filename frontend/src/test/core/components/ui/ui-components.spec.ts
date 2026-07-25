import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionButtonComponent } from '../../../../app/core/components/ui/action-button/action-button.component';
import { InputFieldComponent } from '../../../../app/core/components/ui/input-field/input-field.component';
import { PasswordInputComponent } from '../../../../app/core/components/ui/password-input/password-input.component';
import { StatusBadgeComponent } from '../../../../app/core/components/ui/status-badge/status-badge.component';
import { StockSeverityBadgeComponent } from '../../../../app/core/components/ui/stock-severity-badge/stock-severity-badge.component';
import { RoleBadgeComponent } from '../../../../app/core/components/ui/role-badge/role-badge.component';
import { UserAvatarComponent } from '../../../../app/core/components/ui/user-avatar/user-avatar.component';
import { StatCardComponent } from '../../../../app/core/components/ui/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../../../app/core/components/ui/empty-state/empty-state.component';
import { QuantityStepperComponent } from '../../../../app/core/components/ui/quantity-stepper/quantity-stepper.component';
import { FilterChipComponent } from '../../../../app/core/components/ui/filter-chip/filter-chip.component';

describe('Shared UI Components (Figma Design System)', () => {
  describe('ActionButtonComponent', () => {
    let component: ActionButtonComponent;
    let fixture: ComponentFixture<ActionButtonComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [ActionButtonComponent] }).compileComponents();
      fixture = TestBed.createComponent(ActionButtonComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('devrait se créer avec les valeurs par défaut', () => {
      expect(component).toBeTruthy();
      expect(component.variant).toBe('primary');
    });

    it('émet un événement btnClick au clic quand non-désactivé', () => {
      spyOn(component.btnClick, 'emit');
      component.onClick(new MouseEvent('click'));
      expect(component.btnClick.emit).toHaveBeenCalled();
    });

    it('n\'émet pas au clic quand désactivé ou en cours de chargement', () => {
      spyOn(component.btnClick, 'emit');
      component.disabled = true;
      component.onClick(new MouseEvent('click'));
      expect(component.btnClick.emit).not.toHaveBeenCalled();
    });
  });

  describe('StatusBadgeComponent', () => {
    let component: StatusBadgeComponent;
    let fixture: ComponentFixture<StatusBadgeComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [StatusBadgeComponent] }).compileComponents();
      fixture = TestBed.createComponent(StatusBadgeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('mappe correctement la couleur et le libellé selon le statut', () => {
      component.status = 'EN_PREPARATION';
      expect(component.badgeColor).toBe('primary');
      expect(component.label).toBe('En préparation');

      component.status = 'PRET';
      expect(component.badgeColor).toBe('secondary');
      expect(component.label).toBe('Prêt');

      component.status = 'ANNULEE';
      expect(component.badgeColor).toBe('danger');
      expect(component.label).toBe('Annulée');
    });
  });

  describe('StockSeverityBadgeComponent', () => {
    let component: StockSeverityBadgeComponent;
    let fixture: ComponentFixture<StockSeverityBadgeComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [StockSeverityBadgeComponent] }).compileComponents();
      fixture = TestBed.createComponent(StockSeverityBadgeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('mappe la couleur et le texte de l\'alerte stock', () => {
      component.severity = 'CRITIQUE';
      expect(component.badgeColor).toBe('danger');
      expect(component.label).toBe('Stock Critique');

      component.severity = 'FAIBLE';
      expect(component.badgeColor).toBe('warning');
      expect(component.label).toBe('Stock Faible');
    });
  });

  describe('RoleBadgeComponent', () => {
    let component: RoleBadgeComponent;
    let fixture: ComponentFixture<RoleBadgeComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [RoleBadgeComponent] }).compileComponents();
      fixture = TestBed.createComponent(RoleBadgeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('mappe la couleur du badge et l\'icône selon le rôle', () => {
      component.role = 'ADMIN';
      expect(component.badgeColor).toBe('danger');
      expect(component.icon).toBe('shield-checkmark');

      component.role = 'BARMAN';
      expect(component.badgeColor).toBe('tertiary');
      expect(component.icon).toBe('wine');
    });
  });

  describe('UserAvatarComponent', () => {
    let component: UserAvatarComponent;
    let fixture: ComponentFixture<UserAvatarComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [UserAvatarComponent] }).compileComponents();
      fixture = TestBed.createComponent(UserAvatarComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('génère les initiales à partir du nom d\'utilisateur', () => {
      component.name = 'Jean Dupont';
      expect(component.initials).toBe('JD');

      component.name = 'SingleName';
      expect(component.initials).toBe('SI');
    });
  });

  describe('QuantityStepperComponent', () => {
    let component: QuantityStepperComponent;
    let fixture: ComponentFixture<QuantityStepperComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [QuantityStepperComponent] }).compileComponents();
      fixture = TestBed.createComponent(QuantityStepperComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('incrémente et décrémente la quantité et émet la nouvelle valeur', () => {
      spyOn(component.valueChange, 'emit');
      component.value = 2;
      component.increment();
      expect(component.value).toBe(3);
      expect(component.valueChange.emit).toHaveBeenCalledWith(3);

      component.decrement();
      expect(component.value).toBe(2);
      expect(component.valueChange.emit).toHaveBeenCalledWith(2);
    });

    it('ne décrémente pas sous la valeur min', () => {
      component.value = 1;
      component.min = 1;
      component.decrement();
      expect(component.value).toBe(1);
    });
  });

  describe('FilterChipComponent', () => {
    let component: FilterChipComponent;
    let fixture: ComponentFixture<FilterChipComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [FilterChipComponent] }).compileComponents();
      fixture = TestBed.createComponent(FilterChipComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('bascule l\'état actif au clic', () => {
      spyOn(component.chipClick, 'emit');
      expect(component.active).toBeFalse();
      component.onClick();
      expect(component.active).toBeTrue();
      expect(component.chipClick.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('EmptyStateComponent', () => {
    let component: EmptyStateComponent;
    let fixture: ComponentFixture<EmptyStateComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [EmptyStateComponent] }).compileComponents();
      fixture = TestBed.createComponent(EmptyStateComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('émet l\'événement d\'action au clic', () => {
      spyOn(component.actionClick, 'emit');
      component.onAction();
      expect(component.actionClick.emit).toHaveBeenCalled();
    });
  });
});
