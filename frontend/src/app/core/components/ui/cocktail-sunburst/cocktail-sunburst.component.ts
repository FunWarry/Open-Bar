import {
  Component,
  Input,
  computed,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';

/**
 * Generic interface representing an ingredient item passed to the Sunburst chart.
 */
export interface SunburstIngredientInput {
  nom?: string;
  name?: string;
  quantite?: number | null;
  amount?: number | null;
  unite?: string | null;
  units?: string | null;
  measure?: string | null;
  category?: string | null;
  familyKey?: SunburstFamilyKey | null;
  optional?: boolean;
}

/**
 * Mixology family category identifying ingredient groups in the outer sunburst ring.
 */
export type SunburstFamilyKey =
  | 'dark_liquor'
  | 'light_liquor'
  | 'liqueurs'
  | 'wine_beer'
  | 'juices'
  | 'mixers'
  | 'fruits'
  | 'herbs'
  | 'bitters'
  | 'other';

/**
 * Configuration metadata for each mixology family.
 */
export interface SunburstFamilyConfig {
  key: SunburstFamilyKey;
  labelKey: string;
  cssVar: string;
}

/**
 * Calculated slice for an individual ingredient on the inner ring.
 */
export interface SunburstIngredientSlice {
  id: string;
  name: string;
  measure: string;
  ml: number;
  fraction: number;
  percentage: string;
  familyKey: SunburstFamilyKey;
  path: string;
  colorVar: string;
  labelTransform: string | null;
}

/**
 * Calculated slice for an aggregated family on the outer ring.
 */
export interface SunburstFamilySlice {
  key: SunburstFamilyKey;
  labelKey: string;
  fraction: number;
  percentage: string;
  path: string;
  colorVar: string;
  labelTransform: string | null;
  ingredientCount: number;
}

/**
 * Canonical display order of mixology families around the Sunburst chart.
 * Ensures consistent grouping so category arcs are always contiguous without overlapping.
 */
export const SUNBURST_FAMILY_ORDER: readonly SunburstFamilyKey[] = [
  'dark_liquor',
  'light_liquor',
  'liqueurs',
  'wine_beer',
  'juices',
  'mixers',
  'fruits',
  'herbs',
  'bitters',
  'other'
] as const;

const FAMILY_CONFIGS: Record<SunburstFamilyKey, SunburstFamilyConfig> = {
  dark_liquor: { key: 'dark_liquor', labelKey: 'SUNBURST.FAMILIES.DARK_LIQUOR', cssVar: 'var(--sunburst-dark-liquor)' },
  light_liquor: { key: 'light_liquor', labelKey: 'SUNBURST.FAMILIES.LIGHT_LIQUOR', cssVar: 'var(--sunburst-light-liquor)' },
  liqueurs: { key: 'liqueurs', labelKey: 'SUNBURST.FAMILIES.LIQUEURS', cssVar: 'var(--sunburst-liqueurs)' },
  wine_beer: { key: 'wine_beer', labelKey: 'SUNBURST.FAMILIES.WINE_BEER', cssVar: 'var(--sunburst-wine-beer)' },
  juices: { key: 'juices', labelKey: 'SUNBURST.FAMILIES.JUICES', cssVar: 'var(--sunburst-juices)' },
  mixers: { key: 'mixers', labelKey: 'SUNBURST.FAMILIES.MIXERS', cssVar: 'var(--sunburst-mixers)' },
  fruits: { key: 'fruits', labelKey: 'SUNBURST.FAMILIES.FRUITS', cssVar: 'var(--sunburst-fruits)' },
  herbs: { key: 'herbs', labelKey: 'SUNBURST.FAMILIES.HERBS', cssVar: 'var(--sunburst-herbs)' },
  bitters: { key: 'bitters', labelKey: 'SUNBURST.FAMILIES.BITTERS', cssVar: 'var(--sunburst-bitters)' },
  other: { key: 'other', labelKey: 'SUNBURST.FAMILIES.OTHER', cssVar: 'var(--sunburst-other)' }
};

/**
 * Helper converting polar angle and radius into Cartesian SVG coordinates.
 */
function polarToCartesian(angle: number, radius: number): [number, number] {
  return [Math.sin(angle) * radius, -Math.cos(angle) * radius];
}

/**
 * Computes SVG path data for an annular sector (doughnut chart slice).
 */
function buildAnnularSectorPath(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number
): string {
  const span = endAngle - startAngle;
  if (span >= Math.PI * 2 - 0.0001) {
    return `M 0 ${-outerRadius} ` +
      `A ${outerRadius} ${outerRadius} 0 1 1 0 ${outerRadius} ` +
      `A ${outerRadius} ${outerRadius} 0 1 1 0 ${-outerRadius} ` +
      `M 0 ${-innerRadius} ` +
      `A ${innerRadius} ${innerRadius} 0 1 0 0 ${innerRadius} ` +
      `A ${innerRadius} ${innerRadius} 0 1 0 0 ${-innerRadius} Z`;
  }
  const safeEndAngle = Math.min(endAngle, startAngle + Math.PI * 2 - 0.0001);
  const largeArcFlag = safeEndAngle - startAngle > Math.PI ? 1 : 0;
  const [p1x, p1y] = polarToCartesian(startAngle, outerRadius);
  const [p2x, p2y] = polarToCartesian(safeEndAngle, outerRadius);
  const [p3x, p3y] = polarToCartesian(safeEndAngle, innerRadius);
  const [p4x, p4y] = polarToCartesian(startAngle, innerRadius);

  return `M ${p1x} ${p1y} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${p2x} ${p2y} L ${p3x} ${p3y} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${p4x} ${p4y} Z`;
}

/**
 * Calculates SVG rotation and translation for label positioning within an arc.
 */
function computeLabelTransform(
  startAngle: number,
  endAngle: number,
  radius: number,
  textLength: number
): string | null {
  const span = endAngle - startAngle;
  // If arc is too narrow for text, do not render label
  if (span * radius < textLength * 5.5 + 8) {
    return null;
  }
  const midAngle = (startAngle + endAngle) / 2;
  const [x, y] = polarToCartesian(midAngle, radius);
  let deg = (midAngle * 180) / Math.PI;
  if (deg > 90 && deg < 270) {
    deg += 180;
  }
  return `translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`;
}

/**
 * Resolves the predefined mixology family category defined on an ingredient input.
 * Relies strictly on predefined categories defined with ingredients without hardcoded guessing.
 */
export function classifyIngredientFamily(
  ingredient: SunburstIngredientInput | string,
  explicitCategory?: string | null
): SunburstFamilyKey {
  const categoryRaw = typeof ingredient === 'string'
    ? (explicitCategory || ingredient)
    : (ingredient.category || ingredient.familyKey || explicitCategory);

  if (categoryRaw) {
    const norm = categoryRaw.toLowerCase().trim();
    if (norm in FAMILY_CONFIGS) {
      return norm as SunburstFamilyKey;
    }
  }

  return 'other';
}

const UNIT_FACTORS: Record<string, number> = {
  cl: 10,
  ml: 1,
  l: 1000,
  oz: 29.57,
  'fl oz': 29.57,
  tsp: 4.93,
  cuillere: 4.93,
  barspoon: 4.93,
  tbsp: 14.79,
  dash: 0.4,
  trait: 0.4,
  drop: 0.07,
  goutte: 0.07,
  shot: 44.36,
  dose: 10,
  u: 10,
  piece: 10,
  tranche: 10
};

const ML_REGEX = /^(\d+(?:\.\d+)?)\s*ml/;
const CL_REGEX = /^(\d+(?:\.\d+)?)\s*cl/;
const OZ_REGEX = /^(\d+(?:\.\d+)?)\s*(?:oz|fl oz)/;

function parseMeasureString(measureStr: string): number | null {
  const s = measureStr.toLowerCase().trim();
  const mlMatch = ML_REGEX.exec(s);
  if (mlMatch) {
    return Number.parseFloat(mlMatch[1]);
  }
  const clMatch = CL_REGEX.exec(s);
  if (clMatch) {
    return Number.parseFloat(clMatch[1]) * 10;
  }
  const ozMatch = OZ_REGEX.exec(s);
  if (ozMatch) {
    return Number.parseFloat(ozMatch[1]) * 29.57;
  }
  if (s.includes('dash')) return 0.5;
  if (s.includes('drop')) return 0.1;
  if (s.includes('tsp')) return 5.0;
  return null;
}

/**
 * Normalizes any quantity and unit into approximate milliliters for proportional plotting.
 */
export function normalizeToMl(qty?: number | null, unit?: string | null, measureStr?: string | null): number {
  if (qty != null && Number.isFinite(qty) && qty > 0) {
    const u = (unit || '').toLowerCase().trim();
    const factor = UNIT_FACTORS[u] ?? 10;
    return qty * factor;
  }

  if (measureStr) {
    const parsed = parseMeasureString(measureStr);
    if (parsed != null) {
      return parsed;
    }
  }

  return 10.0;
}

/**
 * Interactive SVG Sunburst chart component visualizing cocktail recipe proportions.
 * Displays individual ingredients on the inner ring and mixology families on the outer ring.
 */
@Component({
  selector: 'app-cocktail-sunburst',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './cocktail-sunburst.component.html',
  styleUrls: ['./cocktail-sunburst.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CocktailSunburstComponent {
  /** Raw list of ingredients to compute proportions for. */
  @Input() set ingredients(val: SunburstIngredientInput[] | null | undefined) {
    this.rawIngredients.set(val || []);
  }

  /** Internal mode signal. */
  readonly modeSignal = signal<'mini' | 'full'>('full');

  /** Display mode: 'mini' (badge / preview thumb) or 'full' (large interactive with legend). */
  @Input() set mode(val: 'mini' | 'full') {
    this.modeSignal.set(val || 'full');
  }
  get mode(): 'mini' | 'full' {
    return this.modeSignal();
  }

  /** Optional title or cocktail name for accessibility labels. */
  @Input() cocktailName = '';

  /** Internal signal storing input ingredients. */
  readonly rawIngredients = signal<SunburstIngredientInput[]>([]);

  /** Currently hovered or selected ingredient slice ID. */
  readonly activeIngredientId = signal<string | null>(null);

  /** Currently hovered or selected family key. */
  readonly activeFamilyKey = signal<SunburstFamilyKey | null>(null);

  /**
   * Computed ingredient slices with angles, fractions, and SVG paths for the inner ring.
   */
  readonly ingredientSlices = computed<SunburstIngredientSlice[]>(() => {
    const list = this.rawIngredients();
    if (!list || list.length === 0) {
      return [];
    }

    const items = list.map((item, idx) => {
      const name = item.nom || item.name || `Ingrédient ${idx + 1}`;
      const qty = item.quantite ?? item.amount;
      const unit = item.unite || item.units;
      const measure = item.measure || (qty != null ? `${qty} ${unit || ''}`.trim() : '');
      const ml = normalizeToMl(qty, unit, measure);
      const familyKey = classifyIngredientFamily(item);
      return {
        id: `slice-${idx}`,
        name,
        measure,
        ml,
        familyKey
      };
    });

    // Group by mixology family order first, then descending by ml within each family
    items.sort((a, b) => {
      const famIndexA = SUNBURST_FAMILY_ORDER.indexOf(a.familyKey);
      const famIndexB = SUNBURST_FAMILY_ORDER.indexOf(b.familyKey);
      if (famIndexA !== famIndexB) {
        return famIndexA - famIndexB;
      }
      return b.ml - a.ml;
    });

    const totalMl = items.reduce((acc, curr) => acc + curr.ml, 0);
    const isMini = this.modeSignal() === 'mini';
    const innerR = isMini ? 22 : 72;
    const outerR = isMini ? 40 : 138;
    const labelR = (innerR + outerR) / 2;

    let currentAngle = 0;
    return items.map(item => {
      const fraction = totalMl > 0 ? item.ml / totalMl : 1 / items.length;
      const start = currentAngle;
      const end = currentAngle + fraction * Math.PI * 2;
      currentAngle = end;

      const path = buildAnnularSectorPath(start, end, innerR, outerR);
      const labelTransform = !isMini
        ? computeLabelTransform(start, end, labelR, item.name.length)
        : null;

      const pct = (fraction * 100).toFixed(1) + '%';
      return {
        id: item.id,
        name: item.name,
        measure: item.measure,
        ml: Math.round(item.ml * 10) / 10,
        fraction,
        percentage: pct,
        familyKey: item.familyKey,
        path,
        colorVar: FAMILY_CONFIGS[item.familyKey].cssVar,
        labelTransform
      };
    });
  });

  /**
   * Computed family slices with aggregated fractions and SVG paths for the outer ring.
   */
  readonly familySlices = computed<SunburstFamilySlice[]>(() => {
    const ingSlices = this.ingredientSlices();
    if (ingSlices.length === 0) {
      return [];
    }

    const isMini = this.modeSignal() === 'mini';
    const outerRInner = isMini ? 43 : 148;
    const outerROuter = isMini ? 54 : 194;
    const labelR = (outerRInner + outerROuter) / 2;

    // Group consecutive or aggregated slices by family order
    const familyMap = new Map<SunburstFamilyKey, { fraction: number; count: number; startAngle: number; endAngle: number }>();

    let runningAngle = 0;
    for (const ing of ingSlices) {
      const sliceAngle = ing.fraction * Math.PI * 2;
      const existing = familyMap.get(ing.familyKey);
      if (!existing) {
        familyMap.set(ing.familyKey, {
          fraction: ing.fraction,
          count: 1,
          startAngle: runningAngle,
          endAngle: runningAngle + sliceAngle
        });
      } else {
        existing.fraction += ing.fraction;
        existing.count += 1;
        existing.endAngle = runningAngle + sliceAngle;
      }
      runningAngle += sliceAngle;
    }

    const result: SunburstFamilySlice[] = [];
    for (const [key, data] of familyMap.entries()) {
      const config = FAMILY_CONFIGS[key];
      const path = buildAnnularSectorPath(data.startAngle, data.endAngle, outerRInner, outerROuter);
      const labelTransform = !isMini
        ? computeLabelTransform(data.startAngle, data.endAngle, labelR, 8)
        : null;

      result.push({
        key,
        labelKey: config.labelKey,
        fraction: data.fraction,
        percentage: (data.fraction * 100).toFixed(1) + '%',
        path,
        colorVar: config.cssVar,
        labelTransform,
        ingredientCount: data.count
      });
    }
    return result;
  });

  /**
   * Active readout details for template display.
   */
  readonly activeDetails = computed(() => {
    const activeIngId = this.activeIngredientId();
    if (activeIngId) {
      const found = this.ingredientSlices().find(s => s.id === activeIngId);
      if (found) {
        return {
          type: 'ingredient' as const,
          title: found.name,
          measure: found.measure,
          percentage: found.percentage,
          familyKey: found.familyKey,
          colorVar: found.colorVar
        };
      }
    }

    const activeFam = this.activeFamilyKey();
    if (activeFam) {
      const found = this.familySlices().find(s => s.key === activeFam);
      if (found) {
        return {
          type: 'family' as const,
          title: FAMILY_CONFIGS[activeFam].labelKey,
          measure: '',
          percentage: found.percentage,
          familyKey: activeFam,
          colorVar: found.colorVar
        };
      }
    }

    return null;
  });

  /**
   * Computed SVG path string for the currently selected slice to render a highlighted contour outline.
   */
  readonly selectedContourPath = computed<string | null>(() => {
    const ingId = this.activeIngredientId();
    if (ingId) {
      const match = this.ingredientSlices().find(s => s.id === ingId);
      if (match) {
        return match.path;
      }
    }
    const famKey = this.activeFamilyKey();
    if (famKey) {
      const match = this.familySlices().find(f => f.key === famKey);
      if (match) {
        return match.path;
      }
    }
    return null;
  });

  /**
   * Handles user hovering or clicking an ingredient segment.
   */
  onIngredientSelect(slice: SunburstIngredientSlice): void {
    if (this.activeIngredientId() === slice.id) {
      this.clearActive();
    } else {
      this.activeFamilyKey.set(null);
      this.activeIngredientId.set(slice.id);
    }
  }

  /**
   * Handles user hovering or clicking a family segment.
   */
  onFamilySelect(key: SunburstFamilyKey): void {
    if (this.activeFamilyKey() === key) {
      this.clearActive();
    } else {
      this.activeIngredientId.set(null);
      this.activeFamilyKey.set(key);
    }
  }

  /**
   * Resets any active highlight.
   */
  clearActive(): void {
    this.activeIngredientId.set(null);
    this.activeFamilyKey.set(null);
  }

  /**
   * Checks whether a given ingredient slice is highlighted.
   */
  isSliceHighlighted(slice: SunburstIngredientSlice): boolean {
    const activeIng = this.activeIngredientId();
    const activeFam = this.activeFamilyKey();
    if (!activeIng && !activeFam) return true;
    if (activeIng) return activeIng === slice.id;
    if (activeFam) return activeFam === slice.familyKey;
    return false;
  }

  /**
   * Checks whether a given family slice is highlighted.
   */
  isFamilyHighlighted(key: SunburstFamilyKey): boolean {
    const activeIng = this.activeIngredientId();
    const activeFam = this.activeFamilyKey();
    if (!activeIng && !activeFam) return true;
    if (activeFam) return activeFam === key;
    if (activeIng) {
      const found = this.ingredientSlices().find(s => s.id === activeIng);
      return found ? found.familyKey === key : false;
    }
    return false;
  }
}
