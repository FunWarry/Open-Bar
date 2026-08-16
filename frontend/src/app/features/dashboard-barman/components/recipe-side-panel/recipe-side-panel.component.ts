import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  wineOutline,
  waterOutline,
  leafOutline,
  sparklesOutline,
  restaurantOutline,
  timeOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  cubeOutline,
  funnelOutline,
  hammerOutline,
  syncOutline,
  flameOutline,
  hardwareChipOutline,
  createOutline,
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommandeItemView, CommandeView } from '../../models/commande-view.model';
import { Cocktail } from '../../../../core/models/cocktail.model';

/**
 * Detailed Recipe and Preparation Side Panel Component for the Bar Counter.
 * Provides a comprehensive, step-by-step preparation breakdown including:
 * - Dynamic dosage calculations for single dose and total ordered quantity
 * - Customization notes and variant instructions
 * - Ordered modular recipe steps (ingredients, mixology action templates, custom instructions)
 * - Preparation steps, glassware recommendations, and garnishes
 */
@Component({
  selector: 'app-recipe-side-panel',
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    IonButton,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './recipe-side-panel.component.html',
  styleUrls: ['./recipe-side-panel.component.scss'],
})
export class RecipeSidePanelComponent {
  /** Whether the side panel is currently open and visible. */
  @Input() isOpen = false;

  /** The specific ordered item being inspected. */
  @Input() item: CommandeItemView | null = null;

  /** The parent order metadata. */
  @Input() commande: CommandeView | null = null;

  /** Full cocktail recipe entity from backend API. */
  @Input() cocktail: Cocktail | null = null;

  /** Whether the recipe details are currently loading. */
  @Input() isLoading = false;

  /** Emits when the user requests closing the side panel. */
  @Output() closePanel = new EventEmitter<void>();

  constructor() {
    addIcons({
      closeOutline,
      wineOutline,
      waterOutline,
      leafOutline,
      sparklesOutline,
      restaurantOutline,
      timeOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      cubeOutline,
      funnelOutline,
      hammerOutline,
      syncOutline,
      flameOutline,
      hardwareChipOutline,
      createOutline,
    });
  }

  /**
   * Returns the item quantity (minimum 1).
   */
  get quantity(): number {
    return this.item?.quantite || 1;
  }

  /**
   * Calculates scaled dosage for the entire ordered quantity.
   *
   * @param singleQty Dosage for 1 unit
   * @returns Scaled total dosage formatted nicely
   */
  getTotalDosage(singleQty: number): number {
    return Math.round(singleQty * this.quantity * 100) / 100;
  }

  /**
   * Calculates scaled quantity for a recipe step.
   *
   * @param baseQty Base quantity per glass
   * @returns Total scaled quantity for this order
   */
  getScaledStepQuantity(baseQty: number | null | undefined): number {
    if (baseQty == null) return 0;
    return Math.round(baseQty * this.quantity * 100) / 100;
  }

  /**
   * Returns the corresponding Ionic icon for a mixology action type.
   *
   * @param actionType Action category identifier
   * @returns IonIcon name
   */
  getActionIcon(actionType?: string): string {
    switch (actionType) {
      case 'SHAKE':
        return 'wine-outline';
      case 'STRAIN':
        return 'funnel-outline';
      case 'MUDDLE':
        return 'hammer-outline';
      case 'STIR':
        return 'sync-outline';
      case 'ADD_ICE':
        return 'cube-outline';
      case 'POUR':
        return 'water-outline';
      case 'TOP_UP':
        return 'water-outline';
      case 'GARNISH':
        return 'leaf-outline';
      case 'BLEND':
        return 'hardware-chip-outline';
      case 'FLAME':
        return 'flame-outline';
      default:
        return 'sparkles-outline';
    }
  }

  /**
   * Closes the side panel.
   */
  onClose(): void {
    this.closePanel.emit();
  }

  /**
   * Listens to Escape key presses to dismiss the side panel.
   */
  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isOpen) {
      this.onClose();
    }
  }
}
