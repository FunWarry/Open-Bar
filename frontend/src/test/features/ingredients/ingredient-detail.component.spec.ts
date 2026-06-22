import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon
} from '@ionic/angular/standalone';
import { NgIf, NgFor, AsyncPipe, DatePipe } from '@angular/common';
import { IngredientDetailComponent } from '../../../app/features/ingredients/ingredient-detail/ingredient-detail.component';

describe('IngredientDetailComponent', () => {
  let component: IngredientDetailComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let storeSpy: jasmine.SpyObj<Store>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [
        IngredientDetailComponent,
        RouterTestingModule,
        IonCard, IonCardHeader, IonCardTitle, IonCardContent,
        IonList, IonItem, IonLabel, IonBadge, IonButton, IonButtons, IonIcon,
        NgIf, NgFor, AsyncPipe, DatePipe
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: Store, useValue: storeSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } }, params: of({ id: '1' }) }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(IngredientDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isAdmin$ est initialisé depuis le store', () => {
    component.isAdmin$.subscribe(val => {
      expect(val).toBe(false);
    });
  });

  it('cocktailsDataSource est un tableau vide par défaut', () => {
    expect(component.cocktailsDataSource).toEqual([]);
  });

  describe('getStockColor()', () => {
    it('retourne "danger" si stock <= 0', () => {
      expect(component.getStockColor(0)).toBe('danger');
      expect(component.getStockColor(-5)).toBe('danger');
    });

    it('retourne "warning" si stock < 10 et > 0', () => {
      expect(component.getStockColor(1)).toBe('warning');
      expect(component.getStockColor(9)).toBe('warning');
    });

    it('retourne "success" si stock >= 10', () => {
      expect(component.getStockColor(10)).toBe('success');
      expect(component.getStockColor(100)).toBe('success');
    });
  });

  describe('trackById()', () => {
    it('retourne item.id si défini', () => {
      expect(component.trackById(0, { id: 42 })).toBe(42);
    });

    it('retourne index si item.id est undefined', () => {
      expect(component.trackById(3, {})).toBe(3);
    });
  });

  describe('onBack()', () => {
    it('navigue vers /ingredients', () => {
      component.onBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/ingredients']);
    });
  });

  describe('onEdit()', () => {
    it('navigue vers /ingredients/:id/edit', () => {
      component.ingredient = { id: 7 };
      component.onEdit();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/ingredients', 7, 'edit']);
    });
  });

  describe('onViewCocktail()', () => {
    it('navigue vers /cocktails/:id', () => {
      component.onViewCocktail({ id: 99 });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/cocktails', 99]);
    });
  });
});
