import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption,
} from '@ionic/angular/standalone';
import { NgIf } from '@angular/common';
import { TableService } from '../../../core/services/table.service';

@Component({
  selector: 'app-table-form',
  templateUrl: './table-form.component.html',
  styleUrls: ['./table-form.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption,
    ReactiveFormsModule, NgIf,
  ],
})
export class TableFormComponent implements OnInit {
  tableForm: FormGroup;
  isEditMode = false;
  tableId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private tableService: TableService,
  ) {
    this.tableForm = this.fb.group({
      numero:   ['', [Validators.required, Validators.min(1)]],
      zone:     ['', [Validators.required]],
      capacite: ['', [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.tableId = +id;
      this.tableService.getById(this.tableId).subscribe({
        next: table => this.tableForm.patchValue({
          numero:   table.numero,
          zone:     table.zone,
          capacite: table.capacite,
        }),
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Erreur lors du chargement', duration: 3000, color: 'danger' });
          toast.present();
        },
      });
    }
  }

  onSubmit(): void {
    if (this.tableForm.invalid) return;
    const payload = this.tableForm.value;
    const obs$ = this.isEditMode
      ? this.tableService.update(this.tableId!, payload)
      : this.tableService.create(payload);
    obs$.subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({ message: this.isEditMode ? 'Table modifiée' : 'Table créée', duration: 3000, color: 'success' });
        toast.present();
        this.router.navigate(['/tables']);
      },
      error: async () => {
        const toast = await this.toastCtrl.create({ message: 'Erreur lors de la sauvegarde', duration: 3000, color: 'danger' });
        toast.present();
      },
    });
  }

  onCancel(): void { this.router.navigate(['/tables']); }
}
