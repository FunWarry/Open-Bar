import { Component, OnInit, ChangeDetectionStrategy, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons,
  IonContent, IonIcon, IonCheckbox, IonSpinner,
  ModalController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  libraryOutline, closeOutline, searchOutline, checkmarkCircle,
  checkmarkCircleOutline, informationCircleOutline, wineOutline,
  sparklesOutline, leafOutline, pricetagOutline, eyeOutline,
  chevronForwardOutline, refreshOutline, shieldCheckmarkOutline,
  filterOutline, closeCircleOutline, flaskOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CocktailLibraryService } from '../../../../core/services/cocktail-library.service';
import {
  CocktailLibraryItem,
  CocktailLibraryImportResult,
  CocktailLibraryCategoryFilter,
  CocktailBaseSpiritFilter
} from '../../../../core/models/cocktail-library.model';
import { SearchBarComponent } from '../../../../core/components/ui/search-bar/search-bar.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { EmptyStateComponent } from '../../../../core/components/ui/empty-state/empty-state.component';

/**
 * Interactive base cocktail and ingredient library modal browser and batch import wizard.
 * Enables managers to filter, preview, select, and import classic and craft drink recipes into inventory.
 */
@Component({
  selector: 'app-cocktail-library-modal',
  templateUrl: './cocktail-library-modal.component.html',
  styleUrls: ['./cocktail-library-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonContent,
    IonIcon,
    IonCheckbox,
    IonSpinner,
    SearchBarComponent,
    ActionButtonComponent,
    EmptyStateComponent
  ]
})
export class CocktailLibraryModalComponent implements OnInit {
  private readonly libraryService = inject(CocktailLibraryService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  /** Whether this component is rendered inside an Ionic modal or embedded directly into a setup step. */
  @Input() isModal = true;

  /** Pre-selected cocktail library IDs (e.g. passed from setup wizard). */
  @Input() initialSelectedIds: string[] = [];

  /** If true, confirming selection emits cocktail IDs instead of triggering HTTP import directly. */
  @Input() emitSelectionOnly = false;

  /** Custom label for the primary action button. */
  @Input() customSubmitLabel?: string;

  /** Emitted when import succeeds. */
  @Output() imported = new EventEmitter<CocktailLibraryImportResult>();

  /** Emitted when selection is confirmed in emitSelectionOnly mode. */
  @Output() selectionConfirmed = new EventEmitter<string[]>();

  /** Emitted when user dismisses or skips the import. */
  @Output() dismissed = new EventEmitter<void>();

  allCocktails = signal<CocktailLibraryItem[]>([]);
  isLoading = signal<boolean>(true);
  isImporting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  searchQuery = signal<string>('');
  selectedCategory = signal<CocktailLibraryCategoryFilter>('ALL');
  selectedBaseSpirit = signal<CocktailBaseSpiritFilter>('ALL');
  selectedFlavor = signal<string>('ALL');

  selectedIds = signal<Set<string>>(new Set());
  previewItem = signal<CocktailLibraryItem | null>(null);

  readonly categoryOptions: { value: CocktailLibraryCategoryFilter; labelKey: string }[] = [
    { value: 'ALL', labelKey: 'COCKTAIL_LIBRARY.CAT_ALL' },
    { value: 'IBA_CLASSICS', labelKey: 'COCKTAIL_LIBRARY.CAT_IBA' },
    { value: 'TROPICAL', labelKey: 'COCKTAIL_LIBRARY.CAT_TROPICAL' },
    { value: 'SPIRIT_FORWARD', labelKey: 'COCKTAIL_LIBRARY.CAT_SPIRIT_FORWARD' },
    { value: 'MOCKTAILS', labelKey: 'COCKTAIL_LIBRARY.CAT_MOCKTAILS' },
    { value: 'SHOOTERS', labelKey: 'COCKTAIL_LIBRARY.CAT_SHOOTERS' },
    { value: 'CONTEMPORARY', labelKey: 'COCKTAIL_LIBRARY.CAT_CONTEMPORARY' }
  ];

  readonly baseSpiritOptions: { value: CocktailBaseSpiritFilter; labelKey: string }[] = [
    { value: 'ALL', labelKey: 'COCKTAIL_LIBRARY.SPIRIT_ALL' },
    { value: 'GIN', labelKey: 'COCKTAIL_LIBRARY.SPIRIT_GIN' },
    { value: 'VODKA', labelKey: 'COCKTAIL_LIBRARY.SPIRIT_VODKA' },
    { value: 'RUM', labelKey: 'COCKTAIL_LIBRARY.SPIRIT_RUM' },
    { value: 'TEQUILA', labelKey: 'COCKTAIL_LIBRARY.SPIRIT_TEQUILA' },
    { value: 'WHISKEY', labelKey: 'COCKTAIL_LIBRARY.SPIRIT_WHISKEY' },
    { value: 'NON_ALCOHOLIC', labelKey: 'COCKTAIL_LIBRARY.SPIRIT_NON_ALCOHOLIC' }
  ];

  readonly flavorOptions = [
    { value: 'ALL', labelKey: 'COCKTAIL_LIBRARY.FLAVOR_ALL' },
    { value: 'FRUITY', labelKey: 'COCKTAIL_LIBRARY.FLAVOR_FRUITY' },
    { value: 'SWEET', labelKey: 'COCKTAIL_LIBRARY.FLAVOR_SWEET' },
    { value: 'SOUR', labelKey: 'COCKTAIL_LIBRARY.FLAVOR_SOUR' },
    { value: 'BITTER', labelKey: 'COCKTAIL_LIBRARY.FLAVOR_BITTER' },
    { value: 'SPICY', labelKey: 'COCKTAIL_LIBRARY.FLAVOR_SPICY' },
    { value: 'HERBAL', labelKey: 'COCKTAIL_LIBRARY.FLAVOR_HERBAL' },
    { value: 'SMOKY', labelKey: 'COCKTAIL_LIBRARY.FLAVOR_SMOKY' }
  ];

  /** Computed filtered list of cocktails based on active criteria. */
  readonly filteredCocktails = computed(() => {
    const list = this.allCocktails();
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    const spirit = this.selectedBaseSpirit();
    const flavor = this.selectedFlavor();

    return list.filter(item => {
      if (q) {
        const matchesName = item.nom.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesIng = item.ingredients?.some(i => i.nom.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesIng) {
          return false;
        }
      }

      if (cat !== 'ALL') {
        const matchesCategory = item.libraryCategory === cat || item.categorie === cat;
        if (!matchesCategory) {
          return false;
        }
      }

      if (spirit !== 'ALL') {
        if (item.baseSpirit !== spirit) {
          return false;
        }
      }

      if (flavor !== 'ALL') {
        if (!item.flavorProfiles?.includes(flavor as any)) {
          return false;
        }
      }

      return true;
    });
  });

  /** Selected items count. */
  readonly selectedCount = computed(() => this.selectedIds().size);

  constructor() {
    addIcons({
      libraryOutline,
      closeOutline,
      searchOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      informationCircleOutline,
      wineOutline,
      sparklesOutline,
      leafOutline,
      pricetagOutline,
      eyeOutline,
      chevronForwardOutline,
      refreshOutline,
      shieldCheckmarkOutline,
      filterOutline,
      closeCircleOutline,
      flaskOutline
    });
  }

  ngOnInit(): void {
    if (this.initialSelectedIds && this.initialSelectedIds.length > 0) {
      this.selectedIds.set(new Set(this.initialSelectedIds));
    }
    this.loadCatalog();
  }

  /**
   * Loads all library cocktail templates from backend API.
   */
  loadCatalog(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.libraryService.getLibraryCocktails().subscribe({
      next: (data) => {
        this.allCocktails.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message || this.transloco.translate('COCKTAIL_LIBRARY.LOAD_ERROR')
        );
      }
    });
  }

  /**
   * Toggles selection of a specific cocktail item.
   *
   * @param id Target cocktail ID
   */
  toggleSelection(id: string): void {
    const updated = new Set(this.selectedIds());
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    this.selectedIds.set(updated);
  }

  /**
   * Checks whether a cocktail is currently selected.
   *
   * @param id Cocktail identifier
   */
  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  /**
   * Selects all currently visible filtered cocktail items.
   */
  selectAllVisible(): void {
    const updated = new Set(this.selectedIds());
    this.filteredCocktails().forEach(c => updated.add(c.id));
    this.selectedIds.set(updated);
  }

  /**
   * Selects all IBA official classic cocktails.
   */
  selectIbaClassics(): void {
    const updated = new Set(this.selectedIds());
    this.allCocktails()
      .filter(c => c.ibaOfficial || c.libraryCategory === 'IBA_CLASSICS')
      .forEach(c => updated.add(c.id));
    this.selectedIds.set(updated);
  }

  /**
   * Selects all zero-proof mocktails.
   */
  selectMocktails(): void {
    const updated = new Set(this.selectedIds());
    this.allCocktails()
      .filter(c => c.isMocktail || c.libraryCategory === 'MOCKTAILS' || c.baseSpirit === 'NON_ALCOHOLIC')
      .forEach(c => updated.add(c.id));
    this.selectedIds.set(updated);
  }

  /**
   * Deselects all cocktails.
   */
  deselectAll(): void {
    this.selectedIds.set(new Set());
  }

  /**
   * Opens the recipe preview drawer for a given item.
   *
   * @param item Target cocktail recipe
   * @param event DOM click event to stop card toggle propagation
   */
  openPreview(item: CocktailLibraryItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.previewItem.set(item);
  }

  /**
   * Closes the recipe preview drawer.
   */
  closePreview(): void {
    this.previewItem.set(null);
  }

  /**
   * Submits batch import of currently selected recipes.
   */
  executeImport(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) {
      return;
    }

    if (this.emitSelectionOnly) {
      this.selectionConfirmed.emit(ids);
      return;
    }

    this.isImporting.set(true);
    this.libraryService.importCocktails({ cocktailIds: ids }).subscribe({
      next: async (result) => {
        this.isImporting.set(false);
        await this.showSuccessToast(result);
        this.imported.emit(result);
        if (this.isModal) {
          void this.modalCtrl.dismiss(result, 'imported');
        }
      },
      error: async (err) => {
        this.isImporting.set(false);
        const msg = err?.error?.message || this.transloco.translate('COCKTAIL_LIBRARY.IMPORT_ERROR');
        const toast = await this.toastCtrl.create({
          message: msg,
          duration: 4000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  /**
   * Dismisses the modal dialog or emits skip.
   */
  closeModal(): void {
    this.dismissed.emit();
    if (this.isModal) {
      void this.modalCtrl.dismiss(null, 'cancel');
    }
  }

  /**
   * Handles image loading error fallback to placeholder.
   *
   * @param event DOM image error event
   */
  onThumbError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target) {
      target.src = 'assets/images/verres/verre_tumbler.png';
    }
  }

  private async showSuccessToast(result: CocktailLibraryImportResult): Promise<void> {
    const msg = this.transloco.translate('COCKTAIL_LIBRARY.IMPORT_SUCCESS', {
      count: result.importedCount,
      ingredients: result.newIngredientsCount
    });
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 4500,
      color: 'success'
    });
    await toast.present();
  }
}
