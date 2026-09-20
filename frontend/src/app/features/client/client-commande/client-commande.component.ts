import { Component, OnInit, OnDestroy, inject, signal, effect, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ToastController, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  funnelOutline,
  closeCircleOutline,
  nutritionOutline,
  leafOutline,
  eggOutline,
  wineOutline,
  restaurantOutline,
  personOutline,
  shareSocialOutline,
  copyOutline,
  checkmarkOutline,
  qrCodeOutline,
  closeOutline,
  informationCircleOutline,
  addOutline,
  removeOutline,
  receiptOutline,
  timerOutline,
  peopleOutline,
  shieldCheckmarkOutline,
  hourglassOutline,
  checkmarkCircleOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { CocktailService } from '../../../core/services/cocktail.service';
import { HappyHourService } from '../../../core/services/happy-hour.service';
import { TableSessionService } from '../../../core/services/table-session.service';
import { TableJoinRequest, TableSessionStatus } from '../../../core/models/table-session.model';
import { Cocktail, CocktailFacets, FlavorProfile } from '../../../core/models/cocktail.model';
import { DEFAULT_ALLERGEN_OPTIONS } from '../../../core/models/ingredient.model';
import { TableCartService } from '../../../core/services/table-cart.service';
import { TableCartItem } from '../../../core/models/table-cart.model';
import { WebSocketService } from '../../../core/services/websocket.service';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { SearchBarComponent } from '../../../core/components/ui/search-bar/search-bar.component';
import { ProductCardComponent } from '../../../core/components/ui/product-card/product-card.component';
import { CocktailMatcherBarComponent, CocktailMatcherFilters } from '../../../core/components/ui/cocktail-matcher-bar/cocktail-matcher-bar.component';
import { TableAssistanceBarComponent } from '../components/table-assistance-bar/table-assistance-bar.component';

/**
 * Navigation steps for the customer QR order lifecycle.
 */
export type ClientCommandeStep = 'table' | 'menu' | 'recap';

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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AppCurrencyPipe,
    TranslocoModule,
    IonIcon,
    InputFieldComponent,
    ActionButtonComponent,
    SearchBarComponent,
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
  private readonly happyHourService = inject(HappyHourService, { optional: true });
  private readonly tableSessionService = inject(TableSessionService);
  readonly tableCartService = inject(TableCartService);
  private readonly webSocketService = inject(WebSocketService, { optional: true });
  private readonly toastCtrl = inject(ToastController);
  private readonly translocoService = inject(TranslocoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  tableNumero: number | null = null;
  private _step: ClientCommandeStep = 'table';
  get step(): ClientCommandeStep {
    return this._step;
  }
  set step(val: ClientCommandeStep) {
    this._step = val;
    this.cdr.markForCheck();
  }

  tableForm!: FormGroup;
  nicknameForm!: FormGroup;

  sessionToken: string | null = null;
  private _isSessionValid = true;
  get isSessionValid(): boolean {
    return this._isSessionValid;
  }
  set isSessionValid(val: boolean) {
    this._isSessionValid = val;
    this.cdr.markForCheck();
  }
  isSessionChecking = false;
  sessionStatus: TableSessionStatus | null = null;

  cocktails: Cocktail[] = [];
  filteredCocktails: Cocktail[] = [];
  searchQuery = '';
  selectedCategory = 'ALL';
  readonly categories = ['ALL', 'ALCOOLISE', 'SANS_ALCOOL', 'SHOT', 'APERITIF', 'DIGESTIF', 'SPECIAL'] as const;
  selectedAllergens: string[] = [];
  readonly availableAllergens = DEFAULT_ALLERGEN_OPTIONS;
  catalogFacets: CocktailFacets | null = null;
  selectedFlavors: FlavorProfile[] = [];
  filterMocktail = false;
  filterVegan = false;
  filterGlutenFree = false;
  filterLowAbv = false;
  isLoading = false;
  isSubmitting = false;

  readonly showNicknamePrompt = signal<boolean>(false);
  readonly showInviteModal = signal<boolean>(false);
  readonly copiedLinkSuccess = signal<boolean>(false);
  readonly selectedCocktailForDetails = signal<Cocktail | null>(null);
  readonly isJoinPending = signal<boolean>(false);
  readonly isJoinRejected = signal<boolean>(false);
  readonly tableOwnerName = signal<string | null>(null);
  readonly showTableOrdersModal = signal<boolean>(false);
  joinRequestNameForm!: FormGroup;
  orderNotes = '';

  private previousSubmittedOrderId: number | null = null;

  constructor() {
    addIcons({
      funnelOutline,
      closeCircleOutline,
      nutritionOutline,
      leafOutline,
      eggOutline,
      wineOutline,
      restaurantOutline,
      personOutline,
      shareSocialOutline,
      copyOutline,
      checkmarkOutline,
      qrCodeOutline,
      closeOutline,
      informationCircleOutline,
      addOutline,
      removeOutline,
      receiptOutline,
      timerOutline,
      peopleOutline,
      shieldCheckmarkOutline,
      hourglassOutline,
      checkmarkCircleOutline,
      alertCircleOutline
    });

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

    this.joinRequestNameForm = this.fb.group({
      applicantName: [this.tableCartService.getGuestName() || '', [Validators.required, Validators.minLength(2)]]
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

    if (this.happyHourService) {
      this.happyHourService.loadRules().pipe(takeUntil(this.destroy$)).subscribe();
    }

    this.initWebSocketSubscription();
  }

  /**
   * Checks whether a cocktail is currently under Happy Hour.
   */
  isHappyHour(cocktail: Cocktail): boolean {
    return this.happyHourService?.resolvePrice(cocktail.prix, cocktail.id, cocktail.categorie).isHappyHour ?? false;
  }

  /**
   * Resolves the current effective price for a cocktail.
   */
  getEffectivePrice(cocktail: Cocktail): number {
    return this.happyHourService?.resolvePrice(cocktail.prix, cocktail.id, cocktail.categorie).effectivePrice ?? cocktail.prix;
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

  /**
   * Opens the invite friends modal dialog.
   */
  openInviteModal(): void {
    this.copiedLinkSuccess.set(false);
    this.showInviteModal.set(true);
  }

  /**
   * Closes the invite friends modal dialog.
   */
  closeInviteModal(): void {
    this.showInviteModal.set(false);
  }

  /**
   * Opens the cocktail details modal displaying its ingredients (excluding quantities).
   *
   * @param cocktail The selected cocktail
   */
  openCocktailDetails(cocktail: Cocktail): void {
    this.selectedCocktailForDetails.set(cocktail);
  }

  /**
   * Closes the cocktail details modal.
   */
  closeCocktailDetails(): void {
    this.selectedCocktailForDetails.set(null);
  }

  /**
   * Handles click on modal backdrop to dismiss dialog.
   *
   * @param event Mouse click event
   */
  onDetailsBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('cocktail-details-dialog')) {
      this.closeCocktailDetails();
    }
  }

  /**
   * Generates the direct URL allowing friends to join this table session.
   *
   * @returns Complete ordering URL with table and session token.
   */
  getInviteUrl(): string {
    if (!this.tableNumero) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://openbar.lan';
    let url = `${origin}/client/commande?table=${this.tableNumero}`;
    if (this.sessionToken) {
      url += `&token=${encodeURIComponent(this.sessionToken)}`;
    }
    return url;
  }

  /**
   * Returns the API endpoint URL for the on-screen table session QR code.
   *
   * @returns QR code image URL.
   */
  getInviteQrCodeUrl(): string {
    if (!this.tableNumero) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return this.tableSessionService.getSessionQrCodeUrl(this.tableNumero, this.sessionToken, 'PNG', 300, origin);
  }

  /**
   * Closes the invite modal when user clicks on backdrop.
   *
   * @param event Mouse click event.
   */
  onInviteBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeInviteModal();
    }
  }

  /**
   * Copies the direct invite URL to the system clipboard and notifies user via toast.
   */
  async copyInviteLink(): Promise<void> {
    const url = this.getInviteUrl();
    if (!url) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      this.copiedLinkSuccess.set(true);
      const toast = await this.toastCtrl.create({
        message: this.translocoService.translate('CLIENT.INVITE_LINK_COPIED_TOAST'),
        duration: 3000,
        color: 'success'
      });
      await toast.present();
      setTimeout(() => this.copiedLinkSuccess.set(false), 4000);
    } catch (e) {
      console.warn('Failed to copy invite link', e);
    }
  }

  /**
   * Triggers native Web Share API if supported, or falls back to copying link.
   */
  async shareInviteNative(): Promise<void> {
    const url = this.getInviteUrl();
    if (!url) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: this.translocoService.translate('CLIENT.INVITE_SHARE_TITLE', { table: this.tableNumero }),
          text: this.translocoService.translate('CLIENT.INVITE_SHARE_TEXT', { table: this.tableNumero }),
          url
        });
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name !== 'AbortError') {
          await this.copyInviteLink();
        }
      }
    } else {
      await this.copyInviteLink();
    }
  }

  /**
   * Checks whether the current browser environment supports the Web Share API.
   */
  canShareNative(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  checkSession(tableId: number, token: string | null): void {
    this.isSessionChecking = true;
    const guestSessionId = this.tableCartService.getOrCreateGuestSessionId();
    const guestName = this.tableCartService.getGuestName();

    this.tableSessionService
      .validateSession(tableId, token, guestSessionId, guestName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isSessionChecking = false;
          this.isSessionValid = res.valid;
          this.sessionStatus = res.status ?? null;
          this.tableOwnerName.set(res.ownerGuestName || null);
          this.tableCartService.setOwnership(!!res.isOwner, res.ownerGuestName);

          if (res.isOwner) {
            this.tableSessionService
              .getPendingJoinRequests(tableId, guestSessionId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (reqs) => this.tableCartService.setPendingJoinRequests(reqs),
                error: (err) => console.warn('Failed to load pending join requests', err)
              });
          }

          if (res.sessionToken) {
            const tokenChanged = this.sessionToken !== res.sessionToken;
            this.sessionToken = res.sessionToken;
            if (tokenChanged && this.tableNumero) {
              this.tableCartService.initCart(this.tableNumero, this.sessionToken).pipe(takeUntil(this.destroy$)).subscribe();
            }
          }
        },
        error: () => {
          this.isSessionChecking = false;
        }
      });
  }

  /**
   * Submits a request to the table host to join an occupied table.
   */
  submitJoinRequest(): void {
    if (!this.tableNumero || this.joinRequestNameForm.invalid) return;
    const applicantName = String(this.joinRequestNameForm.value.applicantName).trim();
    if (!applicantName) return;

    this.tableCartService.setGuestName(applicantName);
    const guestSessionId = this.tableCartService.getOrCreateGuestSessionId();

    this.isJoinPending.set(true);
    this.isJoinRejected.set(false);

    // Watch for host's live response via WebSocket
    if (this.webSocketService) {
      this.webSocketService
        .watch(`/topic/tables/${this.tableNumero}/join-requests/${guestSessionId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (msg) => {
            try {
              const res = JSON.parse(msg.body);
              if (res.status === 'APPROVED' && res.sessionToken) {
                this.sessionToken = res.sessionToken;
                this.isSessionValid = true;
                this.isJoinPending.set(false);
                this.isJoinRejected.set(false);
                this.initTableCart();
                this.loadCocktails();
                this.toastCtrl.create({
                  message: this.translocoService.translate('CLIENT.JOIN_APPROVAL_ACCEPT_BTN'),
                  duration: 3000,
                  color: 'success'
                }).then(t => t.present());
              } else if (res.status === 'REJECTED') {
                this.isJoinPending.set(false);
                this.isJoinRejected.set(true);
              }
            } catch (e) {
              console.warn('Error parsing join request response', e);
            }
          }
        });
    }

    this.tableSessionService
      .submitJoinRequest(this.tableNumero, guestSessionId, applicantName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => {
          console.warn('Failed to submit join request', err);
          this.isJoinPending.set(false);
        }
      });
  }

  /**
   * Resets the join request state so patron can try again.
   */
  retryJoinRequest(): void {
    this.isJoinPending.set(false);
    this.isJoinRejected.set(false);
  }

  /**
   * Approves an applicant's join request to this table.
   *
   * @param request Join request to approve
   */
  acceptApplicant(request: TableJoinRequest): void {
    if (!this.tableNumero || !request.id) return;
    const ownerSessionId = this.tableCartService.getOrCreateGuestSessionId();
    this.tableSessionService
      .respondToJoinRequest(this.tableNumero, request.id, ownerSessionId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const current = this.tableCartService.pendingJoinRequests();
          this.tableCartService.setPendingJoinRequests(current.filter(r => r.id !== request.id));
        },
        error: (err) => console.warn('Failed to accept join request', err)
      });
  }

  /**
   * Declines an applicant's join request.
   *
   * @param request Join request to decline
   */
  declineApplicant(request: TableJoinRequest): void {
    if (!this.tableNumero || !request.id) return;
    const ownerSessionId = this.tableCartService.getOrCreateGuestSessionId();
    this.tableSessionService
      .respondToJoinRequest(this.tableNumero, request.id, ownerSessionId, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const current = this.tableCartService.pendingJoinRequests();
          this.tableCartService.setPendingJoinRequests(current.filter(r => r.id !== request.id));
        },
        error: (err) => console.warn('Failed to decline join request', err)
      });
  }

  /**
   * Finalizes the 2-minute grouping grace period immediately.
   */
  finalizeGracePeriod(): void {
    if (!this.tableNumero) return;
    this.tableCartService
      .finalizeGrace(this.tableNumero)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: this.translocoService.translate('CLIENT.SHARED_CART_SUBMIT_SUCCESS'),
            duration: 3000,
            color: 'success'
          });
          await toast.present();
        },
        error: (err) => console.warn('Failed to finalize grace period', err)
      });
  }

  /**
   * Opens the table orders and running bill tracking modal.
   */
  openTableOrdersModal(): void {
    if (this.tableNumero) {
      this.tableCartService.fetchTableOrdersSummary(this.tableNumero).subscribe();
    }
    this.showTableOrdersModal.set(true);
  }

  /**
   * Closes the table orders modal.
   */
  closeTableOrdersModal(): void {
    this.showTableOrdersModal.set(false);
  }

  /**
   * Dismiss modal on backdrop click.
   *
   * @param event Mouse click event
   */
  onTableOrdersBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeTableOrdersModal();
    }
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
            this.tableCartService.initCart(this.tableNumero!, this.sessionToken).pipe(takeUntil(this.destroy$)).subscribe();
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

  /**
   * Retrieves allergen keys present in a cocktail based strictly on its ingredients' declared allergens.
   *
   * @param cocktail Target cocktail model
   * @returns List of matching allergen keys
   */
  getCocktailAllergens(cocktail: Cocktail): string[] {
    if (!cocktail) return [];
    const allergens = new Set<string>();

    if (cocktail.ingredients) {
      for (const item of cocktail.ingredients) {
        if (item.allergens && Array.isArray(item.allergens)) {
          for (const a of item.allergens) {
            allergens.add(a);
          }
        }
      }
    }

    if (cocktail.isGlutenFree) {
      allergens.delete('GLUTEN');
    }
    if (cocktail.isVegan) {
      allergens.delete('LAIT');
      allergens.delete('OEUF');
    }

    return Array.from(allergens);
  }

  /**
   * Toggles allergen exclusion filter state.
   *
   * @param allergenKey Allergen key to toggle
   */
  toggleAllergenFilter(allergenKey: string): void {
    const idx = this.selectedAllergens.indexOf(allergenKey);
    if (idx >= 0) {
      this.selectedAllergens.splice(idx, 1);
    } else {
      this.selectedAllergens.push(allergenKey);
    }
    this.applyCombinedFilters();
  }

  /**
   * Clears all active allergen exclusion filters.
   */
  clearAllergenFilters(): void {
    this.selectedAllergens = [];
    this.applyCombinedFilters();
  }

  /**
   * Resolves category badge dot indicator color for Figma-style pill badges.
   *
   * @param category Category name
   * @returns Color hex string
   */
  getCategoryDotColor(category: string): string {
    switch (category) {
      case 'ALCOOLISE': return 'var(--types-alcoholic)';
      case 'SANS_ALCOOL': return 'var(--types-nonalcoholic)';
      case 'SHOT': return 'var(--types-shot)';
      case 'APERITIF': return 'var(--semantic-warning)';
      case 'DIGESTIF': return 'var(--semantic-danger)';
      case 'SPECIAL': return 'var(--types-cocktail)';
      default: return 'var(--primary)';
    }
  }

  /**
   * Resolves dynamic background, border, and text styles with transparency levels for category badges.
   *
   * @param category Category name
   * @param isActive Active state flag
   * @returns Style object with CSS variables
   */
  getCategoryPillStyle(category: string, isActive = false): Record<string, string> {
    const color = this.getCategoryDotColor(category);
    if (isActive) {
      return {
        'background-color': color,
        'border-color': color,
        'color': 'var(--text-on-accent, var(--text-primary))',
        'box-shadow': '0 2px 10px var(--shadow-color, rgba(0, 0, 0, 0.25))'
      };
    }
    return {
      'background-color': 'var(--background-surface-2)',
      'border-color': 'var(--border-medium)',
      'color': 'var(--text-primary)'
    };
  }

  /**
   * Subscribes to live WebSocket topics for real-time synchronization
   * of cocktail availability and catalog modifications.
   */
  private initWebSocketSubscription(): void {
    if (!this.webSocketService) return;

    // 1. Live cocktail updates & availability changes
    this.webSocketService.watch('/topic/cocktails')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msg) => {
          try {
            const updatedCocktail: Cocktail = JSON.parse(msg.body);
            if (updatedCocktail?.id) {
              const idx = this.cocktails.findIndex(c => c.id === updatedCocktail.id);
              if (updatedCocktail.disponible) {
                if (idx !== -1) {
                  this.cocktails[idx] = updatedCocktail;
                  this.cocktails = [...this.cocktails];
                } else {
                  this.cocktails = [updatedCocktail, ...this.cocktails];
                }
              } else if (idx !== -1) {
                // If it became unavailable, clients must NOT see it
                this.cocktails = this.cocktails.filter(c => c.id !== updatedCocktail.id);
              }
              this.applyCombinedFilters();
            }
          } catch {
            // Ignore malformed payload
          }
        },
      });

    // 2. Live cocktail deletions
    this.webSocketService.watch('/topic/cocktails/supprime')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msg) => {
          try {
            const payload = JSON.parse(msg.body);
            if (payload?.id) {
              this.cocktails = this.cocktails.filter(c => c.id !== payload.id);
              this.applyCombinedFilters();
            }
          } catch {
            // Ignore malformed payload
          }
        },
      });
  }

  private matchesSearchQuery(c: Cocktail, query: string): boolean {
    if (!query) return true;
    return (
      c.nom.toLowerCase().includes(query) ||
      (c.description?.toLowerCase()?.includes(query) ?? false) ||
      (c.ingredients?.some(i => i.ingredientNom?.toLowerCase()?.includes(query)) ?? false)
    );
  }

  private matchesDietaryPreferences(c: Cocktail): boolean {
    if (this.filterMocktail && !c.isMocktail && c.categorie !== 'SANS_ALCOOL') return false;
    if (this.filterVegan && !c.isVegan) return false;
    if (this.filterGlutenFree && !c.isGlutenFree) return false;
    if (this.filterLowAbv && ((c.alcoholLevel ?? 0) <= 0 || (c.alcoholLevel ?? 0) > 10.0)) return false;
    return true;
  }

  private matchesFlavors(c: Cocktail): boolean {
    if (this.selectedFlavors.length === 0) return true;
    return !!c.flavorProfiles && this.selectedFlavors.some(f => c.flavorProfiles!.includes(f));
  }

  private matchesAllergens(c: Cocktail): boolean {
    if (this.selectedAllergens.length === 0) return true;
    const cocktailAllergens = this.getCocktailAllergens(c);
    return !this.selectedAllergens.some(a => cocktailAllergens.includes(a));
  }

  /**
   * Applies combined filtering: search query, category, allergen exclusions,
   * dietary preferences, and flavor profiles to cocktails list.
   */
  applyCombinedFilters(): void {
    const query = this.searchQuery?.trim().toLowerCase() || '';

    this.filteredCocktails = this.cocktails.filter((c: Cocktail) => {
      if (!c.disponible) return false;
      if (!this.matchesSearchQuery(c, query)) return false;
      if (this.selectedCategory !== 'ALL' && c.categorie !== this.selectedCategory) return false;
      if (!this.matchesAllergens(c)) return false;
      if (!this.matchesDietaryPreferences(c)) return false;
      return this.matchesFlavors(c);
    });
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
