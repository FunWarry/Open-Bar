import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';
import { StatCardComponent } from '../../../app/features/dashboard-manager/components/stat-card/stat-card.component';

describe('StatCardComponent', () => {
  let component: StatCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent, CommonModule, IonCard, IonCardContent]
    }).compileComponents();

    const fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    component.label = 'Test Label';
    component.value = 42;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('trendSymbol getter', () => {
    it('retourne ▲ quand trend est "up"', () => {
      component.trend = 'up';
      expect(component.trendSymbol).toBe('▲');
    });

    it('retourne ▼ quand trend est "down"', () => {
      component.trend = 'down';
      expect(component.trendSymbol).toBe('▼');
    });

    it('retourne ■ quand trend est "neutral"', () => {
      component.trend = 'neutral';
      expect(component.trendSymbol).toBe('■');
    });
  });

  describe('@Input() defaults', () => {
    it('trend vaut "neutral" par défaut', () => {
      const fixture = TestBed.createComponent(StatCardComponent);
      const comp = fixture.componentInstance;
      expect(comp.trend).toBe('neutral');
    });

    it('color vaut "primary" par défaut', () => {
      const fixture = TestBed.createComponent(StatCardComponent);
      const comp = fixture.componentInstance;
      expect(comp.color).toBe('primary');
    });
  });

  describe('@Input() bindings', () => {
    it('accepte une valeur numérique pour value', () => {
      component.value = 100;
      expect(component.value).toBe(100);
    });

    it('accepte une valeur string pour value', () => {
      component.value = '12 %';
      expect(component.value).toBe('12 %');
    });

    it('accepte color "success"', () => {
      component.color = 'success';
      expect(component.color).toBe('success');
    });

    it('accepte color "warning"', () => {
      component.color = 'warning';
      expect(component.color).toBe('warning');
    });

    it('accepte color "danger"', () => {
      component.color = 'danger';
      expect(component.color).toBe('danger');
    });
  });
});
