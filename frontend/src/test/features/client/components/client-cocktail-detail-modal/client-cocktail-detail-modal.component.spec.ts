import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientCocktailDetailModalComponent } from '../../../../../app/features/client/components/client-cocktail-detail-modal/client-cocktail-detail-modal.component';
import { Cocktail } from '../../../../../app/core/models/cocktail.model';
import { getTranslocoTestingModule } from '../../../../transloco-testing.module';

describe('ClientCocktailDetailModalComponent', () => {
  let component: ClientCocktailDetailModalComponent;
  let fixture: ComponentFixture<ClientCocktailDetailModalComponent>;

  const baseCocktail: Cocktail = {
    id: 42,
    nom: 'Signature Mojito',
    description: 'Fresh mint, lime, and artisanal cane syrup',
    prix: 10.0,
    categorie: 'ALCOOLISE',
    disponible: true,
    saisonnier: false,
    imageUrl: '/uploads/mojito.png',
    isMocktail: false,
    alcoholLevel: 12.5,
    isVegan: true,
    isGlutenFree: true,
    flavorProfiles: ['FRUITY', 'HERBAL'],
    glassware: { id: 1, nom: 'Tumbler Highball', contenanceCl: 30, isPredefined: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    secondaryGlassware: { id: 2, nom: 'Shot Glass', contenanceCl: 4, isPredefined: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    companionGlassTitle: 'Chaser Prosecco',
    ingredients: [
      { id: 1, ingredientId: 10, ingredientNom: 'White Rum', quantite: 50, uniteMesure: 'ml' },
      { id: 2, ingredientId: 11, ingredientNom: 'Fresh Mint', quantite: 10, uniteMesure: 'feuilles' },
      { id: 3, ingredientId: 12, ingredientNom: 'Cane Syrup', quantite: 20, uniteMesure: 'ml', allergens: ['SULFITES'] }
    ],
    variantes: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientCocktailDetailModalComponent, getTranslocoTestingModule()]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientCocktailDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should keep modal content hidden when cocktail is null', () => {
    expect(component).toBeTruthy();
    const card = fixture.nativeElement.querySelector('[data-testid="cocktail-details-card"]');
    expect(card).toBeNull();
  });

  it('should render compact horizontal hero and ingredients without recipe quantities', () => {
    component.cocktail = baseCocktail;
    component.effectivePrice = 10.0;
    component.quantity = 0;
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('[data-testid="cocktail-details-title"]');
    const price = fixture.nativeElement.querySelector('[data-testid="cocktail-details-price"]');
    const desc = fixture.nativeElement.querySelector('[data-testid="cocktail-details-desc"]');
    const ingredientItems = fixture.nativeElement.querySelectorAll('[data-testid="cocktail-ingredient-item"]');
    const allergenBadge = fixture.nativeElement.querySelector('[data-testid="ingredient-allergen-badge"]');
    const glasswareChips = fixture.nativeElement.querySelectorAll('[data-testid="cocktail-glass-chip"]');
    const ingredientsSectionText =
      fixture.nativeElement.querySelector('[data-testid="cocktail-ingredients-section"]')?.textContent ?? '';

    expect(title?.textContent?.trim()).toBe('Signature Mojito');
    expect(price?.textContent).toContain('10');
    expect(desc?.textContent).toContain('Fresh mint, lime');
    expect(ingredientItems).toHaveSize(3);
    expect(allergenBadge?.textContent).toContain('SULFITES');
    expect(glasswareChips).toHaveSize(2);
    expect(ingredientsSectionText).toContain('White Rum');
    expect(ingredientsSectionText).not.toContain('50 ml');
    expect(ingredientsSectionText).not.toContain('10 feuilles');
    expect(ingredientsSectionText).not.toContain('20 ml');
  });

  it('should display Happy Hour discount badges when active', () => {
    component.cocktail = baseCocktail;
    component.effectivePrice = 7.5;
    component.isHappyHour = true;
    component.discountPercentage = 25;
    fixture.detectChanges();

    const originalPrice = fixture.nativeElement.querySelector('[data-testid="cocktail-details-original-price"]');
    const hhBadge = fixture.nativeElement.querySelector('[data-testid="cocktail-details-hh-badge"]');
    const discountBadge = fixture.nativeElement.querySelector('[data-testid="cocktail-details-discount-badge"]');

    expect(originalPrice).toBeTruthy();
    expect(hhBadge).toBeTruthy();
    expect(discountBadge?.textContent?.trim()).toBe('-25%');
  });

  it('should render multi-glass entries and empty ingredients message when applicable', () => {
    const multiGlassCocktail: Cocktail = {
      ...baseCocktail,
      glasses: [
        { glasswareId: 1, glasswareNom: 'Coupe', roleLabel: 'Coupe principale', isPrimary: true, glassOrder: 1 },
        { glasswareId: 2, glasswareNom: 'Shot', roleLabel: 'Shot compagnon', isPrimary: false, glassOrder: 2 }
      ],
      ingredients: []
    };
    component.cocktail = multiGlassCocktail;
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('[data-testid="cocktail-glass-chip"]');
    const emptyText = fixture.nativeElement.querySelector('[data-testid="empty-ingredients-text"]');
    expect(chips).toHaveSize(2);
    expect(chips[0]?.textContent).toContain('Coupe principale');
    expect(chips[1]?.textContent).toContain('Shot compagnon');
    expect(emptyText).toBeTruthy();
  });

  it('should emit addItem, removeItem, and closed events from footer and header controls', () => {
    spyOn(component.addItem, 'emit');
    spyOn(component.removeItem, 'emit');
    spyOn(component.closed, 'emit');

    component.cocktail = baseCocktail;
    component.effectivePrice = 10.0;
    component.quantity = 2;
    fixture.detectChanges();

    const plusBtn = fixture.nativeElement.querySelector('[data-testid="modal-cocktail-plus"]') as HTMLButtonElement;
    const minusBtn = fixture.nativeElement.querySelector('[data-testid="modal-cocktail-minus"]') as HTMLButtonElement;
    const qtyEl = fixture.nativeElement.querySelector('[data-testid="modal-cocktail-qty"]') as HTMLElement;
    const closeFooterBtn = fixture.nativeElement.querySelector('[data-testid="btn-close-details-footer"]') as HTMLButtonElement;
    const closeHeaderBtn = fixture.nativeElement.querySelector('[data-testid="btn-close-cocktail-details"]') as HTMLButtonElement;

    expect(qtyEl.textContent?.trim()).toBe('2');

    plusBtn.click();
    expect(component.addItem.emit).toHaveBeenCalledWith(baseCocktail);

    minusBtn.click();
    expect(component.removeItem.emit).toHaveBeenCalledWith(42);

    closeFooterBtn.click();
    expect(component.closed.emit).toHaveBeenCalledTimes(1);

    closeHeaderBtn.click();
    expect(component.closed.emit).toHaveBeenCalledTimes(2);
  });

  it('should not emit events when cocktail is null and should resolve fallback images cleanly', () => {
    spyOn(component.closed, 'emit');
    spyOn(component.addItem, 'emit');
    spyOn(component.removeItem, 'emit');

    component.cocktail = null;
    component.onClose();
    component.onAdd();
    component.onRemove();

    expect(component.closed.emit).not.toHaveBeenCalled();
    expect(component.addItem.emit).not.toHaveBeenCalled();
    expect(component.removeItem.emit).not.toHaveBeenCalled();

    expect(component.resolveImageUrl()).toBe(component.fallbackImageUrl);
    expect(component.resolveImageUrl('/uploads/drink.png')).toContain('/uploads/drink.png');
    expect(component.resolveImageUrl('https://cdn.example/drink.png')).toBe('https://cdn.example/drink.png');

    const img = document.createElement('img');
    img.src = 'https://invalid.local/broken.png';
    component.onImageError({ target: img } as unknown as Event);
    expect(img.src).toContain(component.fallbackImageUrl);
  });
});
