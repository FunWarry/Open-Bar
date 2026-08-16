import { getTranslocoTestingModule } from '../../../transloco-testing.module';
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
import { ToggleSwitchComponent } from '../../../../app/core/components/ui/toggle-switch/toggle-switch.component';
import { CheckboxFieldComponent } from '../../../../app/core/components/ui/checkbox-field/checkbox-field.component';
import { ToastComponent } from '../../../../app/core/components/ui/toast/toast.component';
import { ProductCardComponent } from '../../../../app/core/components/ui/product-card/product-card.component';

describe('Shared UI Components (Figma Design System)', () => {
  describe('ActionButtonComponent', () => {
    let component: ActionButtonComponent;
    let fixture: ComponentFixture<ActionButtonComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [ActionButtonComponent, getTranslocoTestingModule()] }).compileComponents();
      fixture = TestBed.createComponent(ActionButtonComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should be created with default values', () => {
      expect(component).toBeTruthy();
      expect(component.variant).toBe('primary');
      expect(component.colorAttr).toBe('primary');
      expect(component.fillAttr).toBe('solid');
    });

    it('calcule correctement colorAttr et fillAttr pour chaque variante', () => {
      component.variant = 'danger';
      expect(component.colorAttr).toBe('danger');
      expect(component.fillAttr).toBe('solid');

      component.variant = 'ghost';
      expect(component.colorAttr).toBeUndefined();
      expect(component.fillAttr).toBe('clear');

      component.variant = 'secondary';
      expect(component.fillAttr).toBe('outline');

      component.variant = 'edit';
      expect(component.fillAttr).toBe('outline');
    });

    it('emits btnClick event on click when not disabled', () => {
      spyOn(component.btnClick, 'emit');
      component.onClick(new MouseEvent('click'));
      expect(component.btnClick.emit).toHaveBeenCalled();
    });

    it('does not emit on click when disabled or loading', () => {
      spyOn(component.btnClick, 'emit');
      component.disabled = true;
      component.onClick(new MouseEvent('click'));
      expect(component.btnClick.emit).not.toHaveBeenCalled();

      component.disabled = false;
      component.loading = true;
      component.onClick(new MouseEvent('click'));
      expect(component.btnClick.emit).not.toHaveBeenCalled();
    });
  });

  describe('InputFieldComponent', () => {
    let component: InputFieldComponent;
    let fixture: ComponentFixture<InputFieldComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [InputFieldComponent] }).compileComponents();
      fixture = TestBed.createComponent(InputFieldComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('properly implements ControlValueAccessor', () => {
      component.writeValue('Test Input');
      expect(component.value).toBe('Test Input');

      const fn = jasmine.createSpy('onChange');
      component.registerOnChange(fn);

      component.onInput({ target: { value: 'New Val' } } as any);
      expect(component.value).toBe('New Val');
      expect(fn).toHaveBeenCalledWith('New Val');

      const touchFn = jasmine.createSpy('onTouched');
      component.registerOnTouched(touchFn);
      component.onBlur();
      expect(touchFn).toHaveBeenCalled();

      component.setDisabledState(true);
      expect(component.disabled).toBeTrue();
    });
  });

  describe('PasswordInputComponent', () => {
    let component: PasswordInputComponent;
    let fixture: ComponentFixture<PasswordInputComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [PasswordInputComponent] }).compileComponents();
      fixture = TestBed.createComponent(PasswordInputComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('bascule l\'affichage du mot de passe avec toggleVisibility', () => {
      expect(component.showPassword).toBeFalse();
      component.toggleVisibility();
      expect(component.showPassword).toBeTrue();
      component.toggleVisibility();
      expect(component.showPassword).toBeFalse();
    });

    it('handles inputs and ControlValueAccessor events', () => {
      const fn = jasmine.createSpy('onChange');
      component.registerOnChange(fn);

      component.onInput({ target: { value: 'Secret123' } } as any);
      expect(component.value).toBe('Secret123');
      expect(fn).toHaveBeenCalledWith('Secret123');
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

    it('correctly maps color and label according to status', () => {
      component.status = 'EN_ATTENTE';
      expect(component.badgeColor).toBe('warning');
      expect(component.label).toBe('En attente');

      component.status = 'EN_PREPARATION';
      expect(component.badgeColor).toBe('primary');
      expect(component.label).toBe('En préparation');

      component.status = 'PRET';
      expect(component.badgeColor).toBe('secondary');
      expect(component.label).toBe('Prêt');

      component.status = 'LIVREE';
      expect(component.badgeColor).toBe('success');
      expect(component.label).toBe('Livrée');

      component.status = 'ANNULEE';
      expect(component.badgeColor).toBe('danger');
      expect(component.label).toBe('Annulée');

      component.prioritary = true;
      expect(component.badgeColor).toBe('tertiary');
      expect(component.label).toBe('⚡ Prioritaire');
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

      component.severity = 'NORMAL';
      expect(component.badgeColor).toBe('success');
      expect(component.label).toBe('Stock Normal');
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

    it('maps badge color and icon according to role', () => {
      component.role = 'ADMIN';
      expect(component.badgeColor).toBe('danger');
      expect(component.icon).toBe('shield-checkmark');
      expect(component.label).toBe('Admin');

      component.role = 'MANAGER';
      expect(component.badgeColor).toBe('warning');
      expect(component.icon).toBe('briefcase');
      expect(component.label).toBe('Manager');

      component.role = 'BARMAN';
      expect(component.badgeColor).toBe('tertiary');
      expect(component.icon).toBe('wine');
      expect(component.label).toBe('Barman');

      component.role = 'SERVEUR';
      expect(component.badgeColor).toBe('primary');
      expect(component.icon).toBe('restaurant');
      expect(component.label).toBe('Serveur');
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

    it('generates initials and role icon', () => {
      component.name = 'Jean Dupont';
      expect(component.initials).toBe('JD');

      component.name = 'SingleName';
      expect(component.initials).toBe('SI');

      component.name = undefined;
      expect(component.initials).toBe('?');

      component.role = 'BARMAN';
      expect(component.roleIcon).toBe('wine');
      expect(component.roleColor).toBe('var(--role-barman)');

      component.role = 'ADMIN';
      expect(component.roleColor).toBe('var(--role-admin)');

      component.role = 'MANAGER';
      expect(component.roleColor).toBe('var(--role-manager)');

      component.role = 'SERVEUR';
      expect(component.roleColor).toBe('var(--role-serveur)');

      component.role = undefined;
      expect(component.roleIcon).toBe('person');
      expect(component.roleColor).toBe('var(--primary)');
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

    it('increments and decrements quantity and emits new value', () => {
      spyOn(component.valueChange, 'emit');
      component.value = 2;
      component.increment();
      expect(component.value).toBe(3);
      expect(component.valueChange.emit).toHaveBeenCalledWith(3);

      component.decrement();
      expect(component.value).toBe(2);
      expect(component.valueChange.emit).toHaveBeenCalledWith(2);
    });

    it('respecte les bornes min et max', () => {
      component.value = 1;
      component.min = 1;
      component.decrement();
      expect(component.value).toBe(1);

      component.value = 99;
      component.max = 99;
      component.increment();
      expect(component.value).toBe(99);
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

    it('toggles active state on click if not disabled', () => {
      spyOn(component.chipClick, 'emit');
      expect(component.active).toBeFalse();
      component.onClick();
      expect(component.active).toBeTrue();
      expect(component.chipClick.emit).toHaveBeenCalledWith(true);

      component.disabled = true;
      component.onClick();
      expect(component.active).toBeTrue();
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

    it('emits action event on click', () => {
      spyOn(component.actionClick, 'emit');
      component.onAction();
      expect(component.actionClick.emit).toHaveBeenCalled();
    });
  });

  describe('StatCardComponent', () => {
    let component: StatCardComponent;
    let fixture: ComponentFixture<StatCardComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [StatCardComponent] }).compileComponents();
      fixture = TestBed.createComponent(StatCardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create and calculate displayTitle correctly', () => {
      expect(component).toBeTruthy();
      expect(component.displayTitle).toBe('');

      component.label = 'Label Test';
      expect(component.displayTitle).toBe('Label Test');

      component.title = 'Title Test';
      expect(component.displayTitle).toBe('Title Test');
    });

    it('accepts inputs value, icon, trend, trendDirection, color', () => {
      component.value = 100;
      component.icon = 'cash-outline';
      component.trend = '+12%';
      component.trendDirection = 'up';
      component.color = 'success';

      expect(component.value).toBe(100);
      expect(component.icon).toBe('cash-outline');
      expect(component.trend).toBe('+12%');
      expect(component.trendDirection).toBe('up');
      expect(component.color).toBe('success');
    });
  });

  describe('ToggleSwitchComponent (Figma ID 534:910)', () => {
    let component: ToggleSwitchComponent;
    let fixture: ComponentFixture<ToggleSwitchComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [ToggleSwitchComponent] }).compileComponents();
      fixture = TestBed.createComponent(ToggleSwitchComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should toggle switch value and respect disabled state', () => {
      expect(component).toBeTruthy();
      expect(component.checked).toBeFalse();

      component.toggle();
      expect(component.checked).toBeTrue();

      component.disabled = true;
      component.toggle();
      expect(component.checked).toBeTrue();
    });

    it('devrait propager les changements au ControlValueAccessor de l\'interrupteur', () => {
      component.writeValue(true);
      expect(component.checked).toBeTrue();

      const toggleSpy = jasmine.createSpy('onToggleChange');
      component.registerOnChange(toggleSpy);

      component.toggle();
      expect(toggleSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('CheckboxFieldComponent (Figma ID 426:2058)', () => {
    let component: CheckboxFieldComponent;
    let fixture: ComponentFixture<CheckboxFieldComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [CheckboxFieldComponent] }).compileComponents();
      fixture = TestBed.createComponent(CheckboxFieldComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should toggle checkbox and generate unique inputId', () => {
      expect(component).toBeTruthy();
      expect(component.inputId).toContain('app-checkbox-');
      expect(component.checked).toBeFalse();

      component.toggle();
      expect(component.checked).toBeTrue();

      component.setDisabledState(true);
      component.toggle();
      expect(component.checked).toBeTrue();
    });

    it('should correctly bind boolean value with ReactiveForms', () => {
      component.writeValue(false);
      expect(component.checked).toBeFalse();

      const checkboxSpy = jasmine.createSpy('onCheckboxChange');
      component.registerOnChange(checkboxSpy);

      component.toggle();
      expect(checkboxSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('ToastComponent (Figma ID 536:928)', () => {
    let component: ToastComponent;
    let fixture: ComponentFixture<ToastComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [ToastComponent] }).compileComponents();
      fixture = TestBed.createComponent(ToastComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should assign Ionic icon corresponding to 4 severity levels', () => {
      expect(component).toBeTruthy();
      component.severity = 'success';
      expect(component.severityIcon).toBe('checkmark-circle-outline');

      component.severity = 'danger';
      expect(component.severityIcon).toBe('alert-circle-outline');

      component.severity = 'warning';
      expect(component.severityIcon).toBe('warning-outline');

      component.severity = 'info';
      expect(component.severityIcon).toBe('information-circle-outline');
    });

    it('should emit dismissed event on close button click', () => {
      spyOn(component.dismissed, 'emit');
      component.onClose();
      expect(component.dismissed.emit).toHaveBeenCalled();
    });
  });

  describe('ProductCardComponent (Figma ID 129:95)', () => {
    let component: ProductCardComponent;
    let fixture: ComponentFixture<ProductCardComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [ProductCardComponent] }).compileComponents();
      fixture = TestBed.createComponent(ProductCardComponent);
      component = fixture.componentInstance;
      component.title = 'Mojito';
      component.price = 10.5;
      fixture.detectChanges();
    });

    it('should create and emit addClick and removeClick events', () => {
      expect(component).toBeTruthy();
      expect(component.title).toBe('Mojito');
      expect(component.price).toBe(10.5);

      spyOn(component.addClick, 'emit');
      component.onAdd();
      expect(component.addClick.emit).toHaveBeenCalled();

      spyOn(component.removeClick, 'emit');
      component.onRemove();
      expect(component.removeClick.emit).toHaveBeenCalled();
    });
  });
});


