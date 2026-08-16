import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonButton, IonNote, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { CommandeService } from '../../../core/services/commande.service';
import { TableService } from '../../../core/services/table.service';
import { TableBar } from '../../../core/models/table.model';

@Component({
  selector: 'app-commande-form',
  templateUrl: './commande-form.component.html',
  styleUrls: ['./commande-form.component.scss'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonButton, IonNote,
    IonSelect, IonSelectOption,
    ReactiveFormsModule,
    TranslocoPipe
  ],
})
export class CommandeFormComponent implements OnInit {
  commandeForm: FormGroup;
  isEditMode = false;
  commandeId: number | null = null;
  tables: TableBar[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    public readonly router: Router,
    private readonly toastCtrl: ToastController,
    private readonly commandeService: CommandeService,
    private readonly tableService: TableService,
    private readonly transloco: TranslocoService
  ) {
    this.commandeForm = this.fb.group({
      tableId: ['', [Validators.required, Validators.min(1)]],
      notes: [''],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.commandeId = +id;
    }
    this.tableService.getAll().subscribe({
      next: (data) => (this.tables = data),
      error: () => (this.tables = [])
    });
  }

  onSubmit(): void {
    if (this.commandeForm.invalid) return;
    this.commandeService.create(this.commandeForm.value).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({ message: String(this.transloco.translate('MESSAGES.ORDER_CREATED') || 'Commande créée'), duration: 3000, color: 'success' });
        toast.present();
        this.router.navigate(['/commandes']);
      },
      error: async () => {
        const toast = await this.toastCtrl.create({ message: String(this.transloco.translate('ERRORS.SERVER') || 'Erreur lors de la création'), duration: 3000, color: 'danger' });
        toast.present();
      },
    });
  }

  onCancel(): void { this.router.navigate(['/commandes']); }
}
