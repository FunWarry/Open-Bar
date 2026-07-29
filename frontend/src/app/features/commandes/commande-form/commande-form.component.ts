import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonButton, IonNote, IonSelect, IonSelectOption } from '@ionic/angular/standalone';

import { CommandeService } from '../../../core/services/commande.service';

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
  ],
})
export class CommandeFormComponent implements OnInit {
  commandeForm: FormGroup;
  isEditMode = false;
  commandeId: number | null = null;

  constructor(private readonly fb: FormBuilder,private readonly route: ActivatedRoute,public readonly router: Router,private readonly toastCtrl: ToastController,private readonly commandeService: CommandeService,
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
  }

  onSubmit(): void {
    if (this.commandeForm.invalid) return;
    this.commandeService.create(this.commandeForm.value).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({ message: 'Commande créée', duration: 3000, color: 'success' });
        toast.present();
        this.router.navigate(['/commandes']);
      },
      error: async () => {
        const toast = await this.toastCtrl.create({ message: 'Erreur lors de la création', duration: 3000, color: 'danger' });
        toast.present();
      },
    });
  }

  onCancel(): void { this.router.navigate(['/commandes']); }
}
