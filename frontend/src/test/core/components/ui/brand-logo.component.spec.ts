import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  BrandLogoComponent,
  BrandLogoSize,
  BrandLogoVariant,
} from '../../../../app/core/components/ui/brand-logo/brand-logo.component';

@Component({
  standalone: true,
  imports: [BrandLogoComponent],
  template: `
    <app-brand-logo variant="full" size="xl" testId="host-logo-first"></app-brand-logo>
    <app-brand-logo variant="icon" size="sm" testId="host-logo-second"></app-brand-logo>
  `,
})
class DualBrandLogoHostComponent {}

describe('BrandLogoComponent', () => {
  let component: BrandLogoComponent;
  let fixture: ComponentFixture<BrandLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandLogoComponent, DualBrandLogoHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component with default inputs', () => {
    expect(component).toBeTruthy();
    expect(component.variant).toBe('icon');
    expect(component.size).toBe('md');
    expect(component.glow).toBeTrue();
    expect(component.monochrome).toBeFalse();
    expect(component.label).toBe('OpenBar');
  });

  it('should render icon-only SVG without wordmark text for the icon variant', () => {
    const el = fixture.nativeElement as HTMLElement;
    const svg = el.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBe('132 30 310 310');
    expect(el.querySelector('text')).toBeNull();
    expect(el.querySelector('.brand-logo-wordmark')).toBeNull();
  });

  it('should render full vertical lockup with SVG OpenBar wordmark for the full variant', () => {
    fixture.componentRef.setInput('variant', 'full' as BrandLogoVariant);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const svg = el.querySelector('svg');
    const textEl = el.querySelector('svg text');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 600 460');
    expect(textEl).toBeTruthy();
    expect(textEl?.textContent?.trim()).toBe('OpenBar');
    expect(el.querySelector('.brand-logo-wordmark')).toBeNull();
  });

  it('should render icon SVG and inline wordmark span for the horizontal variant', () => {
    fixture.componentRef.setInput('variant', 'horizontal' as BrandLogoVariant);
    fixture.componentRef.setInput('label', 'OpenBar POS');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const svg = el.querySelector('svg');
    const wordmark = el.querySelector('.brand-logo-wordmark');
    expect(svg?.getAttribute('viewBox')).toBe('132 30 310 310');
    expect(el.querySelector('svg text')).toBeNull();
    expect(wordmark?.textContent?.trim()).toBe('OpenBar POS');
  });

  it('should assign collision-free SVG gradient and filter IDs across multiple instances', () => {
    const hostFixture = TestBed.createComponent(DualBrandLogoHostComponent);
    hostFixture.detectChanges();

    const hostEl = hostFixture.nativeElement as HTMLElement;
    const first = hostEl.querySelector('[data-testid="host-logo-first"]');
    const second = hostEl.querySelector('[data-testid="host-logo-second"]');

    const firstGradId = first?.querySelector('linearGradient')?.getAttribute('id');
    const secondGradId = second?.querySelector('linearGradient')?.getAttribute('id');
    const firstFilterId = first?.querySelector('filter')?.getAttribute('id');
    const secondFilterId = second?.querySelector('filter')?.getAttribute('id');

    expect(firstGradId).toBeTruthy();
    expect(secondGradId).toBeTruthy();
    expect(firstGradId).not.toBe(secondGradId);
    expect(firstFilterId).not.toBe(secondFilterId);

    const firstGroup = first?.querySelector('g');
    const secondGroup = second?.querySelector('g');
    expect(firstGroup?.getAttribute('stroke')).toBe(`url(#${firstGradId})`);
    expect(secondGroup?.getAttribute('stroke')).toBe(`url(#${secondGradId})`);
  });

  it('should apply currentColor and omit glow filter when monochrome is true', () => {
    fixture.componentRef.setInput('variant', 'full' as BrandLogoVariant);
    fixture.componentRef.setInput('monochrome', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const root = el.querySelector('.brand-logo');
    const group = el.querySelector('svg g');
    const textEl = el.querySelector('svg text');

    expect(root?.classList.contains('brand-logo--monochrome')).toBeTrue();
    expect(group?.getAttribute('stroke')).toBe('currentColor');
    expect(group?.getAttribute('filter')).toBeNull();
    expect(textEl?.getAttribute('fill')).toBe('currentColor');
  });

  it('should omit glow filter while preserving gradient stroke when glow is false', () => {
    fixture.componentRef.setInput('glow', false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const group = el.querySelector('svg g');
    expect(group?.getAttribute('stroke')).toBe(`url(#${component.iconGradId})`);
    expect(group?.getAttribute('filter')).toBeNull();
  });

  it('should toggle accessibility attributes based on decorative flag', () => {
    const el = fixture.nativeElement as HTMLElement;
    let root = el.querySelector('[data-testid="brand-logo"]');

    expect(root?.getAttribute('role')).toBe('img');
    expect(root?.getAttribute('aria-label')).toBe('OpenBar');
    expect(root?.getAttribute('aria-hidden')).toBeNull();

    fixture.componentRef.setInput('decorative', true);
    fixture.detectChanges();

    root = el.querySelector('[data-testid="brand-logo"]');
    expect(root?.getAttribute('role')).toBeNull();
    expect(root?.getAttribute('aria-label')).toBeNull();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should apply size preset classes and custom testId attribute', () => {
    const sizes: BrandLogoSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
    fixture.componentRef.setInput('testId', 'custom-logo-id');

    for (const size of sizes) {
      fixture.componentRef.setInput('size', size);
      fixture.detectChanges();

      const root = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="custom-logo-id"]');
      expect(root).toBeTruthy();
      expect(root?.classList.contains(`brand-logo--${size}`)).toBeTrue();
    }
  });
});
