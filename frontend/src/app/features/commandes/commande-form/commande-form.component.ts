import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatError} from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
@Component({
    selector: 'app-commande-form',
    templateUrl: './commande-form.component.html',
    styleUrls: ['./commande-form.component.scss'],
    standalone: true,
    imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatFormFieldModule, MatInputModule, MatButtonModule, MatError, ReactiveFormsModule, NgIf, MatSelectModule, MatOptionModule]
})
export class CommandeFormComponent implements OnInit {
  commandeForm: FormGroup;
  isEditMode = false;
  commandeId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private snackBar: MatSnackBar
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

  onSubmit(): void {
    if (this.commandeForm.valid) {
      // TODO: Implémenter la logique de sauvegarde
      this.snackBar.open('Commande sauvegardée avec succès', 'Fermer', {
        duration: 3000
      });
      this.router.navigate(['/commandes']);
    }
  }
}
