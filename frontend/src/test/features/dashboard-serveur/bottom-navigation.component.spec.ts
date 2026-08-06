import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BottomNavigationComponent } from '../../../app/features/dashboard-serveur/components/bottom-navigation/bottom-navigation.component';
import { IonicModule } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('BottomNavigationComponent', () => {
  let component: BottomNavigationComponent;
  let fixture: ComponentFixture<BottomNavigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BottomNavigationComponent,
        IonicModule.forRoot(),
        getTranslocoTestingModule(),
      ],
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

  it('should render badges when counts are greater than 0', () => {
    fixture.componentRef.setInput('cartBadgeCount', 3);
    fixture.componentRef.setInput('pendingOrdersCount', 2);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const cartBadge = compiled.querySelector('.badge:not(.warning)');
    const pendingBadge = compiled.querySelector('.badge.warning');

    expect(cartBadge?.textContent?.trim()).toBe('3');
    expect(pendingBadge?.textContent?.trim()).toBe('2');
  });
});
