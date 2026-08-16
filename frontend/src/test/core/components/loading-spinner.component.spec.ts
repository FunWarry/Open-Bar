import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { LoadingSpinnerComponent } from '../../../app/core/components/loading-spinner/loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent, IonicModule.forRoot(), getTranslocoTestingModule()]
    }).compileComponents();

    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create le composant', () => {
    expect(component).toBeTruthy();
  });

  it('isLoading_initial_estFalse', () => {
    expect(component.isLoading).toBeFalse();
  });

  it('show()_appelé_isLoadingPasseÀTrue', () => {
    component.show();
    expect(component.isLoading).toBeTrue();
  });

  it('hide()_appelé_isLoadingPasseÀFalse', () => {
    component.isLoading = true;
    component.hide();
    expect(component.isLoading).toBeFalse();
  });

  it('show()_puisHide()_isLoadingRevientFalse', () => {
    component.show();
    expect(component.isLoading).toBeTrue();
    component.hide();
    expect(component.isLoading).toBeFalse();
  });

  it('hide()_sansShow()_préalable_isLoadingResteÀFalse', () => {
    component.hide();
    expect(component.isLoading).toBeFalse();
  });

  it('show()_appelé_deuxFois_isLoadingResteÀTrue', () => {
    component.show();
    component.show();
    expect(component.isLoading).toBeTrue();
  });
});
