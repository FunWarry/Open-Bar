import { Component, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ToastController,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  restaurantOutline,
  receiptOutline,
  arrowBackOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
  peopleOutline,
  locationOutline,
  cartOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { CommandeService } from '../../../core/services/commande.service';
import { TableService } from '../../../core/services/table.service';
import { TableBar } from '../../../core/models/table.model';
import { SearchableOption, SearchableSelectComponent } from '../../../core/components/ui/searchable-select/searchable-select.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';

/**
 * Form component for creating or editing orders.
 * Conforms to OpenBar Design System with glassmorphic styling,
 * searchable table combobox, and full mobile/tablet/desktop responsiveness.
 */
@Component({
  selector: 'app-commande-form',
  templateUrl: './commande-form.component.html',
  styleUrls: ['./commande-form.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
    SearchableSelectComponent,
    ActionButtonComponent,
    InputFieldComponent,
    TranslocoPipe,
  ],
})
export class CommandeFormComponent implements OnInit {
  commandeForm: FormGroup;
  isEditMode = false;
  commandeId: number | null = null;

  private readonly _tables = signal<TableBar[]>([]);
  get tables(): TableBar[] {
    return this._tables();
  }
  set tables(val: TableBar[]) {
    this._tables.set(val || []);
  }

  readonly isLoadingTables = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly selectedTableId = signal<number | null>(null);

  /**
   * Searchable select options mapped from active tables.
   */
  readonly tableOptions = computed<SearchableOption<number>[]>(() => {
    return this._tables().map((t) => ({
      value: t.id,
      label: `Table #${t.numero}`,
      subLabel: `${t.zone || 'Salle'} • ${t.capacite} ${this.transloco.translate('TABLES.STATS.SEATS') || 'places'}`,
      badge: t.occupee
        ? (this.transloco.translate('TABLE_CARD.STATUS_OCCUPIED') || 'Occupée')
        : (this.transloco.translate('TABLE_CARD.STATUS_FREE') || 'Libre'),
      badgeType: (t.occupee ? 'warning' : 'success') as 'warning' | 'success',
      icon: 'restaurant-outline',
    }));
  });

  /**
   * Computed reference of currently selected table for live preview.
   */
  readonly selectedTable = computed<TableBar | null>(() => {
    const id = this.selectedTableId();
    if (!id) return null;
    return this._tables().find((t) => t.id === Number(id)) || null;
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    public readonly router: Router,
    private readonly toastCtrl: ToastController,
    private readonly commandeService: CommandeService,
    private readonly tableService: TableService,
    private readonly transloco: TranslocoService
  ) {
    addIcons({
      restaurantOutline,
      receiptOutline,
      arrowBackOutline,
      chatbubbleEllipsesOutline,
      checkmarkCircleOutline,
      informationCircleOutline,
      peopleOutline,
      locationOutline,
      cartOutline,
    });

    this.commandeForm = this.fb.group({
      tableId: ['', [Validators.required, Validators.min(1)]],
      notes: [''],
    });

    this.commandeForm.get('tableId')?.valueChanges.subscribe((val) => {
      this.selectedTableId.set(val ? Number(val) : null);
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.commandeId = +id;
      this.commandeService.getById(this.commandeId).subscribe({
        next: (order) => {
          if (order) {
            this.commandeForm.patchValue({
              tableId: order.tableId ?? '',
              notes: order.notes ?? '',
            });
            if (order.tableId) {
              this.selectedTableId.set(order.tableId);
            }
          }
        },
      });
    }

    this.tableService.getAll().subscribe({
      next: (data) => {
        this.tables = data || [];
        this.isLoadingTables.set(false);
      },
      error: () => {
        this.tables = [];
        this.isLoadingTables.set(false);
      },
    });
  }

  /**
   * Submits the order form to create or update an order.
   */
  onSubmit(): void {
    if (this.commandeForm.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const rawValue = this.commandeForm.value;
    const payload = {
      tableId: Number(rawValue.tableId),
      notes: rawValue.notes ? String(rawValue.notes).trim() : undefined,
    };

    const request$ = this.isEditMode && this.commandeId
      ? this.commandeService.update(this.commandeId, payload)
      : this.commandeService.create(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const successMsg = this.isEditMode
          ? String(this.transloco.translate('COMMON.SUCCESS') || 'Modifications enregistrées')
          : String(this.transloco.translate('MESSAGES.ORDER_CREATED') || 'Commande créée');
        void this.toastCtrl.create({
          message: successMsg,
          duration: 3000,
          color: 'success',
        }).then((t) => void t.present());
        void this.router.navigate(['/commandes']);
      },
      error: () => {
        this.isSubmitting.set(false);
        void this.toastCtrl.create({
          message: String(this.transloco.translate('ERRORS.SERVER') || 'Erreur lors de la création'),
          duration: 3000,
          color: 'danger',
        }).then((t) => void t.present());
      },
    });
  }

  /**
   * Cancels and returns to orders supervision page.
   */
  onCancel(): void {
    void this.router.navigate(['/commandes']);
  }
}
