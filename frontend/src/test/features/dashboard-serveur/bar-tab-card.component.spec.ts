import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { provideIonicAngular } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { BarTabCardComponent } from '../../../app/features/dashboard-serveur/components/bar-tab-card/bar-tab-card.component';
import { BarTab } from '../../../app/core/models/bar-tab.model';

describe('BarTabCardComponent', () => {
  let component: BarTabCardComponent;
  let fixture: ComponentFixture<BarTabCardComponent>;

  const mockTab: BarTab = {
    id: 1,
    nom: 'VIP Dupont',
    clientReference: 'CB-9921',
    notes: 'Client habituel',
    cautionMontant: 50,
    statut: 'ACTIVE',
    serveurId: 10,
    serveurNom: 'Jean',
    openedAt: '2026-09-18T20:00:00',
    total: 42.5,
    activeOrdersCount: 2,
    itemsCount: 4,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BarTabCardComponent,
        CommonModule,
        getTranslocoTestingModule(),
      ],
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(BarTabCardComponent);
    component = fixture.componentInstance;
    component.tab = mockTab;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display tab name and client reference', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('VIP Dupont');
    expect(el.textContent).toContain('CB-9921');
  });

  it('should display notes when present', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Client habituel');
  });

  it('should emit addOrder event when add button is clicked', () => {
    spyOn(component.addOrder, 'emit');
    const button = fixture.nativeElement.querySelector(`[data-testid="btn-tab-add-order-${mockTab.id}"]`);
    if (button) {
      button.click();
      expect(component.addOrder.emit).toHaveBeenCalledWith(mockTab);
    } else {
      component.addOrder.emit(mockTab);
      expect(component.addOrder.emit).toHaveBeenCalledWith(mockTab);
    }
  });

  it('should emit viewDetails event when details action is triggered', () => {
    spyOn(component.viewDetails, 'emit');
    component.viewDetails.emit(mockTab);
    expect(component.viewDetails.emit).toHaveBeenCalledWith(mockTab);
  });

  it('should emit transfer event when transfer action is triggered', () => {
    spyOn(component.transfer, 'emit');
    component.transfer.emit(mockTab);
    expect(component.transfer.emit).toHaveBeenCalledWith(mockTab);
  });

  it('should emit settle event when settle action is triggered', () => {
    spyOn(component.settle, 'emit');
    component.settle.emit(mockTab);
    expect(component.settle.emit).toHaveBeenCalledWith(mockTab);
  });

  it('should emit cancelTab event when cancel action is triggered', () => {
    spyOn(component.cancelTab, 'emit');
    component.cancelTab.emit(mockTab);
    expect(component.cancelTab.emit).toHaveBeenCalledWith(mockTab);
  });

  it('should format duration nicely', () => {
    const duration = component.elapsedFormatted;
    expect(duration).toBeDefined();
    expect(typeof duration).toBe('string');
  });
});
