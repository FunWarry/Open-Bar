import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonBadge, IonIcon, IonSpinner, IonFooter,
  ModalController, ToastController, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, addOutline, removeOutline, trashOutline,
  saveOutline, addCircleOutline, sparklesOutline, wineOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Commande, CommandeItem } from '../../../../core/models/commande.model';
import { Cocktail, CocktailVariante } from '../../../../core/models/cocktail.model';
import { CocktailService } from '../../../../core/services/cocktail.service';
import { DashboardServeurService, ModifierCommandeRequest } from '../../services/dashboard-serveur.service';
import { SearchableSelectComponent, SearchableOption } from '../../../../core/components/ui/searchable-select/searchable-select.component';

export interface EditableOrderItem {
  id?: number;
  cocktailId: number;
  cocktailNom: string;
  varianteId?: number;
  varianteNom?: string;
  prixUnitaire: number;
  quantite: number;
  notes: string;
  prioritaire: boolean;
}

/**
 * Modal dialog for editing an active order's cocktail items, quantities, notes, and tip.
 */
@Component({
  selector: 'app-edit-commande-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonBadge, IonIcon, IonSpinner, IonFooter,
    TranslocoPipe,
    SearchableSelectComponent,
  ],
  templateUrl: './edit-commande-modal.component.html',
  styleUrls: ['./edit-commande-modal.component.scss'],
})
export class EditCommandeModalComponent implements OnInit {
  @Input() commande!: Commande;
  @Input() tableNumero?: number;

  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly dashboardService = inject(DashboardServeurService);
  private readonly cocktailService = inject(CocktailService);
  private readonly translocoService = inject(TranslocoService);

  items: EditableOrderItem[] = [];
  availableCocktails: Cocktail[] = [];
  cocktailOptions: SearchableOption<number>[] = [];
  selectedCocktailId: number | null = null;
  selectedVarianteId: number | null = null;
  selectedQuantity = 1;
  selectedItemNotes = '';

  orderNotes = '';
  pourboire: number | null = null;

  isLoadingCatalog = false;
  isSubmitting = false;

  constructor() {
    addIcons({
      closeOutline,
      addOutline,
      removeOutline,
      trashOutline,
      saveOutline,
      addCircleOutline,
      sparklesOutline,
      wineOutline,
    });
  }

  ngOnInit(): void {
    if (this.commande) {
      this.orderNotes = this.commande.notes ?? '';
      this.pourboire = this.commande.pourboire ?? null;
      this.initItemsFromCommande(this.commande.items ?? []);
    }
    this.loadCocktailCatalog();
  }

  private initItemsFromCommande(items: CommandeItem[]): void {
    const groupedMap = new Map<string, EditableOrderItem>();

    for (const item of items) {
      const key = `${item.cocktailId ?? item.cocktailNom}|${item.varianteId ?? ''}|${item.notes ?? ''}`;
      const existing = groupedMap.get(key);
      if (existing) {
        existing.quantite += (item.quantite || 1);
      } else {
        groupedMap.set(key, {
          id: item.id,
          cocktailId: item.cocktailId ?? 0,
          cocktailNom: item.cocktailNom ?? 'Cocktail',
          varianteId: item.varianteId,
          varianteNom: item.varianteNom,
          prixUnitaire: item.prixUnitaire ?? 0,
          quantite: item.quantite || 1,
          notes: item.notes ?? '',
          prioritaire: !!item.prioritaire,
        });
      }
    }
    this.items = Array.from(groupedMap.values());
  }

  loadCocktailCatalog(): void {
    this.isLoadingCatalog = true;
    this.cocktailService.getAll().subscribe({
      next: (cocktails: Cocktail[]) => {
        this.availableCocktails = cocktails.filter(c => c.disponible !== false);
        this.cocktailOptions = this.availableCocktails.map(c => ({
          value: c.id,
          label: c.nom,
          subLabel: `${c.prix?.toFixed(2)} €`,
          badge: c.categorie,
          imageUrl: c.imageUrl,
        }));
        this.isLoadingCatalog = false;
      },
      error: () => {
        this.isLoadingCatalog = false;
      },
    });
  }

  get selectedCocktail(): Cocktail | undefined {
    return this.availableCocktails.find(c => c.id === this.selectedCocktailId);
  }

  get selectedCocktailVariants(): CocktailVariante[] {
    return this.selectedCocktail?.variantes?.filter(v => v.disponible !== false) ?? [];
  }

  onCocktailSelected(cocktailId: number | null): void {
    this.selectedCocktailId = cocktailId;
    this.selectedVarianteId = null;
  }

  incrementItem(index: number): void {
    if (this.items[index]) {
      this.items[index].quantite += 1;
    }
  }

  decrementItem(index: number): void {
    if (!this.items[index]) return;
    if (this.items[index].quantite > 1) {
      this.items[index].quantite -= 1;
    } else {
      this.removeItem(index);
    }
  }

  async removeItem(index: number): Promise<void> {
    if (this.items.length <= 1) {
      const toast = await this.toastCtrl.create({
        message: this.translocoService.translate('EDIT_COMMANDE.MIN_ONE_ITEM'),
        duration: 3000,
        color: 'warning',
      });
      await toast.present();
      return;
    }

    const item = this.items[index];
    const alert = await this.alertCtrl.create({
      header: this.translocoService.translate('COMMON.CONFIRM'),
      message: `${this.translocoService.translate('EDIT_COMMANDE.CONFIRM_DELETE_ITEM')} (${item.cocktailNom})`,
      buttons: [
        { text: this.translocoService.translate('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translocoService.translate('COMMON.DELETE'),
          role: 'destructive',
          handler: () => {
            this.items.splice(index, 1);
          },
        },
      ],
    });
    await alert.present();
  }

  addNewItem(): void {
    if (!this.selectedCocktailId) return;

    const cocktail = this.selectedCocktail;
    if (!cocktail) return;

    let unitPrice = cocktail.prix;
    let varianteNom: string | undefined;

    if (this.selectedVarianteId) {
      const variant = this.selectedCocktailVariants.find(v => v.id === this.selectedVarianteId);
      if (variant) {
        varianteNom = variant.nom;
        if (variant.prixSupplement) {
          unitPrice += variant.prixSupplement;
        }
      }
    }

    // Check if duplicate item already exists with identical variant and notes
    const existingIndex = this.items.findIndex(
      it => it.cocktailId === cocktail.id &&
            it.varianteId === (this.selectedVarianteId ?? undefined) &&
            it.notes === this.selectedItemNotes
    );

    if (existingIndex >= 0) {
      this.items[existingIndex].quantite += this.selectedQuantity;
    } else {
      this.items.push({
        cocktailId: cocktail.id,
        cocktailNom: cocktail.nom,
        varianteId: this.selectedVarianteId ?? undefined,
        varianteNom,
        prixUnitaire: unitPrice,
        quantite: this.selectedQuantity,
        notes: this.selectedItemNotes,
        prioritaire: false,
      });
    }

    // Reset selector
    this.selectedCocktailId = null;
    this.selectedVarianteId = null;
    this.selectedQuantity = 1;
    this.selectedItemNotes = '';
  }

  calculateTotal(): number {
    const itemsTotal = this.items.reduce((sum, item) => sum + (item.prixUnitaire * item.quantite), 0);
    const tip = this.pourboire && this.pourboire > 0 ? this.pourboire : 0;
    return itemsTotal + tip;
  }

  onSubmit(): void {
    if (this.items.length === 0) {
      return;
    }

    this.isSubmitting = true;
    const request: ModifierCommandeRequest = {
      items: this.items.map(it => ({
        id: it.id,
        cocktailId: it.cocktailId,
        varianteId: it.varianteId,
        quantite: it.quantite,
        notes: it.notes || undefined,
        prioritaire: it.prioritaire,
      })),
      notes: this.orderNotes || undefined,
      pourboire: this.pourboire && this.pourboire > 0 ? this.pourboire : undefined,
    };

    this.dashboardService.modifierCommande(this.commande.id, request).subscribe({
      next: async (updated: Commande) => {
        this.isSubmitting = false;
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate('EDIT_COMMANDE.SAVE_SUCCESS', { id: this.commande.id }),
          duration: 3000,
          color: 'success',
        });
        await toast.present();
        this.modalCtrl.dismiss({ updated: true, commande: updated });
      },
      error: async () => {
        this.isSubmitting = false;
        const toast = await this.toastCtrl.create({
          message: this.translocoService.translate('EDIT_COMMANDE.SAVE_ERROR'),
          duration: 3000,
          color: 'danger',
        });
        await toast.present();
      },
    });
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
