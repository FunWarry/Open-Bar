import { Component, OnInit, ChangeDetectionStrategy, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons,
  IonContent, IonIcon, IonCheckbox, IonSpinner,
  ModalController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  libraryOutline, closeOutline, searchOutline, checkmarkCircle,
  checkmarkCircleOutline, checkmarkDoneOutline, informationCircleOutline, wineOutline,
  sparklesOutline, leafOutline, pricetagOutline, eyeOutline,
  chevronForwardOutline, chevronBackOutline, playSkipBackOutline, playSkipForwardOutline,
  refreshOutline, shieldCheckmarkOutline,
  filterOutline, closeCircleOutline, flaskOutline, pieChartOutline,
  addOutline, trashOutline, cubeOutline, bulbOutline,
  swapVerticalOutline, optionsOutline, flameOutline, gitBranchOutline,
  chevronDownOutline, chevronUpOutline, textOutline, waterOutline,
  snowOutline, funnelOutline, arrowUpCircleOutline, syncOutline,
  colorFillOutline, hardwareChipOutline, speedometerOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CocktailLibraryService } from '../../../../core/services/cocktail-library.service';
import { IngredientService } from '../../../../core/services/ingredient.service';
import { FlavorProfile } from '../../../../core/models/cocktail.model';
import {
  CocktailLibraryItem,
  CocktailLibraryImportResult,
  CocktailLibraryCategoryFilter,
  CocktailBaseSpiritFilter,
  CocktailSortOption
} from '../../../../core/models/cocktail-library.model';
import { SearchBarComponent } from '../../../../core/components/ui/search-bar/search-bar.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { EmptyStateComponent } from '../../../../core/components/ui/empty-state/empty-state.component';
import { CocktailSunburstComponent } from '../../../../core/components/ui/cocktail-sunburst/cocktail-sunburst.component';
import { CocktailConnectionWheelComponent } from '../../../../core/components/ui/cocktail-connection-wheel/cocktail-connection-wheel.component';
import {
  SearchableSelectComponent,
  SearchableOption
} from '../../../../core/components/ui/searchable-select/searchable-select.component';
import { PaginationComponent } from '../../../../core/components/ui/pagination/pagination.component';

/**
 * Active filter and sorting criteria applied to the recipe library catalog.
 */
interface LibraryFilterCriteria {
  query: string;
  category: string;
  baseSpirit: string;
  flavor: string;
  glassware: string;
  abvRange: string;
  complexity: string;
  popularOnly: boolean;
  variantFamily: string;
}

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
    EmptyStateComponent,
    CocktailSunburstComponent,
    SearchableSelectComponent,
    CocktailConnectionWheelComponent,
    PaginationComponent
  ]
})
export class CocktailLibraryModalComponent implements OnInit {
  private readonly libraryService = inject(CocktailLibraryService);
  private readonly ingredientService = inject(IngredientService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router, { optional: true });

  /** Whether this component is rendered inside an Ionic modal or embedded directly into a setup step. */
  @Input() isModal = false;

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

  /** Active navigation tab within the library browser: full catalog vs ingredient builder vs connection wheel. */
  activeTab = signal<'all' | 'builder' | 'wheel'>('all');

  /** List of ingredients currently active on the builder shelf. */
  shelfIngredients = signal<string[]>([]);

  /** Text input for searching/filtering ingredients to add to the shelf. */
  builderSearchInput = signal<string>('');

  searchQuery = signal<string>('');
  selectedCategory = signal<CocktailLibraryCategoryFilter>('ALL');
  selectedBaseSpirit = signal<CocktailBaseSpiritFilter>('ALL');
  selectedFlavor = signal<string>('ALL');

  /** Sorting and advanced filter criteria signals. */
  selectedSort = signal<CocktailSortOption>('POPULARITY');
  showPopularOnly = signal<boolean>(false);
  showAdvancedFilters = signal<boolean>(false);
  selectedGlassware = signal<string>('ALL');
  selectedAbvRange = signal<'ALL' | 'MOCKTAIL' | 'LIGHT' | 'MEDIUM' | 'STRONG'>('ALL');
  selectedComplexity = signal<'ALL' | 'EXPRESS' | 'STANDARD' | 'COMPLEX'>('ALL');
  selectedVariantFamily = signal<string>('ALL');

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

  readonly sortOptions: { value: CocktailSortOption; labelKey: string }[] = [
    { value: 'POPULARITY', labelKey: 'COCKTAIL_LIBRARY.SORT_POPULARITY' },
    { value: 'NAME_ASC', labelKey: 'COCKTAIL_LIBRARY.SORT_NAME_ASC' },
    { value: 'NAME_DESC', labelKey: 'COCKTAIL_LIBRARY.SORT_NAME_DESC' },
    { value: 'ALCOHOL_ASC', labelKey: 'COCKTAIL_LIBRARY.SORT_ALCOHOL_ASC' },
    { value: 'ALCOHOL_DESC', labelKey: 'COCKTAIL_LIBRARY.SORT_ALCOHOL_DESC' },
    { value: 'INGREDIENTS_COUNT_ASC', labelKey: 'COCKTAIL_LIBRARY.SORT_ING_COUNT' },
    { value: 'PRICE_ASC', labelKey: 'COCKTAIL_LIBRARY.SORT_PRICE_ASC' },
    { value: 'PRICE_DESC', labelKey: 'COCKTAIL_LIBRARY.SORT_PRICE_DESC' }
  ];

  readonly glasswareOptions: { value: string; label: string }[] = [
    { value: 'ALL', label: 'COCKTAIL_LIBRARY.GLASSWARE_ALL' },
    { value: 'Coupe à cocktail', label: 'Coupe à cocktail' },
    { value: 'Flûte à champagne', label: 'Flûte à champagne' },
    { value: 'Verre Old Fashioned', label: 'Verre Old Fashioned' },
    { value: 'Verre Tumbler', label: 'Verre Tumbler' },
    { value: 'Verre à margarita', label: 'Verre à margarita' },
    { value: 'Tasse', label: 'Tasse' },
    { value: 'Verre ballon', label: 'Verre ballon' },
    { value: 'Verre à shot', label: 'Verre à shot' },
    { value: 'Verre tiki', label: 'Verre tiki' }
  ];

  readonly abvOptions: { value: 'ALL' | 'MOCKTAIL' | 'LIGHT' | 'MEDIUM' | 'STRONG'; labelKey: string }[] = [
    { value: 'ALL', labelKey: 'COCKTAIL_LIBRARY.ABV_ALL' },
    { value: 'MOCKTAIL', labelKey: 'COCKTAIL_LIBRARY.ABV_MOCKTAIL' },
    { value: 'LIGHT', labelKey: 'COCKTAIL_LIBRARY.ABV_LIGHT' },
    { value: 'MEDIUM', labelKey: 'COCKTAIL_LIBRARY.ABV_MEDIUM' },
    { value: 'STRONG', labelKey: 'COCKTAIL_LIBRARY.ABV_STRONG' }
  ];

  readonly complexityOptions: { value: 'ALL' | 'EXPRESS' | 'STANDARD' | 'COMPLEX'; labelKey: string }[] = [
    { value: 'ALL', labelKey: 'COCKTAIL_LIBRARY.COMPLEXITY_ALL' },
    { value: 'EXPRESS', labelKey: 'COCKTAIL_LIBRARY.COMPLEXITY_EXPRESS' },
    { value: 'STANDARD', labelKey: 'COCKTAIL_LIBRARY.COMPLEXITY_STANDARD' },
    { value: 'COMPLEX', labelKey: 'COCKTAIL_LIBRARY.COMPLEXITY_COMPLEX' }
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

  /** Available variant families detected across recipes. */
  readonly availableVariantFamilies = computed<string[]>(() => {
    const families = new Set<string>();
    for (const c of this.allCocktails()) {
      if (c.variantFamily) {
        families.add(c.variantFamily);
      }
    }
    return Array.from(families).sort((a, b) => a.localeCompare(b));
  });

  /** Active advanced filters count for the UI badge. */
  readonly activeAdvancedFiltersCount = computed<number>(() => {
    let count = 0;
    if (this.selectedGlassware() !== 'ALL') count++;
    if (this.selectedAbvRange() !== 'ALL') count++;
    if (this.selectedComplexity() !== 'ALL') count++;
    if (this.selectedFlavor() !== 'ALL') count++;
    if (this.selectedVariantFamily() !== 'ALL') count++;
    return count;
  });

  /** Related cocktail variants if previewing an item that belongs to a variant family. */
  readonly relatedVariants = computed<CocktailLibraryItem[]>(() => {
    const item = this.previewItem();
    if (!item?.variantFamily) {
      return [];
    }
    return this.allCocktails()
      .filter(c => c.variantFamily === item.variantFamily && c.id !== item.id)
      .slice(0, 8);
  });

  /** Current active page index in the catalog (1-based). */
  readonly currentPage = signal<number>(1);

  /** Number of cocktail cards displayed per page. */
  readonly pageSize = signal<number>(24);

  /** Computed filtered and sorted list of cocktails based on active criteria. */
  readonly filteredCocktails = computed(() => {
    const list = this.allCocktails();
    const criteria: LibraryFilterCriteria = {
      query: this.searchQuery().toLowerCase().trim(),
      category: this.selectedCategory(),
      baseSpirit: this.selectedBaseSpirit(),
      flavor: this.selectedFlavor(),
      glassware: this.selectedGlassware(),
      abvRange: this.selectedAbvRange(),
      complexity: this.selectedComplexity(),
      popularOnly: this.showPopularOnly(),
      variantFamily: this.selectedVariantFamily()
    };
    const sort = this.selectedSort();

    const filtered = list.filter(item => this.matchesCriteria(item, criteria));

    return [...filtered].sort((a, b) => this.compareCocktails(a, b, sort));
  });

  /** Total number of pages available based on filtered items count. */
  readonly totalPages = computed<number>(() => {
    const total = this.filteredCocktails().length;
    return total > 0 ? Math.ceil(total / this.pageSize()) : 1;
  });

  /** Paginated subset of cocktails rendered on current page. */
  readonly paginatedCocktails = computed<CocktailLibraryItem[]>(() => {
    const list = this.filteredCocktails();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  /** Summary information for the pagination footer. */
  readonly paginationInfo = computed(() => {
    const total = this.filteredCocktails().length;
    if (total === 0) {
      return { start: 0, end: 0, total: 0 };
    }
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  /** Visible page number list for quick pagination pill navigation. */
  readonly visiblePageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, total]);
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.add(i);
    }
    return Array.from(pages).sort((a, b) => a - b);
  });

  /** Options for selecting number of cocktail cards to display per page. */
  readonly pageSizeOptions = computed<SearchableOption<number>[]>(() => [
    { value: 12, label: this.transloco.translate('COCKTAIL_LIBRARY.PAGE_SIZE_ITEM', { count: 12 }) },
    { value: 24, label: this.transloco.translate('COCKTAIL_LIBRARY.PAGE_SIZE_ITEM', { count: 24 }) },
    { value: 48, label: this.transloco.translate('COCKTAIL_LIBRARY.PAGE_SIZE_ITEM', { count: 48 }) },
    { value: 96, label: this.transloco.translate('COCKTAIL_LIBRARY.PAGE_SIZE_ITEM', { count: 96 }) }
  ]);

  /** Options for the sorting searchable dropdown. */
  readonly sortSelectOptions = computed<SearchableOption<CocktailSortOption>[]>(() => [
    {
      value: 'POPULARITY',
      label: this.transloco.translate('COCKTAIL_LIBRARY.SORT_POPULARITY'),
      icon: 'flame-outline'
    },
    {
      value: 'NAME_ASC',
      label: this.transloco.translate('COCKTAIL_LIBRARY.SORT_NAME_ASC'),
      icon: 'text-outline'
    },
    {
      value: 'NAME_DESC',
      label: this.transloco.translate('COCKTAIL_LIBRARY.SORT_NAME_DESC'),
      icon: 'text-outline'
    },
    {
      value: 'ALCOHOL_ASC',
      label: this.transloco.translate('COCKTAIL_LIBRARY.SORT_ALCOHOL_ASC'),
      icon: 'water-outline'
    },
    {
      value: 'ALCOHOL_DESC',
      label: this.transloco.translate('COCKTAIL_LIBRARY.SORT_ALCOHOL_DESC'),
      icon: 'wine-outline'
    },
    {
      value: 'INGREDIENTS_COUNT_ASC',
      label: this.transloco.translate('COCKTAIL_LIBRARY.SORT_ING_COUNT'),
      icon: 'flask-outline'
    },
    {
      value: 'PRICE_ASC',
      label: this.transloco.translate('COCKTAIL_LIBRARY.SORT_PRICE_ASC'),
      icon: 'pricetag-outline'
    },
    {
      value: 'PRICE_DESC',
      label: this.transloco.translate('COCKTAIL_LIBRARY.SORT_PRICE_DESC'),
      icon: 'pricetag-outline'
    }
  ]);

  private matchesCriteria(item: CocktailLibraryItem, criteria: LibraryFilterCriteria): boolean {
    if (!this.matchesSearch(item, criteria.query)) return false;
    if (!this.matchesCategory(item, criteria.category)) return false;
    if (!this.matchesSpirit(item, criteria.baseSpirit)) return false;
    if (!this.matchesFlavor(item, criteria.flavor)) return false;
    if (!this.matchesGlass(item, criteria.glassware)) return false;
    if (!this.matchesAbv(item, criteria.abvRange)) return false;
    if (!this.matchesComplexity(item, criteria.complexity)) return false;
    if (!this.matchesPopularity(item, criteria.popularOnly)) return false;
    return this.matchesFamily(item, criteria.variantFamily);
  }

  private matchesSearch(item: CocktailLibraryItem, q: string): boolean {
    if (!q) return true;
    let delimiter: string | null = null;
    if (q.includes('+')) {
      delimiter = '+';
    } else if (q.includes(',')) {
      delimiter = ',';
    }
    if (!delimiter) {
      return Boolean(
        item.nom.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.ingredients?.some(i => i.nom.toLowerCase().includes(q))
      );
    }
    const terms = q.split(delimiter).map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    if (terms.length === 0) return true;

    return terms.every(term =>
      item.nom.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.ingredients?.some(i => i.nom.toLowerCase().includes(term))
    );
  }

  private matchesCategory(item: CocktailLibraryItem, cat: string): boolean {
    return cat === 'ALL' || item.libraryCategory === cat || item.categorie === cat;
  }

  private matchesSpirit(item: CocktailLibraryItem, spirit: string): boolean {
    return spirit === 'ALL' || item.baseSpirit === spirit;
  }

  private matchesFlavor(item: CocktailLibraryItem, flavor: string): boolean {
    return flavor === 'ALL' || Boolean(item.flavorProfiles?.includes(flavor as FlavorProfile));
  }

  private matchesGlass(item: CocktailLibraryItem, glass: string): boolean {
    return glass === 'ALL' || item.glassware === glass;
  }

  private matchesAbv(item: CocktailLibraryItem, abv: string): boolean {
    if (abv === 'ALL') return true;
    const val = item.alcoholLevel || 0;
    if (abv === 'MOCKTAIL') return item.isMocktail || val === 0;
    if (abv === 'LIGHT') return val > 0 && val <= 12;
    if (abv === 'MEDIUM') return val > 12 && val <= 22;
    if (abv === 'STRONG') return val > 22;
    return true;
  }

  private matchesComplexity(item: CocktailLibraryItem, complexity: string): boolean {
    if (complexity === 'ALL') return true;
    const ingCount = item.ingredients?.length || 0;
    if (complexity === 'EXPRESS') return ingCount <= 3;
    if (complexity === 'STANDARD') return ingCount >= 4 && ingCount <= 5;
    if (complexity === 'COMPLEX') return ingCount >= 6;
    return true;
  }

  private matchesPopularity(item: CocktailLibraryItem, popularOnly: boolean): boolean {
    return !popularOnly || Boolean(item.isPopular || item.ibaOfficial);
  }

  private matchesFamily(item: CocktailLibraryItem, family: string): boolean {
    return family === 'ALL' || item.variantFamily === family;
  }

  private compareCocktails(a: CocktailLibraryItem, b: CocktailLibraryItem, sort: CocktailSortOption): number {
    switch (sort) {
      case 'NAME_ASC':
        return a.nom.localeCompare(b.nom);
      case 'NAME_DESC':
        return b.nom.localeCompare(a.nom);
      case 'ALCOHOL_ASC':
        return (a.alcoholLevel ?? 0) - (b.alcoholLevel ?? 0);
      case 'ALCOHOL_DESC':
        return (b.alcoholLevel ?? 0) - (a.alcoholLevel ?? 0);
      case 'INGREDIENTS_COUNT_ASC':
        return (a.ingredients?.length ?? 0) - (b.ingredients?.length ?? 0);
      case 'PRICE_ASC':
        return (a.prix ?? 0) - (b.prix ?? 0);
      case 'PRICE_DESC':
        return (b.prix ?? 0) - (a.prix ?? 0);
      case 'POPULARITY':
      default:
        return (b.popularityScore ?? 0) - (a.popularityScore ?? 0) || a.nom.localeCompare(b.nom);
    }
  }

  /** Unique alphabetical list of all ingredient names appearing in library cocktails. */
  readonly allKnownIngredients = computed<string[]>(() => {
    const set = new Set<string>();
    for (const c of this.allCocktails()) {
      for (const ing of c.ingredients ?? []) {
        if (ing.nom) {
          set.add(ing.nom.trim());
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  });

  /** Autocomplete suggestions for adding to builder shelf based on query. */
  readonly builderSuggestions = computed<string[]>(() => {
    const q = this.builderSearchInput().toLowerCase().trim();
    if (!q) {
      return [];
    }
    const currentShelf = new Set(this.shelfIngredients().map(s => s.toLowerCase().trim()));
    return this.allKnownIngredients()
      .filter(name => !currentShelf.has(name.toLowerCase().trim()) && name.toLowerCase().includes(q))
      .slice(0, 10);
  });

  /** Matches cocktails against currently selected shelf ingredients. */
  readonly builderMatches = computed<{
    ready: CocktailLibraryItem[];
    oneAway: { cocktail: CocktailLibraryItem; missing: string }[];
    twoAway: { cocktail: CocktailLibraryItem; missing: string[] }[];
    recommendedNext: { ingredient: string; count: number } | null;
  }>(() => {
    const shelf = new Set(this.shelfIngredients().map(s => s.toLowerCase().trim()));
    if (shelf.size === 0) {
      return { ready: [], oneAway: [], twoAway: [], recommendedNext: null };
    }

    const ready: CocktailLibraryItem[] = [];
    const oneAway: { cocktail: CocktailLibraryItem; missing: string }[] = [];
    const twoAway: { cocktail: CocktailLibraryItem; missing: string[] }[] = [];
    const missingFreq = new Map<string, { original: string; count: number }>();

    for (const c of this.allCocktails()) {
      const missing = this.calculateMissingIngredients(c, shelf);
      if (missing.length === 0) {
        ready.push(c);
      } else if (missing.length === 1) {
        oneAway.push({ cocktail: c, missing: missing[0] });
        this.registerMissingFrequency(missing, missingFreq);
      } else if (missing.length === 2) {
        twoAway.push({ cocktail: c, missing });
        this.registerMissingFrequency(missing, missingFreq);
      }
    }

    const recommendedNext = this.findRecommendedPurchase(missingFreq);
    return { ready, oneAway, twoAway, recommendedNext };
  });

  /**
   * Identifies missing ingredients for a recipe compared to currently selected shelf bottles.
   *
   * @param cocktail Target recipe template
   * @param shelf Normalized set of lowercase ingredient names in stock
   */
  private calculateMissingIngredients(cocktail: CocktailLibraryItem, shelf: Set<string>): string[] {
    return (cocktail.ingredients || [])
      .map(ing => ing.nom.trim())
      .filter(name => !shelf.has(name.toLowerCase()));
  }

  /**
   * Tracks frequency of missing ingredients to power the greedy recommendation algorithm.
   *
   * @param missing Missing ingredients for a cocktail
   * @param freqMap Mutable frequency tracking map
   */
  private registerMissingFrequency(
    missing: string[],
    freqMap: Map<string, { original: string; count: number }>
  ): void {
    for (const item of missing) {
      const lower = item.toLowerCase();
      const existing = freqMap.get(lower);
      if (existing) {
        existing.count++;
      } else {
        freqMap.set(lower, { original: item, count: 1 });
      }
    }
  }

  /**
   * Determines the single bottle purchase that unlocks the highest number of new cocktails.
   *
   * @param freqMap Frequency tracking map
   */
  private findRecommendedPurchase(
    freqMap: Map<string, { original: string; count: number }>
  ): { ingredient: string; count: number } | null {
    let best: { ingredient: string; count: number } | null = null;
    let maxCount = 0;
    for (const entry of freqMap.values()) {
      if (entry.count > maxCount) {
        maxCount = entry.count;
        best = { ingredient: entry.original, count: entry.count };
      }
    }
    return best;
  }

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
      flaskOutline,
      pieChartOutline,
      addOutline,
      trashOutline,
      cubeOutline,
      bulbOutline,
      swapVerticalOutline,
      optionsOutline,
      flameOutline,
      gitBranchOutline,
      chevronDownOutline,
      chevronUpOutline,
      chevronBackOutline,
      playSkipBackOutline,
      playSkipForwardOutline,
      checkmarkDoneOutline,
      textOutline,
      waterOutline,
      snowOutline,
      funnelOutline,
      arrowUpCircleOutline,
      syncOutline,
      colorFillOutline,
      hardwareChipOutline,
      speedometerOutline
    });
  }

  ngOnInit(): void {
    if (this.initialSelectedIds && this.initialSelectedIds.length > 0) {
      this.selectedIds.set(new Set(this.initialSelectedIds));
    }
    this.loadCatalog();
  }

  /**
   * Toggles the visibility of the advanced filters panel.
   */
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update(v => !v);
  }

  /**
   * Resets all search, sort, and facet filter criteria back to their default values.
   */
  resetAllFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('ALL');
    this.selectedBaseSpirit.set('ALL');
    this.selectedFlavor.set('ALL');
    this.selectedGlassware.set('ALL');
    this.selectedAbvRange.set('ALL');
    this.selectedComplexity.set('ALL');
    this.selectedVariantFamily.set('ALL');
    this.showPopularOnly.set(false);
    this.selectedSort.set('POPULARITY');
    this.currentPage.set(1);
  }

  /**
   * Navigates to a specific page number.
   *
   * @param page Target page number (1-based)
   */
  goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(clamped);
  }

  /**
   * Advances to the next page if available.
   */
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  /**
   * Moves back to previous page if available.
   */
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  /**
   * Updates page size and resets page position to 1.
   *
   * @param size Number of items per page
   */
  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  /**
   * Handles page size change from dropdown.
   *
   * @param size Selected page size
   */
  onPageSizeChange(size: number): void {
    if (size) {
      this.setPageSize(Number(size));
    }
  }

  /**
   * Handles sort order change from dropdown and resets page to 1.
   *
   * @param sort Selected sort option
   */
  onSortChange(sort: CocktailSortOption): void {
    if (sort) {
      this.selectedSort.set(sort);
      this.currentPage.set(1);
    }
  }

  /**
   * Quick filter by a specific variant family.
   *
   * @param family Target cocktail variant family name
   */
  filterByVariantFamily(family: string): void {
    this.selectedVariantFamily.set(family);
    this.closePreview();
    this.currentPage.set(1);
    if (!this.showAdvancedFilters()) {
      this.showAdvancedFilters.set(true);
    }
  }

  /**
   * Handles selection of an ingredient pair directly from the connection wheel.
   *
   * @param pair Selected ingredient pair with co-occurrence count
   */
  onWheelPairSelected(pair: { ingredientA: string; ingredientB: string; count: number }): void {
    if (pair?.ingredientA && pair?.ingredientB) {
      this.searchQuery.set(`${pair.ingredientA} + ${pair.ingredientB}`);
      this.activeTab.set('all');
      this.currentPage.set(1);
    } else if (pair?.ingredientA) {
      this.searchQuery.set(pair.ingredientA);
      this.activeTab.set('all');
      this.currentPage.set(1);
    }
  }

  /**
   * Explores recipes matching selected ingredient pairings from the connection wheel.
   * Switches to full catalog tab and pre-fills search query with all combined ingredients.
   *
   * @param event Object containing selected ingredient names
   */
  onWheelExploreCocktails(event: { ingredients: string[] }): void {
    if (event?.ingredients?.length > 0) {
      this.searchQuery.set(event.ingredients.join(' + '));
      this.activeTab.set('all');
      this.currentPage.set(1);
    }
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
   * Selects all cocktail items currently visible on the active page.
   */
  selectAllVisible(): void {
    const updated = new Set(this.selectedIds());
    this.paginatedCocktails().forEach(c => updated.add(c.id));
    this.selectedIds.set(updated);
  }

  /**
   * Selects all filtered cocktail items across all pages.
   */
  selectAllFiltered(): void {
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
        } else if (!this.emitSelectionOnly && this.router) {
          void this.router.navigate(['/cocktails']);
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
   * Navigates back to the cocktails catalog when viewed as a standalone page.
   */
  goBack(): void {
    if (this.router) {
      void this.router.navigate(['/cocktails']);
    }
  }

  /**
   * Adds an ingredient name to the builder shelf.
   *
   * @param name Name of the ingredient or bottle
   */
  addToShelf(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const current = this.shelfIngredients();
    if (!current.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      this.shelfIngredients.set([...current, trimmed]);
    }
    this.builderSearchInput.set('');
  }

  /**
   * Removes an ingredient from the builder shelf.
   *
   * @param name Ingredient to remove
   */
  removeFromShelf(name: string): void {
    this.shelfIngredients.set(
      this.shelfIngredients().filter(s => s.toLowerCase() !== name.toLowerCase())
    );
  }

  /**
   * Clears all items currently in the builder shelf.
   */
  clearShelf(): void {
    this.shelfIngredients.set([]);
  }

  /**
   * Populates the builder shelf with ingredients currently in stock (quantiteStock > 0).
   */
  loadCurrentStockIntoBuilder(): void {
    this.ingredientService.getAll().subscribe({
      next: async (items) => {
        const inStock = (items || [])
          .filter(i => (i.quantiteStock || 0) > 0)
          .map(i => i.nom.trim());

        if (inStock.length === 0) {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('COCKTAIL_LIBRARY.NO_STOCK_FOUND'),
            duration: 3500,
            color: 'warning'
          });
          await toast.present();
          return;
        }

        const current = new Set(this.shelfIngredients().map(s => s.toLowerCase()));
        const updated = [...this.shelfIngredients()];
        for (const name of inStock) {
          if (!current.has(name.toLowerCase())) {
            updated.push(name);
            current.add(name.toLowerCase());
          }
        }
        this.shelfIngredients.set(updated);

        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('COCKTAIL_LIBRARY.STOCK_LOADED_SUCCESS', { count: inStock.length }),
          duration: 3500,
          color: 'success'
        });
        await toast.present();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('COCKTAIL_LIBRARY.LOAD_ERROR'),
          duration: 3500,
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

  /**
   * Returns a representative mixology icon name for a given recipe step action.
   *
   * @param actionTitle Action key (e.g. 'TOP_UP', 'SHAKER', 'MELANGER', 'FILTRER', etc.)
   */
  getStepIcon(actionTitle?: string | null): string {
    const action = (actionTitle || '').toUpperCase();
    switch (action) {
      case 'AJOUTER_INGREDIENT':
      case 'AJOUTER':
        return 'wine-outline';
      case 'GLACE':
        return 'snow-outline';
      case 'SHAKER':
        return 'sparkles-outline';
      case 'MELANGER':
        return 'sync-outline';
      case 'FILTRER':
        return 'funnel-outline';
      case 'TOP_UP':
        return 'arrow-up-circle-outline';
      case 'VERSER':
        return 'color-fill-outline';
      case 'PILER':
        return 'hardware-chip-outline';
      case 'MIXER':
        return 'speedometer-outline';
      case 'GARNIR':
        return 'leaf-outline';
      default:
        return 'sparkles-outline';
    }
  }

  /**
   * Returns a user-friendly, localized label for a recipe step action.
   *
   * @param actionTitle Action key (e.g. 'TOP_UP', 'SHAKER', 'AJOUTER_INGREDIENT')
   */
  getStepActionLabel(actionTitle?: string | null): string {
    if (!actionTitle) return '';
    const key = 'COCKTAIL_LIBRARY.ACTIONS.' + actionTitle;
    const translated = this.transloco.translate(key);
    return translated !== key ? translated : actionTitle;
  }
}
