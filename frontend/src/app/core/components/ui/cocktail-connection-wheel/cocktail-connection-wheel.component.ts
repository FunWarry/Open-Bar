import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  chevronBackOutline,
  closeOutline,
  optionsOutline,
  removeOutline,
  sparklesOutline,
  trashOutline,
  wineOutline,
  filterOutline,
  searchOutline
} from 'ionicons/icons';
import { CocktailLibraryService } from '../../../services/cocktail-library.service';
import {
  CocktailConnectionWheelData,
  CocktailWheelNode,
  CocktailWheelCategory,
  CocktailWheelLink,
  CocktailWheelLayoutNode,
  CocktailWheelLayoutFamily,
  CocktailWheelGeometry
} from '../../../models/cocktail-library.model';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import {
  SearchableSelectComponent,
  SearchableOption
} from '../searchable-select/searchable-select.component';

/**
 * Single ranked partner record for an active ingredient.
 */
export interface CocktailPartnerItem {
  id: string;
  label: string;
  count: number;
  group: string;
  groupColor: string;
  isSelected?: boolean;
}

/**
 * Category breakdown item for the family distribution bar chart.
 */
export interface CategoryBarItem {
  id: string;
  label: string;
  color: string;
  count: number;
  percentage: number;
  isActive: boolean;
}

/**
 * Floating tooltip readout state.
 */
export interface FloatingTooltipState {
  visible: boolean;
  ingredientA: string;
  ingredientB: string;
  count: number;
  x: number;
  y: number;
}

interface ChordSubgroup {
  index: number;
  startAngle: number;
  endAngle: number;
  value: number;
}

interface RawChordItem {
  source: ChordSubgroup;
  target: ChordSubgroup;
}

/**
 * Interactive DrinkWithData Chord Connection Wheel component.
 * Displays co-occurrence ribbons between 300 cocktail ingredients across 1,902 classic and modern recipes.
 * Supports connection limit filtering (100, 250, 500, All), interactive hover/selection,
 * partner ranking table, and direct transition to recipe search.
 */
@Component({
  selector: 'app-cocktail-connection-wheel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonIcon,
    IonSpinner,
    SearchBarComponent,
    SearchableSelectComponent
  ],
  templateUrl: './cocktail-connection-wheel.component.html',
  styleUrls: ['./cocktail-connection-wheel.component.scss']
})
export class CocktailConnectionWheelComponent implements OnInit {
  private readonly libraryService = inject(CocktailLibraryService);
  private readonly transloco = inject(TranslocoService);
  protected readonly elementRef = inject(ElementRef);

  /** Default connection threshold count (e.g. 500). */
  @Input() defaultLimit = 500;

  /** Event emitted when user selects a pair of ingredients to explore recipes. */
  @Output() readonly pairSelected = new EventEmitter<{ ingredientA: string; ingredientB: string; count: number }>();

  /** Event emitted when user wants to filter recipes with a given ingredient list. */
  @Output() readonly exploreCocktails = new EventEmitter<{ ingredients: string[] }>();

  /** Raw graph data loaded from asset / API. */
  readonly rawData = signal<CocktailConnectionWheelData | null>(null);

  /** Loading state indicator. */
  readonly isLoading = signal<boolean>(true);

  /** Active connection limit (100, 250, 500, or Infinity). */
  readonly connectionLimit = signal<number>(500);

  /** Selected ingredient identifiers (cumulative multi-selection). */
  readonly selectedIngredientIds = signal<string[]>([]);

  /** Selected ingredient identifier (first item, maintained for single-item backwards compatibility). */
  readonly selectedIngredientId = computed(() => this.selectedIngredientIds()[0] || null);

  /** Selected category group identifier (locked in view). */
  readonly selectedCategoryId = signal<string | null>(null);

  /** Currently hovered category group identifier on outer perimeter. */
  readonly hoveredCategoryId = signal<string | null>(null);

  /** Active category whether locked by selection or actively hovered on outer circle. */
  readonly activeCategoryId = computed<string | null>(() => {
    return this.selectedCategoryId() || this.hoveredCategoryId();
  });

  /** Currently hovered ribbon link. */
  readonly hoveredLink = signal<CocktailWheelLink | null>(null);

  /** Currently hovered ingredient node. */
  readonly hoveredIngredientId = signal<string | null>(null);

  /** Free-text search input query. */
  readonly searchQuery = signal<string>('');

  /** Floating tooltip state for pointer hover on ribbons. */
  readonly tooltip = signal<FloatingTooltipState>({
    visible: false,
    ingredientA: '',
    ingredientB: '',
    count: 0,
    x: 0,
    y: 0
  });

  /** Dropdown options for connection threshold. */
  readonly limitOptions = computed<SearchableOption[]>(() => [
    { value: 100, label: this.transloco.translate('COCKTAIL_WHEEL.LIMIT_100') },
    { value: 250, label: this.transloco.translate('COCKTAIL_WHEEL.LIMIT_250') },
    { value: 500, label: this.transloco.translate('COCKTAIL_WHEEL.LIMIT_500') },
    { value: 999999, label: this.transloco.translate('COCKTAIL_WHEEL.LIMIT_ALL') }
  ]);

  /** Filtered graph data restricted to top connections. */
  readonly filteredGraph = computed(() => {
    const data = this.rawData();
    if (!data) return null;

    const limit = this.connectionLimit();
    const edges = limit >= 999999
      ? data.edges
      : data.edges.slice(0, Math.max(0, limit));

    const connectedIds = new Set<string>(edges.flatMap(e => [e.a, e.b]));
    const nodes = data.nodes.filter(n => connectedIds.has(n.id));
    const idToIndex = new Map<string, number>(nodes.map((n, idx) => [n.id, idx]));
    const matrix: number[][] = nodes.map(() => nodes.map(() => 0));

    for (const edge of edges) {
      const i = idToIndex.get(edge.a);
      const j = idToIndex.get(edge.b);
      if (i !== undefined && j !== undefined) {
        matrix[i][j] = matrix[j][i] = edge.count;
      }
    }

    return {
      nodes,
      matrix,
      edges,
      categories: data.categories
    };
  });

  /** Computed chord layout geometry (arcs, ribbons, label transforms). */
  readonly geometry = computed<CocktailWheelGeometry | null>(() => {
    const graph = this.filteredGraph();
    if (!graph || graph.nodes.length === 0) return null;

    return this.calculateWheelGeometry(graph.nodes, graph.matrix, graph.categories);
  });

  /** Fast ingredient lookup by id. */
  readonly ingredientMap = computed(() => {
    const graph = this.filteredGraph();
    const map = new Map<string, CocktailWheelNode>();
    if (graph) {
      graph.nodes.forEach(n => map.set(n.id, n));
    }
    return map;
  });

  /** Search autocomplete matching ingredients (restricted to connected partners when selection is active). */
  readonly searchMatches = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const geom = this.geometry();
    if (!query || !geom) return [];

    const selected = this.selectedIngredientIds();
    const partners = this.connectedPartnerIds();

    return geom.nodes
      .filter(n => {
        if (selected.length > 0 && !selected.includes(n.id) && !partners.has(n.id)) {
          return false;
        }
        return n.label.toLowerCase().includes(query) || n.id.toLowerCase().includes(query);
      })
      .slice(0, 8);
  });

  /** List of selected ingredient objects. */
  readonly selectedIngredients = computed<CocktailWheelNode[]>(() => {
    return this.selectedIngredientIds()
      .map(id => this.ingredientMap().get(id))
      .filter((n): n is CocktailWheelNode => !!n);
  });

  /** Primary selected ingredient object (backward compatibility). */
  readonly selectedIngredient = computed(() => {
    const id = this.selectedIngredientId();
    return id ? this.ingredientMap().get(id) || null : null;
  });

  /** Active ribbons to emphasize based on selection or hover. */
  readonly highlightedLinks = computed<Set<number>>(() => {
    const geom = this.geometry();
    if (!geom) return new Set();

    return this.computeHighlightedLinks(
      this.selectedIngredientIds(),
      this.hoveredIngredientId(),
      this.activeCategoryId(),
      this.hoveredLink(),
      geom
    );
  });

  /** Whether any node, category, or ribbon is currently selected or focused. */
  readonly hasActiveFocus = computed<boolean>(() => {
    return !!(
      this.selectedIngredientIds().length > 0 ||
      this.selectedCategoryId() ||
      this.hoveredCategoryId() ||
      this.hoveredIngredientId() ||
      this.hoveredLink()
    );
  });

  /** Ranked partners list when an ingredient or multiple ingredients are selected. */
  readonly partnerRankings = computed<CocktailPartnerItem[]>(() => {
    const geom = this.geometry();
    const data = this.rawData();
    if (!geom || !data) return [];

    const selected = this.selectedIngredientIds();
    const hovered = this.hoveredIngredientId();
    let targetIds = selected;
    if (targetIds.length === 0 && hovered) {
      targetIds = [hovered];
    }
    if (targetIds.length === 0) return [];

    const partners = this.computePartnerRankings(targetIds, geom, data);
    const selectedSet = new Set(selected);
    return partners.map(p => ({
      ...p,
      isSelected: selectedSet.has(p.id)
    }));
  });

  /** Set of currently ranked partner identifiers. */
  readonly connectedPartnerIds = computed<Set<string>>(() => {
    return new Set(this.partnerRankings().map(p => p.id));
  });

  /** Top partners to show labels for on the wheel circumference (max 12 to prevent overlapping text). */
  readonly topPartnerIds = computed<Set<string>>(() => {
    return new Set(this.partnerRankings().slice(0, 12).map(p => p.id));
  });

  /** Category breakdown bars for the bottom display. */
  readonly categoryBars = computed<CategoryBarItem[]>(() => {
    const geom = this.geometry();
    const data = this.rawData();
    if (!geom || !data) return [];

    const partners = this.partnerRankings();
    const isIngredientFocused = this.selectedIngredientIds().length > 0 || !!this.hoveredIngredientId();
    const selectedCat = this.selectedCategoryId();

    const counts = new Map<string, number>();
    Object.keys(data.categories).forEach(catId => counts.set(catId, 0));

    if (isIngredientFocused && partners.length > 0) {
      for (const p of partners) {
        counts.set(p.group, (counts.get(p.group) || 0) + 1);
      }
    } else {
      for (const node of geom.nodes) {
        counts.set(node.group, (counts.get(node.group) || 0) + 1);
      }
    }

    const maxCount = Math.max(1, ...counts.values());

    return Object.entries(data.categories).map(([catId, meta]) => {
      const count = counts.get(catId) || 0;
      const isFrench = this.transloco.getActiveLang() === 'fr';
      const label = isFrench && meta.labelFr ? meta.labelFr : meta.label;

      return {
        id: catId,
        label,
        color: meta.color,
        count,
        percentage: Math.round((count / maxCount) * 100),
        isActive: selectedCat === catId
      };
    });
  });

  constructor() {
    addIcons({
      addOutline,
      chevronBackOutline,
      closeOutline,
      filterOutline,
      optionsOutline,
      removeOutline,
      searchOutline,
      sparklesOutline,
      trashOutline,
      wineOutline
    });
  }

  ngOnInit(): void {
    if (this.defaultLimit) {
      this.connectionLimit.set(this.defaultLimit);
    }
    this.loadGraphData();
  }

  /**
   * Loads the preprocessed DrinkWithData wheel dataset from the library service.
   */
  loadGraphData(): void {
    this.isLoading.set(true);
    this.libraryService.getWheelData().subscribe({
      next: (data) => {
        this.rawData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.rawData.set(null);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Updates connection limit threshold (100, 250, 500, or All).
   *
   * @param limit New connection threshold
   */
  onLimitChange(limit: number): void {
    if (limit) {
      this.connectionLimit.set(Number(limit));
      this.clearSelection();
    }
  }

  /**
   * Checks whether a given ingredient is in the active selection.
   *
   * @param id Ingredient identifier
   */
  isSelected(id: string): boolean {
    return this.selectedIngredientIds().includes(id);
  }

  /**
   * Checks whether a given ingredient is in the active selection (alias of isSelected).
   *
   * @param id Ingredient identifier
   */
  isIngredientSelected(id: string): boolean {
    return this.isSelected(id);
  }

  /**
   * Checks whether a given ingredient is a connected partner of the active selection.
   *
   * @param id Ingredient identifier
   */
  isPartnerOfSelected(id: string): boolean {
    return this.connectedPartnerIds().has(id);
  }

  /**
   * Toggles an ingredient into or out of the cumulative multi-selection.
   * Cumulative additions are strictly constrained to connected partners to guarantee realistic pairings.
   *
   * @param id Ingredient identifier
   */
  toggleIngredient(id: string): void {
    const current = this.selectedIngredientIds();

    // Deselection: always allowed
    if (current.includes(id)) {
      this.selectedIngredientIds.update(ids => ids.filter(i => i !== id));
      this.searchQuery.set('');
      return;
    }

    // Initial selection: any ingredient can be chosen as starting seed
    if (current.length === 0) {
      this.selectedIngredientIds.set([id]);
      this.selectedCategoryId.set(null);
      this.searchQuery.set('');
      return;
    }

    // Cumulative addition: ONLY allowed if the ingredient is a connected partner of the active selection
    if (this.isPartnerOfSelected(id)) {
      this.selectedIngredientIds.update(ids => [...ids, id]);
      this.searchQuery.set('');
    }
  }

  /**
   * Selects an ingredient by identifier (delegates to cumulative toggle).
   *
   * @param id Ingredient identifier
   */
  selectIngredient(id: string): void {
    this.toggleIngredient(id);
  }

  /**
   * Removes an ingredient from the active cumulative selection.
   *
   * @param id Ingredient identifier
   */
  removeIngredient(id: string): void {
    this.selectedIngredientIds.update(ids => ids.filter(i => i !== id));
  }

  /**
   * Selects a category family to highlight its members.
   *
   * @param categoryId Category identifier
   */
  selectCategory(categoryId: string): void {
    if (this.selectedCategoryId() === categoryId) {
      this.selectedCategoryId.set(null);
    } else {
      this.selectedCategoryId.set(categoryId);
      this.selectedIngredientIds.set([]);
    }
  }

  /**
   * Clears any active selection and focus states.
   */
  clearSelection(): void {
    this.selectedIngredientIds.set([]);
    this.selectedCategoryId.set(null);
    this.hoveredCategoryId.set(null);
    this.hoveredLink.set(null);
    this.hoveredIngredientId.set(null);
    this.searchQuery.set('');
    this.hideTooltip();
  }

  /**
   * Handles clicks on the empty SVG canvas to smoothly dismiss focus.
   *
   * @param event Mouse click event
   */
  onSvgBackgroundClick(event: MouseEvent): void {
    const target = event.target as SVGElement | null;
    if (target?.tagName === 'svg') {
      this.clearSelection();
    }
  }

  /**
   * Handles pointer enter/hover on a ribbon path.
   *
   * @param link Hovered ribbon link
   * @param event Mouse event for tooltip coordinates
   */
  onRibbonEnter(link: CocktailWheelLink, event: MouseEvent): void {
    this.hoveredLink.set(link);
    const nodeA = this.ingredientMap().get(link.a);
    const nodeB = this.ingredientMap().get(link.b);

    this.tooltip.set({
      visible: true,
      ingredientA: nodeA?.label || link.a,
      ingredientB: nodeB?.label || link.b,
      count: link.count,
      x: event.clientX,
      y: event.clientY
    });
  }

  /**
   * Handles pointer movement to update tooltip position.
   *
   * @param event Pointer mouse event
   */
  onPointerMove(event: MouseEvent): void {
    if (this.tooltip().visible) {
      this.tooltip.update(t => ({
        ...t,
        x: event.clientX,
        y: event.clientY
      }));
    }
  }

  /**
   * Handles pointer leave from a ribbon path.
   */
  onRibbonLeave(): void {
    this.hoveredLink.set(null);
    this.hideTooltip();
  }

  /**
   * Hides the floating tooltip readout.
   */
  hideTooltip(): void {
    this.tooltip.update(t => ({ ...t, visible: false }));
  }

  /**
   * Handles click on a ribbon to emit pair selection.
   *
   * @param link Clicked ribbon link
   */
  /**
   * Handles click on a ribbon to add both ingredients into the cumulative selection.
   *
   * @param link Clicked ribbon link
   */
  onRibbonClick(link: CocktailWheelLink): void {
    this.selectedCategoryId.set(null);

    this.selectedIngredientIds.update(ids => {
      const set = new Set(ids);
      set.add(link.a);
      set.add(link.b);
      return Array.from(set);
    });

    this.pairSelected.emit({
      ingredientA: link.a,
      ingredientB: link.b,
      count: link.count
    });
  }

  /**
   * Explores cocktails matching all currently selected ingredients.
   */
  exploreCombined(): void {
    const selected = this.selectedIngredients();
    if (selected.length === 0) return;

    this.exploreCocktails.emit({
      ingredients: selected.map(s => s.label)
    });
  }

  /**
   * Navigates or filters to cocktails containing the current selection plus the partner.
   *
   * @param partnerId Partner ingredient identifier
   */
  explorePair(partnerId: string): void {
    const partnerNode = this.ingredientMap().get(partnerId);
    const partnerLabel = partnerNode?.label || partnerId;

    const currentLabels = this.selectedIngredients().map(s => s.label);
    const ingredients = currentLabels.includes(partnerLabel)
      ? currentLabels
      : [...currentLabels, partnerLabel];

    this.exploreCocktails.emit({ ingredients });
  }

  /**
   * Retrieves category color for a given ingredient.
   *
   * @param id Ingredient identifier
   */
  getIngredientColor(id: string): string {
    const node = this.ingredientMap().get(id);
    const group = node?.group || '';
    return this.rawData()?.categories[group]?.color || '#8c817b';
  }

  /**
   * Retrieves user-facing display label for a given ingredient.
   *
   * @param id Ingredient identifier
   */
  getIngredientLabel(id: string): string {
    return this.ingredientMap().get(id)?.label || id;
  }

  /**
   * Determines if a radial ingredient text label should be rendered.
   * By default, ZERO ingredient names are displayed to maintain a pristine, clean chart.
   * An ingredient's name is displayed ONLY when:
   * - It is actively selected by the user.
   * - Its specific cell/case is being hovered.
   * - A ribbon connected to it is being hovered.
   *
   * @param node Layout node to test for visibility
   */
  isNodeLabelVisible(node: CocktailWheelLayoutNode): boolean {
    // 1. Actively selected ingredients always display their name
    if (this.isSelected(node.id)) {
      return true;
    }

    // 2. Currently hovered ingredient displays its name
    if (this.hoveredIngredientId() === node.id) {
      return true;
    }

    // 3. Ribbon hover: endpoints of the hovered connection display their names
    const hLink = this.hoveredLink();
    if (hLink && (hLink.a === node.id || hLink.b === node.id)) {
      return true;
    }

    // 4. Default: NO ingredient names displayed (matches drinkwithdata.com)
    return false;
  }

  /**
   * Computes highlighted links for active focus or multi-selection.
   */
  private computeHighlightedLinks(
    selectedIds: string[],
    hoveredId: string | null,
    selectedCat: string | null,
    hoveredRibbon: CocktailWheelLink | null,
    geom: CocktailWheelGeometry
  ): Set<number> {
    if (hoveredRibbon) {
      return new Set([hoveredRibbon.index]);
    }

    if (selectedIds.length === 0 && hoveredId) {
      const links = geom.byIngredient.get(hoveredId) || [];
      return new Set(links.map(l => l.index));
    }

    if (selectedIds.length === 1) {
      const links = geom.byIngredient.get(selectedIds[0]) || [];
      return new Set(links.map(l => l.index));
    }

    if (selectedIds.length >= 2) {
      return this.computeMultiSelectionHighlightedLinks(selectedIds, geom);
    }

    if (selectedCat) {
      const links = geom.byCategory.get(selectedCat) || [];
      return new Set(links.map(l => l.index));
    }

    return new Set();
  }

  private computeMultiSelectionHighlightedLinks(
    selectedIds: string[],
    geom: CocktailWheelGeometry
  ): Set<number> {
    const selectedSet = new Set(selectedIds);
    const highlighted = new Set<number>();

    for (const link of geom.links) {
      if (selectedSet.has(link.a) && selectedSet.has(link.b)) {
        highlighted.add(link.index);
      }
    }

    const partnerIds = new Set(this.partnerRankings().map(p => p.id));
    for (const link of geom.links) {
      const hasSelected = selectedSet.has(link.a) || selectedSet.has(link.b);
      const hasPartner = partnerIds.has(link.a) || partnerIds.has(link.b);
      if (hasSelected && hasPartner) {
        highlighted.add(link.index);
      }
    }

    return highlighted;
  }

  /**
   * Computes partner ranking list for active target ingredients.
   */
  private computePartnerRankings(
    targetIds: string[],
    geom: CocktailWheelGeometry,
    data: CocktailConnectionWheelData
  ): CocktailPartnerItem[] {
    if (targetIds.length === 0) return [];

    if (targetIds.length === 1) {
      return this.computeSinglePartnerRankings(targetIds[0], geom, data);
    }

    return this.computeMultiPartnerRankings(targetIds, geom, data);
  }

  private computeSinglePartnerRankings(
    targetId: string,
    geom: CocktailWheelGeometry,
    data: CocktailConnectionWheelData
  ): CocktailPartnerItem[] {
    const links = geom.byIngredient.get(targetId) || [];
    const partners: CocktailPartnerItem[] = [];

    for (const link of links) {
      const partnerId = link.a === targetId ? link.b : link.a;
      if (partnerId === targetId) continue;
      const partnerNode = this.ingredientMap().get(partnerId);
      if (partnerNode) {
        const categoryMeta = data.categories[partnerNode.group];
        partners.push({
          id: partnerId,
          label: partnerNode.label,
          count: link.count,
          group: partnerNode.group,
          groupColor: categoryMeta?.color || '#8c817b'
        });
      }
    }

    return partners.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  private computeMultiPartnerRankings(
    targetIds: string[],
    geom: CocktailWheelGeometry,
    data: CocktailConnectionWheelData
  ): CocktailPartnerItem[] {
    const selectedSet = new Set(targetIds);
    const partnerStats = this.collectPartnerStats(targetIds, geom, selectedSet);
    const { fullyConnected } = this.groupPartnerItems(
      partnerStats,
      targetIds.length,
      data
    );

    fullyConnected.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    // When multiple ingredients are selected, valid partners MUST connect to all selected ingredients
    return fullyConnected;
  }

  private collectPartnerStats(
    targetIds: string[],
    geom: CocktailWheelGeometry,
    selectedSet: Set<string>
  ): Map<string, { countSum: number; connectedCount: number }> {
    const partnerStats = new Map<string, { countSum: number; connectedCount: number }>();

    for (const id of targetIds) {
      const links = geom.byIngredient.get(id) || [];
      for (const link of links) {
        const partnerId = link.a === id ? link.b : link.a;
        if (selectedSet.has(partnerId)) continue;

        const stat = partnerStats.get(partnerId) || { countSum: 0, connectedCount: 0 };
        stat.countSum += link.count;
        stat.connectedCount += 1;
        partnerStats.set(partnerId, stat);
      }
    }

    return partnerStats;
  }

  private groupPartnerItems(
    partnerStats: Map<string, { countSum: number; connectedCount: number }>,
    targetCount: number,
    data: CocktailConnectionWheelData
  ): { fullyConnected: CocktailPartnerItem[]; partiallyConnected: CocktailPartnerItem[] } {
    const fullyConnected: CocktailPartnerItem[] = [];
    const partiallyConnected: CocktailPartnerItem[] = [];

    for (const [partnerId, stat] of partnerStats.entries()) {
      const node = this.ingredientMap().get(partnerId);
      if (!node) continue;
      const categoryMeta = data.categories[node.group];
      const item: CocktailPartnerItem = {
        id: partnerId,
        label: node.label,
        count: stat.countSum,
        group: node.group,
        groupColor: categoryMeta?.color || '#8c817b'
      };

      if (stat.connectedCount === targetCount) {
        fullyConnected.push(item);
      } else {
        partiallyConnected.push(item);
      }
    }

    return { fullyConnected, partiallyConnected };
  }

  /**
   * Dismisses active selection on Escape key.
   */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.clearSelection();
  }

  // ==========================================
  // MATHEMATICAL CHORD & RIBBON CALCULATION
  // ==========================================

  private calculateWheelGeometry(
    nodes: CocktailWheelNode[],
    matrix: number[][],
    categories: Record<string, CocktailWheelCategory>
  ): CocktailWheelGeometry {
    const { groups, chords } = this.computeChordsAndGroups(matrix);
    const ribbonRadius = 265;

    const { links, byIngredient, byCategory } = this.buildLinks(
      chords,
      nodes,
      categories,
      ribbonRadius
    );

    const layoutNodes = this.buildLayoutNodes(nodes, groups);
    const isFrench = this.transloco.getActiveLang() === 'fr';
    const layoutFamilies = this.buildLayoutFamilies(categories, layoutNodes, isFrench);

    return {
      links,
      nodes: layoutNodes,
      families: layoutFamilies,
      byIngredient,
      byCategory
    };
  }

  /**
   * Computes row totals and global matrix sum.
   */
  private computeMatrixTotals(matrix: number[][]): { groupSums: number[]; total: number } {
    const groupSums = matrix.map(row => row.reduce((acc, val) => acc + val, 0));
    const total = groupSums.reduce((acc, sum) => acc + sum, 0);
    return { groupSums, total };
  }

  /**
   * Retrieves non-zero column indices sorted descending by strength.
   */
  private getSortedSubgroups(row: number[], n: number): number[] {
    const indices: number[] = [];
    for (let j = 0; j < n; ++j) {
      if (row[j] > 0) {
        indices.push(j);
      }
    }
    return indices.sort((a, b) => row[b] - row[a]);
  }

  /**
   * Updates or registers a chord endpoint in the shared chord map.
   */
  private assignChordSegment(
    i: number,
    j: number,
    n: number,
    val: number,
    startAngle: number,
    endAngle: number,
    chordMap: Record<number, { source?: ChordSubgroup; target?: ChordSubgroup }>
  ): void {
    const chordKey = i <= j ? i * n + j : j * n + i;
    const existing = chordMap[chordKey] ?? {};
    chordMap[chordKey] = existing;

    const segment: ChordSubgroup = { index: i, startAngle, endAngle, value: val };
    if (i <= j) {
      existing.source = segment;
      if (i === j) {
        existing.target = segment;
      }
    } else {
      existing.target = segment;
    }
  }

  /**
   * Computes angular spans for each node and pairwise chords across matrix.
   */
  private computeChordsAndGroups(matrix: number[][]): {
    groups: ChordSubgroup[];
    chords: RawChordItem[];
  } {
    const n = matrix.length;
    const padAngle = Math.min(0.025, 0.8 / Math.max(1, n));
    const { groupSums, total } = this.computeMatrixTotals(matrix);
    const k = total > 0 ? Math.max(0, 2 * Math.PI - padAngle * n) / total : 0;
    const chordMap: Record<number, { source?: ChordSubgroup; target?: ChordSubgroup }> = {};
    const groups: ChordSubgroup[] = [];
    let currentAngle = 0;

    for (let i = 0; i < n; ++i) {
      const groupStart = currentAngle;
      const sortedSubgroups = this.getSortedSubgroups(matrix[i], n);

      for (const j of sortedSubgroups) {
        const val = matrix[i][j];
        const endAngle = currentAngle + val * k;
        this.assignChordSegment(i, j, n, val, currentAngle, endAngle, chordMap);
        currentAngle = endAngle;
      }

      groups.push({
        index: i,
        startAngle: groupStart,
        endAngle: currentAngle,
        value: groupSums[i]
      });

      currentAngle += padAngle;
    }

    const chords = Object.values(chordMap).filter(
      (c): c is RawChordItem => !!c.source && !!c.target
    );

    return { groups, chords };
  }

  /**
   * Generates ribbon links and cross-indexes by ingredient and category.
   */
  private buildLinks(
    chords: RawChordItem[],
    nodes: CocktailWheelNode[],
    categories: Record<string, CocktailWheelCategory>,
    ribbonRadius: number
  ): {
    links: CocktailWheelLink[];
    byIngredient: Map<string, CocktailWheelLink[]>;
    byCategory: Map<string, CocktailWheelLink[]>;
  } {
    const byIngredient = new Map<string, CocktailWheelLink[]>();
    const byCategory = new Map<string, CocktailWheelLink[]>();
    nodes.forEach(node => byIngredient.set(node.id, []));
    Object.keys(categories).forEach(cat => byCategory.set(cat, []));

    const links: CocktailWheelLink[] = chords.map((chord, index) => {
      const src = chord.source;
      const tgt = chord.target;
      const nodeA = nodes[src.index];
      const nodeB = nodes[tgt.index];

      const catA = categories[nodeA.group];
      const catB = categories[nodeB.group];

      const midSrc = (src.startAngle + src.endAngle) / 2;
      const midTgt = (tgt.startAngle + tgt.endAngle) / 2;

      const path = this.generateRibbonPath(
        src.startAngle,
        src.endAngle,
        tgt.startAngle,
        tgt.endAngle,
        ribbonRadius
      );

      const link: CocktailWheelLink = {
        index,
        a: nodeA.id,
        b: nodeB.id,
        count: src.value,
        path,
        start: this.radialCoords(midSrc, ribbonRadius),
        end: this.radialCoords(midTgt, ribbonRadius),
        colorA: catA?.color || '#8c817b',
        colorB: catB?.color || '#8c817b'
      };

      byIngredient.get(nodeA.id)?.push(link);
      if (nodeA.id !== nodeB.id) {
        byIngredient.get(nodeB.id)?.push(link);
      }
      byCategory.get(nodeA.group)?.push(link);
      if (nodeA.group !== nodeB.group) {
        byCategory.get(nodeB.group)?.push(link);
      }

      return link;
    });

    return { links, byIngredient, byCategory };
  }

  /**
   * Builds layout nodes with arc paths and rotated labels.
   */
  private buildLayoutNodes(
    nodes: CocktailWheelNode[],
    groups: ChordSubgroup[]
  ): CocktailWheelLayoutNode[] {
    return groups.map(grp => {
      const node = nodes[grp.index];
      const midAngle = (grp.startAngle + grp.endAngle) / 2;
      const isFlipped = midAngle > Math.PI;
      const [lx, ly] = this.radialCoords(midAngle, 286);
      const rot = (midAngle * 180) / Math.PI - 90 + (isFlipped ? 180 : 0);
      const span = grp.endAngle - grp.startAngle;

      return {
        ...node,
        segment: grp,
        arc: this.generateArcPath(grp.startAngle, grp.endAngle, 272),
        hit: this.generateArcPath(grp.startAngle, grp.endAngle, 274),
        labelTransform: `translate(${lx.toFixed(2)}, ${ly.toFixed(2)}) rotate(${rot.toFixed(2)})`,
        anchor: isFlipped ? 'end' : 'start',
        isProminent: span >= 0.095
      };
    });
  }

  /**
   * Builds perimeter family arcs using modern Array.prototype.at().
   */
  private buildLayoutFamilies(
    categories: Record<string, CocktailWheelCategory>,
    layoutNodes: CocktailWheelLayoutNode[],
    isFrench: boolean
  ): CocktailWheelLayoutFamily[] {
    return Object.entries(categories).flatMap(([catId, meta]) => {
      const catNodes = layoutNodes.filter(n => n.group === catId);
      if (catNodes.length === 0) return [];

      const startAngle = catNodes[0].segment.startAngle;
      const lastNode = catNodes.at(-1);
      const endAngle = lastNode ? lastNode.segment.endAngle : startAngle;
      const midAngle = (startAngle + endAngle) / 2;

      return [{
        id: catId,
        ...meta,
        label: isFrench && meta.labelFr ? meta.labelFr : meta.label,
        short: isFrench && meta.shortFr ? meta.shortFr : meta.short,
        count: catNodes.length,
        arc: this.generateArcPath(startAngle, endAngle, 375),
        position: this.radialCoords(midAngle, 408)
      }];
    });
  }

  /**
   * Computes Cartesian coordinate pair from radial angle and radius distance.
   */
  private radialCoords(angle: number, radius: number): [number, number] {
    return [
      Math.sin(angle) * radius,
      -Math.cos(angle) * radius
    ];
  }

  /**
   * Generates SVG path string for a circular arc segment.
   */
  private generateArcPath(startAngle: number, endAngle: number, radius: number): string {
    const [sx, sy] = this.radialCoords(startAngle, radius);
    const [ex, ey] = this.radialCoords(endAngle, radius);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  }

  /**
   * Generates an SVG cubic ribbon connecting two circular arcs across the center.
   */
  private generateRibbonPath(
    sStart: number,
    sEnd: number,
    tStart: number,
    tEnd: number,
    radius: number
  ): string {
    const [s0x, s0y] = this.radialCoords(sStart, radius);
    const [s1x, s1y] = this.radialCoords(sEnd, radius);
    const [t0x, t0y] = this.radialCoords(tStart, radius);
    const [t1x, t1y] = this.radialCoords(tEnd, radius);

    const sLarge = sEnd - sStart > Math.PI ? 1 : 0;
    const tLarge = tEnd - tStart > Math.PI ? 1 : 0;

    if (sStart === tStart && sEnd === tEnd) {
      return `M ${s0x.toFixed(2)} ${s0y.toFixed(2)} A ${radius} ${radius} 0 ${sLarge} 1 ${s1x.toFixed(2)} ${s1y.toFixed(2)} Q 0 0 ${s0x.toFixed(2)} ${s0y.toFixed(2)} Z`;
    }

    return (
      `M ${s0x.toFixed(2)} ${s0y.toFixed(2)} ` +
      `A ${radius} ${radius} 0 ${sLarge} 1 ${s1x.toFixed(2)} ${s1y.toFixed(2)} ` +
      `Q 0 0 ${t0x.toFixed(2)} ${t0y.toFixed(2)} ` +
      `A ${radius} ${radius} 0 ${tLarge} 1 ${t1x.toFixed(2)} ${t1y.toFixed(2)} ` +
      `Q 0 0 ${s0x.toFixed(2)} ${s0y.toFixed(2)} Z`
    );
  }
}
