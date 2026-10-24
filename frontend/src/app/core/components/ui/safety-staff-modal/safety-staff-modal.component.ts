import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  carOutline,
  callOutline,
  warningOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  chatbubbleEllipsesOutline,
  bookOutline,
  megaphoneOutline,
} from 'ionicons/icons';
import { ModalComponent } from '../modal/modal.component';
import { SearchableSelectComponent, SearchableOption } from '../searchable-select/searchable-select.component';
import { InputFieldComponent } from '../input-field/input-field.component';
import { ActionButtonComponent } from '../action-button/action-button.component';
import { SafetyAlertService } from '../../../services/safety-alert.service';
import { TableService } from '../../../services/table.service';
import { AppSettingsService } from '../../../services/app-settings.service';
import { SafetyAlertType } from '../../../models/safety-alert.model';
import { TableBar } from '../../../models/table.model';
import { EmergencyHelpline } from '../../../models/app-settings.model';

/**
 * Staff emergency assistance memo & manual trigger modal component.
 * Provides front-of-house staff (barmen, waitstaff, managers) with an interactive protocol guide
 * detailing the 3 Angel Shot code words and practical steps, as well as an emergency form to
 * immediately broadcast a safety alert for a table.
 */
@Component({
  selector: 'app-safety-staff-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    IonIcon,
    IonModal,
    ModalComponent,
    SearchableSelectComponent,
    InputFieldComponent,
    ActionButtonComponent,
  ],
  templateUrl: './safety-staff-modal.component.html',
  styleUrls: ['./safety-staff-modal.component.scss'],
})
export class SafetyStaffModalComponent implements OnInit {
  private readonly safetyAlertService = inject(SafetyAlertService);
  private readonly tableService = inject(TableService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly transloco = inject(TranslocoService);

  @Output() modalClosed = new EventEmitter<void>();

  activeTab: 'memo' | 'trigger' = 'memo';

  selectedTableId: number | null = null;
  selectedVariant: SafetyAlertType = 'ANGEL_SHOT_NEAT';
  note = '';

  tableOptions: SearchableOption<number>[] = [];
  emergencyNumbers: EmergencyHelpline[] = [];
  isSubmitting = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);

  readonly variants: {
    type: SafetyAlertType;
    icon: string;
    titleKey: string;
    descKey: string;
    actionKey: string;
    badgeClass: string;
  }[] = [
    {
      type: 'ANGEL_SHOT_NEAT',
      icon: '🚗',
      titleKey: 'SAFETY.VARIANT_NEAT_TITLE',
      descKey: 'SAFETY.VARIANT_NEAT_DESC',
      actionKey: 'SAFETY.VARIANT_NEAT_ACTION',
      badgeClass: 'variant-neat',
    },
    {
      type: 'ANGEL_SHOT_ICE',
      icon: '🚕',
      titleKey: 'SAFETY.VARIANT_ICE_TITLE',
      descKey: 'SAFETY.VARIANT_ICE_DESC',
      actionKey: 'SAFETY.VARIANT_ICE_ACTION',
      badgeClass: 'variant-ice',
    },
    {
      type: 'ANGEL_SHOT_LIME',
      icon: '🚨',
      titleKey: 'SAFETY.VARIANT_LIME_TITLE',
      descKey: 'SAFETY.VARIANT_LIME_DESC',
      actionKey: 'SAFETY.VARIANT_LIME_ACTION',
      badgeClass: 'variant-lime',
    },
  ];

  constructor() {
    addIcons({
      shieldCheckmarkOutline,
      carOutline,
      callOutline,
      warningOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      chatbubbleEllipsesOutline,
      bookOutline,
      megaphoneOutline,
    });
  }

  ngOnInit(): void {
    this.loadTables();
    this.loadEmergencyNumbers();
  }

  private loadEmergencyNumbers(): void {
    this.emergencyNumbers = this.appSettingsService.getEmergencyNumbers();
  }

  private loadTables(): void {
    this.tableService.getAll().subscribe({
      next: (tables: TableBar[]) => {
        const sortedTables = [...tables].sort((a, b) => a.numero - b.numero);
        this.tableOptions = sortedTables.map((t) => ({
          value: t.id,
          label: `${this.transloco.translate('SAFETY.TABLE_LABEL')} #${t.numero}${t.emplacement ? ' — ' + t.emplacement : ''}`,
          badge: t.zone || undefined,
          badgeType: 'neutral',
        }));
        if (this.tableOptions.length > 0 && !this.selectedTableId) {
          this.selectedTableId = this.tableOptions[0].value;
        }
      },
      error: () => {
        this.tableOptions = [];
      },
    });
  }

  selectVariant(type: SafetyAlertType): void {
    this.selectedVariant = type;
  }

  dispatchAlert(): void {
    if (!this.selectedTableId) {
      this.errorMessage.set(this.transloco.translate('SAFETY.ERROR_SELECT_TABLE'));
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.safetyAlertService
      .triggerStaffAlert(this.selectedTableId, this.selectedVariant, this.note.trim() || undefined)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isSuccess.set(true);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg = err?.error?.message || this.transloco.translate('SAFETY.ERROR_DISPATCH');
          this.errorMessage.set(msg);
        },
      });
  }

  dismiss(): void {
    this.modalClosed.emit();
  }
}
