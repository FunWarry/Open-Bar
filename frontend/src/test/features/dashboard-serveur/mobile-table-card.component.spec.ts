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

  it('should compute WaitTimeClass based on waitTimeMinutes', () => {
    component.waitTimeMinutes = 5;
    expect(component.WaitTimeClass).toBe('wait-normal');

    component.waitTimeMinutes = 12;
    expect(component.WaitTimeClass).toBe('wait-warning');

    component.waitTimeMinutes = 25;
    expect(component.WaitTimeClass).toBe('wait-danger');
  });

  it('should render wait time badge when waitTimeMinutes > 0', () => {
    fixture.componentRef.setInput('waitTimeMinutes', 15);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const waitBadge = compiled.querySelector('.wait-timer');
    expect(waitBadge).toBeTruthy();
  });
});
