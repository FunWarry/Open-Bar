import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileTableCardComponent } from '../../../app/features/dashboard-serveur/components/mobile-table-card/mobile-table-card.component';
import { TableView } from '../../../app/features/dashboard-serveur/models/table-view.model';
import { provideIonicAngular } from '@ionic/angular/standalone';

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
      imports: [MobileTableCardComponent],
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileTableCardComponent);
    component = fixture.componentInstance;
    component.table = mockTable;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute status label as Occupée when occupee is true', () => {
    expect(component.StatusLabel).toBe('Occupée');
  });

  it('should emit select event when clicked', () => {
    spyOn(component.select, 'emit');
    component.select.emit(mockTable);
    expect(component.select.emit).toHaveBeenCalledWith(mockTable);
  });
});
