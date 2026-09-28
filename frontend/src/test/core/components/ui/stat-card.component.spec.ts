import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { StatCardComponent } from '../../../../app/core/components/ui/stat-card/stat-card.component';

@Component({
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <app-stat-card
      [layout]="layout"
      [size]="size"
      [color]="color"
      [title]="title"
      [value]="value"
      [subtext]="subtext"
      [clickable]="clickable"
      (cardClick)="onCardClick($event)">
      <span stat-icon class="custom-icon">🔥</span>
      <div stat-value class="custom-value">Custom Value 99</div>
      <div stat-footer class="custom-footer">Custom Footer Content</div>
    </app-stat-card>
  `
})
class TestHostComponent {
  layout: 'vertical' | 'horizontal' = 'vertical';
  size: 'sm' | 'md' | 'lg' = 'md';
  color = 'primary';
  title = 'Host Title';
  value: string | number = 42;
  subtext = 'Host Subtext';
  clickable = false;
  clickEvents: (MouseEvent | KeyboardEvent)[] = [];

  onCardClick(event: MouseEvent | KeyboardEvent): void {
    this.clickEvents.push(event);
  }
}

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with default configuration', () => {
    expect(component).toBeTruthy();
    expect(component.layout).toBe('vertical');
    expect(component.size).toBe('md');
    expect(component.trendDirection).toBe('neutral');
    expect(component.highlight).toBeFalse();
    expect(component.clickable).toBeFalse();
    expect(component.testId).toBe('stat-card');
  });

  describe('displayTitle resolution', () => {
    it('returns empty string when no title or label is provided', () => {
      expect(component.displayTitle).toBe('');
    });

    it('returns label when only label is provided', () => {
      component.label = 'Available Tables';
      expect(component.displayTitle).toBe('Available Tables');
    });

    it('returns title when title is provided', () => {
      component.title = 'Total Revenue';
      component.label = 'Secondary Label';
      expect(component.displayTitle).toBe('Total Revenue');
    });
  });

  describe('trendSymbol resolution', () => {
    it('returns ▲ when trendDirection is "up"', () => {
      component.trendDirection = 'up';
      expect(component.trendSymbol).toBe('▲');
    });

    it('returns ▼ when trendDirection is "down"', () => {
      component.trendDirection = 'down';
      expect(component.trendSymbol).toBe('▼');
    });

    it('returns ■ when trendDirection is "neutral"', () => {
      component.trendDirection = 'neutral';
      expect(component.trendSymbol).toBe('■');
    });

    it('recognizes trend string input for legacy symbol compatibility', () => {
      component.trend = 'up';
      expect(component.trendSymbol).toBe('▲');
      component.trend = 'down';
      expect(component.trendSymbol).toBe('▼');
    });
  });

  describe('isLabelTop logic', () => {
    it('defaults to true for vertical layout', () => {
      component.layout = 'vertical';
      expect(component.isLabelTop).toBeTrue();
    });

    it('defaults to false for horizontal layout', () => {
      component.layout = 'horizontal';
      expect(component.isLabelTop).toBeFalse();
    });

    it('respects explicit labelPosition="top"', () => {
      component.layout = 'horizontal';
      component.labelPosition = 'top';
      expect(component.isLabelTop).toBeTrue();
    });

    it('respects explicit labelPosition="bottom"', () => {
      component.layout = 'vertical';
      component.labelPosition = 'bottom';
      expect(component.isLabelTop).toBeFalse();
    });
  });

  describe('rendering and classes', () => {
    it('renders title, value, subtext, and trend badge in vertical layout', () => {
      component.title = 'Turnover';
      component.value = '1,250.00 €';
      component.subtext = 'Daily total';
      component.trend = '+8.5%';
      component.trendDirection = 'up';
      component.color = 'success';
      component.highlight = true;
      fixture.detectChanges();

      const root = fixture.debugElement.query(By.css('.stat-card')).nativeElement as HTMLElement;
      expect(root.classList.contains('layout-vertical')).toBeTrue();
      expect(root.classList.contains('color-success')).toBeTrue();
      expect(root.classList.contains('stat-card-highlight')).toBeTrue();

      const titleEl = fixture.debugElement.query(By.css('.stat-title')).nativeElement as HTMLElement;
      expect(titleEl.textContent?.trim()).toContain('Turnover');

      const valueEl = fixture.debugElement.query(By.css('.stat-value')).nativeElement as HTMLElement;
      expect(valueEl.textContent?.trim()).toBe('1,250.00 €');

      const subtextEl = fixture.debugElement.query(By.css('.stat-subtext')).nativeElement as HTMLElement;
      expect(subtextEl.textContent?.trim()).toBe('Daily total');

      const trendEl = fixture.debugElement.query(By.css('.stat-trend-badge')).nativeElement as HTMLElement;
      expect(trendEl.textContent?.trim()).toContain('+8.5%');
      expect(trendEl.classList.contains('trend-up')).toBeTrue();
    });

    it('renders horizontal layout structure with icon and data column', () => {
      component.layout = 'horizontal';
      component.icon = 'cash-outline';
      component.title = 'Invoices';
      component.value = 18;
      fixture.detectChanges();

      const horizontalContainer = fixture.debugElement.query(By.css('.layout-horizontal'));
      expect(horizontalContainer).toBeTruthy();

      const iconEl = fixture.debugElement.query(By.css('.stat-icon-wrapper ion-icon'));
      expect(iconEl).toBeTruthy();
      expect(iconEl.componentInstance.name).toBe('cash-outline');
    });

    it('applies custom testId', () => {
      component.testId = 'custom-metric-test';
      fixture.detectChanges();

      const root = fixture.debugElement.query(By.css('[data-testid="custom-metric-test"]'));
      expect(root).toBeTruthy();
    });
  });

  describe('interactivity & accessibility', () => {
    it('sets button role and tabindex when clickable', () => {
      component.clickable = true;
      fixture.detectChanges();

      const root = fixture.debugElement.query(By.css('.stat-card')).nativeElement as HTMLElement;
      expect(root.getAttribute('role')).toBe('button');
      expect(root.getAttribute('tabindex')).toBe('0');
      expect(root.classList.contains('is-clickable')).toBeTrue();
    });

    it('emits cardClick on click event', () => {
      component.clickable = true;
      let emittedEvent: MouseEvent | KeyboardEvent | undefined;
      component.cardClick.subscribe(e => (emittedEvent = e));

      const event = new MouseEvent('click');
      component.onClick(event);

      expect(emittedEvent).toBe(event);
    });

    it('emits cardClick on Enter and Space keydown events', () => {
      component.clickable = true;
      let count = 0;
      component.cardClick.subscribe(() => count++);

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(enterEvent, 'preventDefault');
      component.onKeyDown(enterEvent);
      expect(count).toBe(1);
      expect(enterEvent.preventDefault).toHaveBeenCalled();

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(spaceEvent, 'preventDefault');
      component.onKeyDown(spaceEvent);
      expect(count).toBe(2);
      expect(spaceEvent.preventDefault).toHaveBeenCalled();

      const otherEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onKeyDown(otherEvent);
      expect(count).toBe(2);
    });
  });

  describe('content projection', () => {
    let hostFixture: ComponentFixture<TestHostComponent>;
    let hostComp: TestHostComponent;

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [TestHostComponent, StatCardComponent]
      }).compileComponents();

      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComp = hostFixture.componentInstance;
      hostFixture.detectChanges();
    });

    it('projects custom icon, value, and footer templates', () => {
      const customIcon = hostFixture.debugElement.query(By.css('.custom-icon')).nativeElement as HTMLElement;
      expect(customIcon.textContent?.trim()).toBe('🔥');

      const customValue = hostFixture.debugElement.query(By.css('.custom-value')).nativeElement as HTMLElement;
      expect(customValue.textContent?.trim()).toBe('Custom Value 99');

      const customFooter = hostFixture.debugElement.query(By.css('.custom-footer')).nativeElement as HTMLElement;
      expect(customFooter.textContent?.trim()).toBe('Custom Footer Content');
    });

    it('projects seamlessly in horizontal layout as well', () => {
      hostComp.layout = 'horizontal';
      hostFixture.detectChanges();

      const customIcon = hostFixture.debugElement.query(By.css('.stat-icon-wrapper .custom-icon'));
      expect(customIcon).toBeTruthy();

      const customValue = hostFixture.debugElement.query(By.css('.stat-content-col .custom-value'));
      expect(customValue).toBeTruthy();
    });
  });
});
