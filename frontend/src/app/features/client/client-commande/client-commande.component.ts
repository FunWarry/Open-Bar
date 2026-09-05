import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ToastController } from '@ionic/angular/standalone';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { CocktailService } from '../../../core/services/cocktail.service';
import { TableSessionService } from '../../../core/services/table-session.service';
import { TableSessionStatus } from '../../../core/models/table-session.model';
import { Cocktail, CocktailFacets, FlavorProfile } from '../../../core/models/cocktail.model';
import { TableCartService } from '../../../core/services/table-cart.service';
import { TableCartItem } from '../../../core/models/table-cart.model';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { FilterChipComponent } from '../../../core/components/ui/filter-chip/filter-chip.component';
import { ProductCardComponent } from '../../../core/components/ui/product-card/product-card.component';
import { CocktailMatcherBarComponent, CocktailMatcherFilters } from '../../../core/components/ui/cocktail-matcher-bar/cocktail-matcher-bar.component';
import { TableAssistanceBarComponent } from '../components/table-assistance-bar/table-assistance-bar.component';

/**
 * Client Commande Component allowing public customers to select a table, browse the menu,
 * select cocktails in a real-time collaborative table cart shared with table companions,
 * call the waiter, request the bill, and submit consolidated orders via QR code.
 * Aligned with Figma Vue Client QR Code specs (`636:988`, `636:1002`, `636:1058`).
 */
@Component({
  selector: 'app-client-commande',
  templateUrl: './client-commande.component.html',
  styleUrls: ['./client-commande.component.css'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    AppCurrencyPipe,
    TranslocoModule,
    InputFieldComponent,
    ActionButtonComponent,
    FilterChipComponent,
    ProductCardComponent,
    CocktailMatcherBarComponent,
    TableAssistanceBarComponent
  ]
})
export class ClientCommandeComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly cocktailService = inject(CocktailService);
  private readonly tableSessionService = inject(TableSessionService);
  readonly tableCartService = inject(TableCartService);
  private readonly toastCtrl = inject(ToastController);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  tableNumero: number | null = null;
  step: 'table' | 'menu' | 'recap' = 'table';
  tableForm!: FormGroup;
  nicknameForm!: FormGroup;

  sessionToken: string | null = null;
  isSessionValid = true;
  isSessionChecking = false;
  sessionStatus: TableSessionStatus | null = null;

  cocktails: Cocktail[] = [];
  filteredCocktails: Cocktail[] = [];
  selectedCategory = 'TOUS';
  catalogFacets: CocktailFacets | null = null;
  selectedFlavors: FlavorProfile[] = [];
  filterMocktail = false;
  filterVegan = false;
  filterGlutenFree = false;
  filterLowAbv = false;
  isLoading = false;
  isSubmitting = false;

  readonly showNicknamePrompt = signal<boolean>(false);
  orderNotes = '';

  private previousSubmittedOrderId: number | null = null;

  constructor() {
    effect(() => {
      const cart = this.tableCartService.cart();
      if (
        cart?.status === 'SUBMITTED' &&
        cart.submittedOrderId &&
        cart.submittedOrderId !== this.previousSubmittedOrderId &&
        !this.isSubmitting
      ) {
        this.previousSubmittedOrderId = cart.submittedOrderId;
        this.notifyOrderSubmittedByPeer(cart.submittedBy, cart.submittedOrderId);
      }
    });
  }

  ngOnInit(): void {
    this.tableForm = this.fb.group({
      tableNumber: ['', [Validators.required, Validators.min(1)]]
    });

    this.nicknameForm = this.fb.group({
      nickname: [this.tableCartService.getGuestName() || '', [Validators.required, Validators.minLength(2)]]
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['token']) {
        this.sessionToken = String(params['token']).trim();
      }
      if (params['table']) {
        const tNum = Number.parseInt(params['table'], 10);
        if (!Number.isNaN(tNum) && tNum > 0) {
          this.tableNumero = tNum;
          this.step = 'menu';
          this.checkSession(this.tableNumero, this.sessionToken);
          this.initTableCart();
          this.loadCocktails();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.tableCartService.reset();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSelectTable(): void {
    if (this.tableForm.invalid) return;
    this.tableNumero = Number.parseInt(this.tableForm.value.tableNumber, 10);
    this.step = 'menu';
    this.checkSession(this.tableNumero, this.sessionToken);
    this.initTableCart();
    this.loadCocktails();
  }

  private initTableCart(): void {
    if (!this.tableNumero) return;

    if (!this.tableCartService.hasGuestName()) {
      this.showNicknamePrompt.set(true);
    }

    this.tableCartService
      .initCart(this.tableNumero, this.sessionToken || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.warn('Failed to initialize shared table cart', err)
      });
  }

  saveNickname(): void {
    if (this.nicknameForm.invalid) return;
    const name = String(this.nicknameForm.value.nickname).trim();
    if (name.length > 0) {
      this.tableCartService.setGuestName(name);
      this.showNicknamePrompt.set(false);
    }
  }

  openNicknamePrompt(): void {
    this.nicknameForm.patchValue({
      nickname: this.tableCartService.getGuestName() || ''
    });
    this.showNicknamePrompt.set(true);
  }

  checkSession(tableId: number, token: string | null): void {
    this.isSessionChecking = true;
    this.tableSessionService
      .validateSession(tableId, token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isSessionChecking = false;
          this.isSessionValid = res.valid;
          this.sessionStatus = res.status ?? null;
          if (res.sessionToken) {
            this.sessionToken = res.sessionToken;
          }
        },
        error: () => {
          this.isSessionChecking = false;
        }
      });
  }

  refreshSession(): void {
    if (!this.tableNumero) return;
    this.isSessionChecking = true;
    this.tableSessionService
      .refreshSession(this.tableNumero)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res) => {
          this.isSessionChecking = false;
          this.isSessionValid = res.valid;
          this.sessionStatus = res.status ?? null;
          if (res.sessionToken) {
            this.sessionToken = res.sessionToken;
          }
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate('CLIENT.SESSION_REFRESH_SUCCESS'),
            duration: 3000,
            color: 'success'
          });
          await toast.present();
        },
        error: async () => {
          this.isSessionChecking = false;
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate('CLIENT.SESSION_REFRESH_ERROR'),
            duration: 4000,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  loadCocktails(): void {
    this.isLoading = true;
    this.cocktailService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Cocktail[]) => {
          this.cocktails = data.filter((c: Cocktail) => c.disponible);
          this.applyCombinedFilters();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });

    this.cocktailService
      .getFacets()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (facets) => {
          this.catalogFacets = facets;
        }
      });
  }

  filterCategory(cat: string): void {
    this.selectedCategory = cat;
    this.applyCombinedFilters();
  }

  onMatcherFiltersChange(filters: CocktailMatcherFilters): void {
    this.selectedFlavors = filters.flavors;
    this.filterMocktail = filters.mocktail;
    this.filterVegan = filters.vegan;
    this.filterGlutenFree = filters.glutenFree;
    this.filterLowAbv = filters.lowAbv;
    this.applyCombinedFilters();
  }

  onResetMatcherFilters(): void {
    this.selectedFlavors = [];
    this.filterMocktail = false;
    this.filterVegan = false;
    this.filterGlutenFree = false;
    this.filterLowAbv = false;
    this.applyCombinedFilters();
  }

  applyCombinedFilters(): void {
    let result = this.selectedCategory === 'TOUS'
      ? [...this.cocktails]
      : this.cocktails.filter((c: Cocktail) => c.categorie === this.selectedCategory);

    if (this.filterMocktail) {
      result = result.filter((c) => c.isMocktail || c.categorie === 'SANS_ALCOOL');
    }
    if (this.filterVegan) {
      result = result.filter((c) => c.isVegan);
    }
    if (this.filterGlutenFree) {
      result = result.filter((c) => c.isGlutenFree);
    }
    if (this.filterLowAbv) {
      result = result.filter((c) => (c.alcoholLevel ?? 0) > 0 && (c.alcoholLevel ?? 0) <= 10.0);
    }
    if (this.selectedFlavors.length > 0) {
      result = result.filter((c) =>
        c.flavorProfiles && this.selectedFlavors.some((f) => c.flavorProfiles!.includes(f))
      );
    }

    this.filteredCocktails = result;
  }

  addToCart(cocktail: Cocktail): void {
    if (!this.tableNumero) return;

    if (!this.tableCartService.hasGuestName()) {
      this.openNicknamePrompt();
      return;
    }

    const guestSessionId = this.tableCartService.getOrCreateGuestSessionId();
    const guestName = this.tableCartService.getGuestName() || 'Guest';

    this.tableCartService
      .addItem(this.tableNumero, {
        guestSessionId,
        guestName,
        cocktailId: cocktail.id,
        quantite: 1
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: async (err: { error?: { message?: string } }) => {
          const toast = await this.toastCtrl.create({
            message: err?.error?.message || 'Error adding item to shared cart',
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  removeFromCart(cocktailId: number): void {
    if (!this.tableNumero) return;

    const guestSessionId = this.tableCartService.getOrCreateGuestSessionId();
    const cart = this.tableCartService.cart();
    if (!cart?.items) return;

    const item = cart.items.find(
      (i) => i.cocktailId === cocktailId && i.guestSessionId === guestSessionId
    );

    if (!item) return;

    if (item.quantite > 1) {
      this.tableCartService
        .updateItem(this.tableNumero, item.id, {
          guestSessionId,
          quantite: item.quantite - 1
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    } else {
      this.tableCartService
        .removeItem(this.tableNumero, item.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }

  removeCartItem(item: TableCartItem): void {
    if (!this.tableNumero) return;
    this.tableCartService
      .removeItem(this.tableNumero, item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  incrementCartItem(item: TableCartItem): void {
    if (!this.tableNumero) return;
    this.tableCartService
      .updateItem(this.tableNumero, item.id, {
        guestSessionId: item.guestSessionId,
        quantite: item.quantite + 1
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  decrementCartItem(item: TableCartItem): void {
    if (!this.tableNumero) return;
    if (item.quantite > 1) {
      this.tableCartService
        .updateItem(this.tableNumero, item.id, {
          guestSessionId: item.guestSessionId,
          quantite: item.quantite - 1
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    } else {
      this.removeCartItem(item);
    }
  }

  getItemQuantity(cocktailId: number): number {
    const guestSessionId = this.tableCartService.getOrCreateGuestSessionId();
    const cart = this.tableCartService.cart();
    if (!cart?.items) return 0;
    const item = cart.items.find(
      (i) => i.cocktailId === cocktailId && i.guestSessionId === guestSessionId
    );
    return item ? item.quantite : 0;
  }

  get totalItemsCount(): number {
    return this.tableCartService.totalItems();
  }

  get totalPrice(): number {
    return this.tableCartService.totalPrice();
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
    const submitReq = {
      guestSessionId: this.tableCartService.getOrCreateGuestSessionId(),
      guestName: this.tableCartService.getGuestName() || 'Guest',
      sessionToken: this.sessionToken || undefined,
      notes: this.orderNotes?.trim() || undefined
    };

    this.tableCartService
      .submitCart(this.tableNumero, submitReq)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res) => {
          this.isSubmitting = false;
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate('CLIENT.SHARED_CART_SUBMIT_SUCCESS'),
            duration: 3000,
            color: 'success'
          });
          await toast.present();
          const orderId = res.commandeId || (res as any).id;
          this.router.navigate(['/client/suivi', orderId]);
        },

        error: async (err: { status?: number; error?: { message?: string } }) => {
          this.isSubmitting = false;
          if (err?.status === 403) {
            this.isSessionValid = false;
          }
          const toast = await this.toastCtrl.create({
            message: err?.error?.message || this.translocoService.translate('CLIENT.SHARED_CART_SUBMIT_ERROR'),
            duration: 4000,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  private async notifyOrderSubmittedByPeer(submittedBy?: string | null, orderId?: number | null): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translocoService.translate('CLIENT.SHARED_CART_OTHER_SUBMITTED', {
        name: submittedBy || 'Un convive'
      }),
      duration: 5000,
      color: 'primary',
      buttons: orderId
        ? [
            {
              text: this.translocoService.translate('CLIENT.ORDER_NOW'),
              handler: () => {
                this.router.navigate(['/client/suivi', orderId]);
              }
            }
          ]
        : undefined
    });
    await toast.present();
    if (orderId && this.step === 'recap') {
      this.router.navigate(['/client/suivi', orderId]);
    }
  }
}
