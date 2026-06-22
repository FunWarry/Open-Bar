import { TestBed } from '@angular/core/testing';
import { HomeComponent } from '../../../app/features/home/home.component';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let storeSpy: jasmine.SpyObj<Store>;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('currentUser$ devrait être un Observable issu du store', (done) => {
    const mockUser = { id: 1, username: 'barman1', role: 'BARMAN' };
    storeSpy.select.and.returnValue(of(mockUser));

    const fixture = TestBed.createComponent(HomeComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    comp.currentUser$.subscribe(user => {
      expect(user).toEqual(mockUser);
      done();
    });
  });

  it('currentUser$ devrait émettre null quand aucun utilisateur connecté', (done) => {
    storeSpy.select.and.returnValue(of(null));

    const fixture = TestBed.createComponent(HomeComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    comp.currentUser$.subscribe(user => {
      expect(user).toBeNull();
      done();
    });
  });

  it('ngOnInit() ne devrait pas lever d\'erreur', () => {
    expect(() => component.ngOnInit()).not.toThrow();
  });
});
