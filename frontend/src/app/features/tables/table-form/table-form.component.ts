import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {ToastController} from '@ionic/angular/standalone';
import {IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption} from '@ionic/angular/standalone';
import {NgIf} from '@angular/common';

@Component({
    selector: 'app-table-form',
    templateUrl: './table-form.component.html',
    styleUrls: ['./table-form.component.css'],
    standalone: true,
    imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption, ReactiveFormsModule, NgIf]
})
export class TableFormComponent implements OnInit {
  tableForm: FormGroup;
  isEditMode = false;
  tableId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController
  ) {
    this.tableForm = this.fb.group({
      number: ['', [Validators.required]],
      zone: ['', [Validators.required]],
      capacity: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.tableId = this.route.snapshot.params['id'];
    if (this.tableId) {
      this.isEditMode = true;
      // TODO: Charger les données de la table depuis le store
    }
  }

  private async showToast(message: string, color = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color });
    await toast.present();
  }

  onSubmit(): void {
    if (this.tableForm.valid) {
      const tableData = this.tableForm.value;
      if (this.isEditMode) {
        // TODO: Dispatch l'action de mise à jour
      } else {
        // TODO: Dispatch l'action de création
      }
    }
  }

  onCancel(): void {
    this.router.navigate(['/tables']);
  }
}
