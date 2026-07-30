import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ModalController,
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonBadge, IonIcon, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, swapHorizontalOutline, gridOutline } from 'ionicons/icons';
import { TableBar } from '../../../../core/models/table.model';
import { TableService } from '../../../../core/services/table.service';

/**
 * Modal dialog component for selecting a destination table when transferring an order.
 */
@Component({
  selector: 'app-transfert-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonBadge, IonIcon, IonSpinner,
  ],
  templateUrl: './transfert-modal.component.html',
  styleUrls: ['./transfert-modal.component.scss'],
})
export class TransfertModalComponent implements OnInit {
  @Input() currentTableId!: number;
  @Input() commandeId!: number;

  tables: TableBar[] = [];
  isLoading = false;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly tableService: TableService
  ) {
    addIcons({ closeOutline, swapHorizontalOutline, gridOutline });
  }

  ngOnInit(): void {
    this.chargerTables();
  }

  /**
   * Fetches available tables from the system and excludes the source table.
   */
  chargerTables(): void {
    this.isLoading = true;
    this.tableService.getAll().subscribe({
      next: (allTables) => {
        this.tables = allTables.filter(t => t.id !== this.currentTableId);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Selects a target table and dismisses the modal with the chosen table ID.
   *
   * @param targetTable Selected table entity.
   */
  selectionnerTable(targetTable: TableBar): void {
    this.modalCtrl.dismiss({ targetTableId: targetTable.id, targetTableNumero: targetTable.numero });
  }

  /**
   * Closes the transfer dialog without making changes.
   */
  fermer(): void {
    this.modalCtrl.dismiss(null);
  }
}
