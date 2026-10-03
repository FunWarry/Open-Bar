import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CardComponent,
  CardAccentColor,
  CardDividerStyle,
  CardBackgroundVariant,
} from '../../../../app/core/components/ui/card/card.component';

describe('CardComponent', () => {
  let fixture: ComponentFixture<CardComponent>;
  let component: CardComponent;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should create with default configuration', () => {
    expect(component).toBeTruthy();
    expect(component.active).toBeTrue();
    expect(component.clickable).toBeFalse();
    expect(component.showHeader).toBeTrue();
    expect(component.showFooter).toBeTrue();
    expect(component.headerDivider).toBe('dashed');
    expect(component.footerDivider).toBe('dashed');
    expect(component.accentColor).toBeNull();
    expect(component.resolvedAccentColor).toBeNull();
    expect(component.resolvedBackground).toBe('var(--background-surface-1, #16192b)');
  });

  describe('Accent border strip (liseré)', () => {
    it('should not render accent strip when accentColor is null or none', () => {
      component.accentColor = null;
      fixture.detectChanges();
      expect(element.querySelector('[data-testid="card-accent-strip"]')).toBeNull();

      component.accentColor = 'none';
      fixture.detectChanges();
      expect(element.querySelector('[data-testid="card-accent-strip"]')).toBeNull();
    });

    it('should render accent strip and map semantic tokens correctly', () => {
      const colors: { token: CardAccentColor; expected: string }[] = [
        { token: 'primary', expected: 'var(--primary, #6c7fe8)' },
        { token: 'success', expected: 'var(--semantic-success, #34c77b)' },
        { token: 'danger', expected: 'var(--semantic-danger, #e5604f)' },
        { token: 'warning', expected: 'var(--semantic-warning, #f4a52a)' },
        { token: 'info', expected: 'var(--semantic-info, #4fc3f7)' },
        { token: 'purple', expected: 'var(--role-admin, #9b8af2)' },
      ];

      for (const item of colors) {
        component.accentColor = item.token;
        fixture.detectChanges();
        expect(component.resolvedAccentColor).toBe(item.expected);
        const strip = element.querySelector('[data-testid="card-accent-strip"]');
        expect(strip).toBeTruthy();
        const container = element.querySelector('.app-card-container') as HTMLElement;
        expect(container.style.getPropertyValue('--card-accent-color')).toBe(item.expected);
      }
    });

    it('should support arbitrary hex and CSS variable strings for accentColor', () => {
      component.accentColor = '#e91e63';
      fixture.detectChanges();
      expect(component.resolvedAccentColor).toBe('#e91e63');

      const container = element.querySelector('.app-card-container') as HTMLElement;
      expect(container.style.getPropertyValue('--card-accent-color')).toBe('#e91e63');
    });

    it('should apply custom accentWidth to the container style', () => {
      component.accentColor = 'danger';
      component.accentWidth = '6px';
      fixture.detectChanges();

      const container = element.querySelector('.app-card-container') as HTMLElement;
      expect(container.style.getPropertyValue('--card-accent-width')).toBe('6px');
    });
  });

  describe('Dividers and section visibility', () => {
    it('should render dashed dividers by default', () => {
      const headerDivider = element.querySelector('[data-testid="card-header-divider"]') as HTMLElement;
      const footerDivider = element.querySelector('[data-testid="card-footer-divider"]') as HTMLElement;
      expect(headerDivider.classList.contains('divider-dashed')).toBeTrue();
      expect(footerDivider.classList.contains('divider-dashed')).toBeTrue();
    });

    it('should render solid dividers when configured', () => {
      component.headerDivider = 'solid';
      component.footerDivider = 'solid';
      fixture.detectChanges();

      const headerDivider = element.querySelector('[data-testid="card-header-divider"]') as HTMLElement;
      const footerDivider = element.querySelector('[data-testid="card-footer-divider"]') as HTMLElement;
      expect(headerDivider.classList.contains('divider-solid')).toBeTrue();
      expect(footerDivider.classList.contains('divider-solid')).toBeTrue();
    });

    it('should omit dividers when divider style is none', () => {
      component.headerDivider = 'none';
      component.footerDivider = 'none';
      fixture.detectChanges();

      expect(element.querySelector('[data-testid="card-header-divider"]')).toBeNull();
      expect(element.querySelector('[data-testid="card-footer-divider"]')).toBeNull();
    });

    it('should hide header section and its divider when showHeader is false', () => {
      component.showHeader = false;
      fixture.detectChanges();

      expect(element.querySelector('[data-testid="card-header-section"]')).toBeNull();
      expect(element.querySelector('[data-testid="card-header-divider"]')).toBeNull();
    });

    it('should hide footer section and its divider when showFooter is false', () => {
      component.showFooter = false;
      fixture.detectChanges();

      expect(element.querySelector('[data-testid="card-footer-section"]')).toBeNull();
      expect(element.querySelector('[data-testid="card-footer-divider"]')).toBeNull();
    });
  });

  describe('Clickable & Interactivity', () => {
    it('should not be clickable by default', () => {
      const container = element.querySelector('.app-card-container') as HTMLElement;
      expect(container.classList.contains('clickable')).toBeFalse();
      expect(container.getAttribute('role')).toBeNull();
      expect(container.getAttribute('tabindex')).toBeNull();

      const clickSpy = spyOn(component.cardClick, 'emit');
      container.click();
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should support clickable mode, role button, and emit cardClick event on click', () => {
      component.clickable = true;
      fixture.detectChanges();

      const container = element.querySelector('.app-card-container') as HTMLElement;
      expect(container.classList.contains('clickable')).toBeTrue();
      expect(container.getAttribute('role')).toBe('button');
      expect(container.getAttribute('tabindex')).toBe('0');

      const clickSpy = spyOn(component.cardClick, 'emit');
      container.click();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit cardClick on Enter and Space keydown events', () => {
      component.clickable = true;
      fixture.detectChanges();

      const container = element.querySelector('.app-card-container') as HTMLElement;
      const clickSpy = spyOn(component.cardClick, 'emit');

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
      container.dispatchEvent(enterEvent);
      expect(clickSpy).toHaveBeenCalledTimes(1);

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
      container.dispatchEvent(spaceEvent);
      expect(clickSpy).toHaveBeenCalledTimes(2);
    });

    it('should ignore other keys (e.g. Tab, Escape)', () => {
      component.clickable = true;
      fixture.detectChanges();

      const container = element.querySelector('.app-card-container') as HTMLElement;
      const clickSpy = spyOn(component.cardClick, 'emit');

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      container.dispatchEvent(tabEvent);
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Active & Inactive state', () => {
    it('should apply inactive styling and prevent click emission when active is false', () => {
      component.clickable = true;
      component.active = false;
      fixture.detectChanges();

      const container = element.querySelector('.app-card-container') as HTMLElement;
      expect(container.classList.contains('inactive')).toBeTrue();
      expect(container.classList.contains('clickable')).toBeFalse();
      expect(container.getAttribute('aria-disabled')).toBe('true');
      expect(container.getAttribute('role')).toBeNull();
      expect(container.getAttribute('tabindex')).toBeNull();

      const clickSpy = spyOn(component.cardClick, 'emit');
      container.click();
      expect(clickSpy).not.toHaveBeenCalled();

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      container.dispatchEvent(enterEvent);
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Background variants and styling presets', () => {
    it('should set appropriate background CSS variable for presets', () => {
      const variants: { variant: CardBackgroundVariant; expected: string }[] = [
        { variant: 'surface-1', expected: 'var(--background-surface-1, #16192b)' },
        { variant: 'surface-2', expected: 'var(--background-surface-2, #21263f)' },
        { variant: 'glass', expected: 'var(--background-glass, rgba(22, 25, 43, 0.75))' },
        { variant: 'transparent', expected: 'transparent' },
        { variant: '#123456', expected: '#123456' },
      ];

      for (const item of variants) {
        component.background = item.variant;
        fixture.detectChanges();
        expect(component.resolvedBackground).toBe(item.expected);
        const container = element.querySelector('.app-card-container') as HTMLElement;
        expect(container.style.getPropertyValue('--card-bg')).toBe(item.expected);
      }
    });

    it('should bind padding, elevation, and customClass', () => {
      component.padding = 'lg';
      component.elevation = 'md';
      component.customClass = 'my-custom-card';
      component.testId = 'custom-test-card';
      fixture.detectChanges();

      const container = element.querySelector('.app-card-container') as HTMLElement;
      expect(container.classList.contains('padding-lg')).toBeTrue();
      expect(container.classList.contains('elevation-md')).toBeTrue();
      expect(container.classList.contains('my-custom-card')).toBeTrue();
      expect(container.getAttribute('data-testid')).toBe('custom-test-card');
    });
  });
});
