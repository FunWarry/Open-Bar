import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HomeComponent } from '../../../app/features/home/home.component';
import { Store } from '@ngrx/store';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { selectCurrentUser, selectIsAdmin, selectIsBarman, selectIsManager, selectIsServeur } from '../../../app/core/store/auth.selectors';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let storeSpy: jasmine.SpyObj<Store>;
  let router: Router;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);

    storeSpy.select.and.callFake((selector: any) => {
      if (selector === selectCurrentUser) return of({ username: 'testuser', roles: ['SERVEUR'] });
      if (selector === selectIsAdmin) return of(false);
      if (selector === selectIsManager) return of(false);
      if (selector === selectIsBarman) return of(false);
      if (selector === selectIsServeur) return of(true);
      return of(null);
    });

    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });

  it('currentUser$ devrait émettre l\'utilisateur courant', (done) => {
    component.currentUser$.subscribe(user => {
      expect(user).toEqual({ username: 'testuser', roles: ['SERVEUR'] });
      done();
    });
  });

  it('isServeur$ devrait émettre true pour le rôle SERVEUR', (done) => {
    component.isServeur$.subscribe(val => {
      expect(val).toBeTrue();
      done();
    });
  });

  it('navigateTo() devrait appeler router.navigate avec le bon chemin', () => {
    component.navigateTo('/serveur');
    expect(router.navigate).toHaveBeenCalledWith(['/serveur']);
  });
});
