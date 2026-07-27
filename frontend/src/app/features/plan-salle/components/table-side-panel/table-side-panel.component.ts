import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonBadge } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline, gitMergeOutline, trashOutline } from 'ionicons/icons';
import { TableBar } from '../../../../core/models/table.model';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';

@Component({
  selector: 'app-table-side-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonButton, IonIcon, IonBadge,
    ActionButtonComponent,
  ],
  templateUrl: './table-side-panel.component.html',
  styleUrls: ['./table-side-panel.component.scss'],
})
export class TableSidePanelComponent {
  @Input() table: TableBar | null = null;
  @Input() isOpen = false;

  @Output() closePanel = new EventEmitter<void>();
  @Output() saveTable = new EventEmitter<Partial<TableBar>>();
  @Output() startFusion = new EventEmitter<TableBar>();

  constructor() {
    addIcons({ closeOutline, saveOutline, gitMergeOutline, trashOutline });
  }

  onClose() {
    this.closePanel.emit();
  }

  onStartFusion() {
    if (this.table) {
      this.startFusion.emit(this.table);
    }
  }

  onSave() {
    if (this.table) {
      this.saveTable.emit(this.table);
    }
  }
}
