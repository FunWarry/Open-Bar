import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastController} from '@ionic/angular/standalone';
import {IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption} from '@ionic/angular/standalone';
import {ReactiveFormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';

@Component({
    selector: 'app-commande-form',
    templateUrl: './commande-form.component.html',
    styleUrls: ['./commande-form.component.scss'],
    standalone: true,
    imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonNote, IonSelect, IonSelectOption, ReactiveFormsModule, NgIf]
})
export class CommandeFormComponent implements OnInit {
  commandeForm: FormGroup;
  isEditMode = false;
  commandeId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private toastCtrl: ToastController
  ) {
    this.commandeForm = this.fb.group({
      tableId: ['', Validators.required],
      items: this.fb.array([]),
      status: ['EN_ATTENTE', Validators.required]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.commandeId = +id;
      // TODO: Charger les données de la commande
    }
  }

  private async showToast(message: string, color = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color });
    await toast.present();
  }

  onSubmit(): void {
    if (this.commandeForm.valid) {
      // TODO: Implémenter la logique de sauvegarde
      this.showToast('Commande sauvegardée avec succès');
      this.router.navigate(['/commandes']);
    }
  }
}
