import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  leafOutline,
  flameOutline,
  sparklesOutline,
  waterOutline,
  wineOutline,
  cloudOutline,
  closeCircleOutline,
  refreshOutline,
  restaurantOutline,
  nutritionOutline
} from 'ionicons/icons';
import { CocktailFacets, FlavorProfile } from '../../../models/cocktail.model';

/**
 * Filter state payload emitted whenever matcher tags or dietary preferences change.
 */
export interface CocktailMatcherFilters {
  flavors: FlavorProfile[];
  mocktail: boolean;
  vegan: boolean;
  glutenFree: boolean;
  lowAbv: boolean;
}

/**
 * Definition of a flavor profile display item with icon and metadata.
 */
export interface FlavorItemConfig {
  key: FlavorProfile;
  labelKey: string;
  icon: string;
  badgeClass: string;
}

/**
 * Interactive cocktail matcher bar providing visual flavor profile chips and dietary preference toggles.
 * Can be embedded into both customer QR menus and staff cocktail management lists.
 */
@Component({
  selector: 'app-cocktail-matcher-bar',
  standalone: true,
  imports: [CommonModule, TranslocoModule, IonIcon],
  templateUrl: './cocktail-matcher-bar.component.html',
  styleUrls: ['./cocktail-matcher-bar.component.css']
})
export class CocktailMatcherBarComponent {
  /** Optional facet metrics containing counts per flavor profile and dietary tag. */
  @Input() facets?: CocktailFacets | null;

  /** Active selected flavor profile tags. */
  @Input() activeFlavors: FlavorProfile[] = [];

  /** Non-alcoholic / mocktail filter state. */
  @Input() mocktail = false;

  /** Vegan filter state. */
  @Input() vegan = false;

  /** Gluten-free filter state. */
  @Input() glutenFree = false;

  /** Low-ABV filter state. */
  @Input() lowAbv = false;

  /** Compact display mode for mobile or dense headers. */
  @Input() compact = false;

  /** Emits whenever any filter state changes. */
  @Output() filtersChange = new EventEmitter<CocktailMatcherFilters>();

  /** Emits when all matcher filters are reset. */
  @Output() resetFilters = new EventEmitter<void>();

  /** Available flavor profiles with localized keys and icons. */
  readonly availableFlavors: FlavorItemConfig[] = [
    { key: 'FRUITY', labelKey: 'COCKTAIL.FLAVOR_FRUITY', icon: 'water-outline', badgeClass: 'flavor-fruity' },
    { key: 'SMOKY', labelKey: 'COCKTAIL.FLAVOR_SMOKY', icon: 'cloud-outline', badgeClass: 'flavor-smoky' },
    { key: 'SWEET', labelKey: 'COCKTAIL.FLAVOR_SWEET', icon: 'sparkles-outline', badgeClass: 'flavor-sweet' },
    { key: 'SOUR', labelKey: 'COCKTAIL.FLAVOR_SOUR', icon: 'water-outline', badgeClass: 'flavor-sour' },
    { key: 'BITTER', labelKey: 'COCKTAIL.FLAVOR_BITTER', icon: 'wine-outline', badgeClass: 'flavor-bitter' },
    { key: 'SPICY', labelKey: 'COCKTAIL.FLAVOR_SPICY', icon: 'flame-outline', badgeClass: 'flavor-spicy' },
    { key: 'HERBAL', labelKey: 'COCKTAIL.FLAVOR_HERBAL', icon: 'leaf-outline', badgeClass: 'flavor-herbal' },
  ];

  constructor() {
    addIcons({
      leafOutline,
      flameOutline,
      sparklesOutline,
      waterOutline,
      wineOutline,
      cloudOutline,
      closeCircleOutline,
      refreshOutline,
      restaurantOutline,
      nutritionOutline
    });
  }

  /**
   * Checks whether a flavor profile is currently selected.
   *
   * @param flavor Target flavor profile
   * @returns True if currently active
   */
  isFlavorActive(flavor: FlavorProfile): boolean {
    return this.activeFlavors.includes(flavor);
  }

  /**
   * Toggles a flavor profile tag selection and emits updated filters.
   *
   * @param flavor Target flavor profile
   */
  toggleFlavor(flavor: FlavorProfile): void {
    const idx = this.activeFlavors.indexOf(flavor);
    if (idx >= 0) {
      this.activeFlavors = this.activeFlavors.filter((f) => f !== flavor);
    } else {
      this.activeFlavors = [...this.activeFlavors, flavor];
    }
    this.emitChange();
  }

  /**
   * Toggles a dietary preference filter and emits updated filters.
   *
   * @param type Dietary preference key
   */
  toggleDietary(type: 'mocktail' | 'vegan' | 'glutenFree' | 'lowAbv'): void {
    if (type === 'mocktail') {
      this.mocktail = !this.mocktail;
    } else if (type === 'vegan') {
      this.vegan = !this.vegan;
    } else if (type === 'glutenFree') {
      this.glutenFree = !this.glutenFree;
    } else if (type === 'lowAbv') {
      this.lowAbv = !this.lowAbv;
    }
    this.emitChange();
  }

  /**
   * Checks if any matcher filters are currently active.
   *
   * @returns True if at least one filter is applied
   */
  hasActiveFilters(): boolean {
    return (
      this.activeFlavors.length > 0 ||
      this.mocktail ||
      this.vegan ||
      this.glutenFree ||
      this.lowAbv
    );
  }

  /**
   * Resets all flavor and dietary filters and notifies subscribers.
   */
  clearAll(): void {
    this.activeFlavors = [];
    this.mocktail = false;
    this.vegan = false;
    this.glutenFree = false;
    this.lowAbv = false;
    this.resetFilters.emit();
    this.emitChange();
  }

  /**
   * Resolves drink count for a given flavor profile from facet data if available.
   *
   * @param flavor Target flavor profile
   * @returns Count of drinks or null
   */
  getFlavorCount(flavor: FlavorProfile): number | null {
    if (!this.facets?.flavorCounts) return null;
    return this.facets.flavorCounts[flavor] ?? 0;
  }

  private emitChange(): void {
    this.filtersChange.emit({
      flavors: this.activeFlavors,
      mocktail: this.mocktail,
      vegan: this.vegan,
      glutenFree: this.glutenFree,
      lowAbv: this.lowAbv
    });
  }
}
