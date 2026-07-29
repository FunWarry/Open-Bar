import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { ClientCommandeComponent } from '../../../app/features/client/client-commande/client-commande.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { CommandeService } from '../../../app/core/services/commande.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { Cocktail } from '../../../app/core/models/cocktail.model';

describe('ClientCommandeComponent', () => {
  let component: ClientCommandeComponent;
  let fixture: ComponentFixture<ClientCommandeComponent>;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const mockCocktail: Cocktail = {
    id: 1,
    nom: 'Mojito',
    categorie: 'ALCOOLISE',
    prix: 8.5,
    disponible: true,
    description: 'Menthe, citron, rhum',
    ingredients: [],
    variantes: [],
    saisonnier: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  };

  beforeEach(async () => {
    cocktailServiceSpy = jasmine.createSpyObj('CocktailService', ['getAll']);
    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['create']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);

    cocktailServiceSpy.getAll.and.returnValue(of([mockCocktail]));
    toastCtrlSpy.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    await TestBed.configureTestingModule({
      imports: [
        ClientCommandeComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: CocktailService, useValue: cocktailServiceSpy },
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientCommandeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start at table step', () => {
    expect(component.step).toBe('table');
  });

  it('should advance to menu step when valid table number is submitted', () => {
    component.tableForm.setValue({ tableNumber: 4 });
    component.onSelectTable();
    expect(component.tableNumero).toBe(4);
    expect(component.step).toBe('menu');
    expect(cocktailServiceSpy.getAll).toHaveBeenCalled();
  });

  it('should add and remove items from cart', () => {
    component.addToCart(mockCocktail);
    expect(component.getItemQuantity(1)).toBe(1);
    expect(component.totalPrice).toBe(8.5);

    component.removeFromCart(1);
    expect(component.getItemQuantity(1)).toBe(0);
  });
});
