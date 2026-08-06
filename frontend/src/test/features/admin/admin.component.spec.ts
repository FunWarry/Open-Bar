import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { AdminComponent } from '../../../app/features/admin/admin.component';
import { NavigationService } from '../../../app/core/services/navigation.service';
import { UserService } from '../../../app/core/services/user.service';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { EtablissementService } from '../../../app/core/services/etablissement.service';
import { selectCurrentUser } from '../../../app/core/store/auth.selectors';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let storeSpy: jasmine.SpyObj<Store>;
  let navigationServiceSpy: jasmine.SpyObj<NavigationService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;
  let etablissementServiceSpy: jasmine.SpyObj<EtablissementService>;

  const mockUser = {
    id: 1,
    username: 'admin',
    email: 'admin@bar.com',
    roles: ['ADMIN'],
    enabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01')
  };

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(mockUser));

    navigationServiceSpy = jasmine.createSpyObj('NavigationService', [
      'navigateTo',
      'goBack',
      'navigateToHome',
      'navigateToRegister'
    ]);

    userServiceSpy = jasmine.createSpyObj('UserService', ['getUsers']);
    userServiceSpy.getUsers.and.returnValue(of([mockUser as any]));

    cocktailServiceSpy = jasmine.createSpyObj('CocktailService', ['getAll']);
    cocktailServiceSpy.getAll.and.returnValue(of([{ id: 1, nom: 'Mojito' } as any]));

    ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getAll']);
    ingredientServiceSpy.getAll.and.returnValue(of([{ id: 1, nom: 'Rhum' } as any]));

    etablissementServiceSpy = jasmine.createSpyObj('EtablissementService', ['getConfig']);
    etablissementServiceSpy.getConfig.and.returnValue(of({ legalName: 'OpenBar SARL' } as any));

    await TestBed.configureTestingModule({
      imports: [
        AdminComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: CocktailService, useValue: cocktailServiceSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy },
        { provide: EtablissementService, useValue: etablissementServiceSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('currentUser$ should emit the current user from the store', (done) => {
    component.currentUser$.subscribe((user) => {
      expect(user).toEqual(mockUser as any);
      done();
    });
  });

  it('should load live KPI stats in ngOnInit()', (done) => {
    component.userCount$.subscribe(count => {
      expect(count).toBe(1);
      done();
    });
  });
});
