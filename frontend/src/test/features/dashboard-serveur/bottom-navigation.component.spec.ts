import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BottomNavigationComponent } from '../../../app/features/dashboard-serveur/components/bottom-navigation/bottom-navigation.component';
import { IonicModule } from '@ionic/angular';

describe('BottomNavigationComponent', () => {
  let component: BottomNavigationComponent;
  let fixture: ComponentFixture<BottomNavigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNavigationComponent, IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit tabSelect on onSelect call', () => {
    spyOn(component.tabSelect, 'emit');
    component.onSelect('commande');
    expect(component.tabSelect.emit).toHaveBeenCalledWith('commande');
  });
});
