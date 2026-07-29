import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ToastController } from '@ionic/angular/standalone';
import { CocktailService } from '../../../core/services/cocktail.service';
import { CommandeService } from '../../../core/services/commande.service';
import { Cocktail } from '../../../core/models/cocktail.model';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';

export interface CartItem {
  cocktail: Cocktail;
  quantite: number;
}

/**
 * Client Commande Component allowing public customers to select a table, browse the menu,
 * select cocktails with quantity, and submit an order via QR code.
 * Aligned with Figma Vue Client QR Code specs (`636:988`, `636:1002`, `636:1058`).
 */
@Component({
  selector: 'app-client-commande',
  templateUrl: './client-commande.component.html',
  styleUrls: ['./client-commande.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    TranslocoModule,
    InputFieldComponent,
    ActionButtonComponent
  ]
})
export class ClientCommandeComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly cocktailService = inject(CocktailService);
  private readonly commandeService = inject(CommandeService);
  private readonly toastCtrl = inject(ToastController);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  tableNumero: number | null = null;
  step: 'table' | 'menu' | 'recap' = 'table';
  tableForm!: FormGroup;

  cocktails: Cocktail[] = [];
  filteredCocktails: Cocktail[] = [];
  selectedCategory = 'TOUS';
  cart: Map<number, CartItem> = new Map();
  isLoading = false;
  isSubmitting = false;

  ngOnInit(): void {
    this.tableForm = this.fb.group({
      tableNumber: ['', [Validators.required, Validators.min(1)]]
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['table']) {
        const tNum = Number.parseInt(params['table'], 10);
        if (!Number.isNaN(tNum) && tNum > 0) {
          this.tableNumero = tNum;
          this.step = 'menu';
          this.loadCocktails();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSelectTable(): void {
    if (this.tableForm.invalid) return;
    this.tableNumero = Number.parseInt(this.tableForm.value.tableNumber, 10);
    this.step = 'menu';
    this.loadCocktails();
  }

  loadCocktails(): void {
    this.isLoading = true;
    this.cocktailService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Cocktail[]) => {
          this.cocktails = data.filter((c: Cocktail) => c.disponible);
          this.filterCategory(this.selectedCategory);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  filterCategory(cat: string): void {
    this.selectedCategory = cat;
    if (cat === 'TOUS') {
      this.filteredCocktails = [...this.cocktails];
    } else {
      this.filteredCocktails = this.cocktails.filter((c: Cocktail) => c.categorie === cat);
    }
  }

  addToCart(cocktail: Cocktail): void {
    const existing = this.cart.get(cocktail.id);
    if (existing) {
      existing.quantite += 1;
    } else {
      this.cart.set(cocktail.id, { cocktail, quantite: 1 });
    }
  }

  removeFromCart(cocktailId: number): void {
    const existing = this.cart.get(cocktailId);
    if (!existing) return;
    if (existing.quantite > 1) {
      existing.quantite -= 1;
    } else {
      this.cart.delete(cocktailId);
    }
  }

  getItemQuantity(cocktailId: number): number {
    return this.cart.get(cocktailId)?.quantite || 0;
  }

  get cartItemsList(): CartItem[] {
    return Array.from(this.cart.values());
  }

  get totalItemsCount(): number {
    let total = 0;
    for (const item of this.cart.values()) {
      total += item.quantite;
    }
    return total;
  }

  get totalPrice(): number {
    let total = 0;
    for (const item of this.cart.values()) {
      total += item.cocktail.prix * item.quantite;
    }
    return total;
  }

  goToRecap(): void {
    if (this.totalItemsCount === 0) return;
    this.step = 'recap';
  }

  backToMenu(): void {
    this.step = 'menu';
  }

  submitOrder(): void {
    if (this.totalItemsCount === 0 || !this.tableNumero || this.isSubmitting) return;

    this.isSubmitting = true;
    const commandeData = {
      tableId: this.tableNumero,
      items: this.cartItemsList.map((item) => ({
        cocktailId: item.cocktail.id,
        quantite: item.quantite
      }))
    };

    this.commandeService
      .create(commandeData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (commandeCreated) => {
          this.isSubmitting = false;
          const toast = await this.toastCtrl.create({
            message: 'Commande transmise avec succès au bar !',
            duration: 3000,
            color: 'success'
          });
          await toast.present();
          this.router.navigate(['/client/suivi', commandeCreated.id]);
        },
        error: async (err: { error?: { message?: string } }) => {
          this.isSubmitting = false;
          const toast = await this.toastCtrl.create({
            message: err?.error?.message || 'Erreur lors du passage de la commande.',
            duration: 4000,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }
}
