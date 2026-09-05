import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileTableCardComponent } from '../../../app/features/dashboard-serveur/components/mobile-table-card/mobile-table-card.component';
import { TableView } from '../../../app/features/dashboard-serveur/models/table-view.model';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockTable: TableView = {
  id: 5,
  nom: 'Table 5',
  capacite: 4,
  zone: 'TERRASSE',
  occupee: true,
  commandesActives: [],
};

describe('MobileTableCardComponent', () => {
  let component: MobileTableCardComponent;
  let fixture: ComponentFixture<MobileTableCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileTableCardComponent, getTranslocoTestingModule()],
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileTableCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('table', mockTable);
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute status label as Occupied when occupee is true', () => {
    expect(component.StatusLabel).toBeTruthy();
  });

  it('should emit tableSelect event when clicked', () => {
    spyOn(component.tableSelect, 'emit');
    component.tableSelect.emit(mockTable);
    expect(component.tableSelect.emit).toHaveBeenCalledWith(mockTable);
  });

  it('should emit occupyTable event when occupy button is triggered', () => {
    spyOn(component.occupyTable, 'emit');
    const freeTable: TableView = { ...mockTable, occupee: false };
    fixture.componentRef.setInput('table', freeTable);
    fixture.detectChanges();

    const occupyBtn = fixture.nativeElement.querySelector('[data-testid="mobile-table-occupy-btn-5"]');
    expect(occupyBtn).toBeTruthy();
    occupyBtn.click();
    expect(component.occupyTable.emit).toHaveBeenCalledWith(freeTable);
  });

  it('should emit freeTable event when free button is triggered', () => {
    spyOn(component.freeTable, 'emit');
    const occupiedEmptyTable: TableView = { ...mockTable, occupee: true, commandesActives: [] };
    fixture.componentRef.setInput('table', occupiedEmptyTable);
    fixture.componentRef.setInput('pendingOrdersCount', 0);
    fixture.detectChanges();

    const freeBtn = fixture.nativeElement.querySelector('[data-testid="mobile-table-free-btn-5"]');
    expect(freeBtn).toBeTruthy();
    freeBtn.click();
    expect(component.freeTable.emit).toHaveBeenCalledWith(occupiedEmptyTable);
  });

  it('should compute WaitTimeClass based on waitTimeMinutes', () => {
    component.waitTimeMinutes = 5;
    expect(component.WaitTimeClass).toBe('wait-normal');

    component.waitTimeMinutes = 12;
    expect(component.WaitTimeClass).toBe('wait-warning');

    component.waitTimeMinutes = 25;
    expect(component.WaitTimeClass).toBe('wait-danger');
  });

  it('should render active call banner and emit ackAppel event', () => {
    spyOn(component.ackAppel, 'emit');
    const tableWithCall: TableView = {
      ...mockTable,
      activeAppels: [{ id: 10, tableId: 5, type: 'ASSISTANCE', statut: 'EN_ATTENTE', createdAt: '', updatedAt: '' }],
      activeAppelType: 'ASSISTANCE'
    };
    fixture.componentRef.setInput('table', tableWithCall);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('[data-testid="mobile-card-call-alert-5"]');
    expect(banner).toBeTruthy();

    const ackBtn = compiled.querySelector('[data-testid="btn-card-ack-call-5"]') as HTMLButtonElement;
    expect(ackBtn).toBeTruthy();
    ackBtn.click();

    expect(component.ackAppel.emit).toHaveBeenCalledWith(tableWithCall.activeAppels![0]);
  });
});
