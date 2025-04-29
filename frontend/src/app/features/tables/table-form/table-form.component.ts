import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatError} from '@angular/material/form-field';
import { NgIf } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
@Component({
    selector: 'app-table-form',
    template: `
    <div class="table-form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{isEditMode ? 'Modifier la Table' : 'Nouvelle Table'}}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="tableForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Numéro de Table</mat-label>
              <input matInput formControlName="number" type="number" required>
              <mat-error *ngIf="tableForm.get('number')?.hasError('required')">
                Le numéro de table est requis
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Zone</mat-label>
              <mat-select formControlName="zone" required>
                <mat-option value="TERRASSE">Terrasse</mat-option>
                <mat-option value="SALLE">Salle</mat-option>
                <mat-option value="BAR">Bar</mat-option>
              </mat-select>
              <mat-error *ngIf="tableForm.get('zone')?.hasError('required')">
                La zone est requise
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Capacité</mat-label>
              <input matInput formControlName="capacity" type="number" required>
              <mat-error *ngIf="tableForm.get('capacity')?.hasError('required')">
                La capacité est requise
              </mat-error>
              <mat-error *ngIf="tableForm.get('capacity')?.hasError('min')">
                La capacité doit être d'au moins 1 personne
              </mat-error>
            </mat-form-field>

            <div class="form-actions">
              <button mat-button type="button" (click)="onCancel()">Annuler</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="tableForm.invalid">
                {{isEditMode ? 'Modifier' : 'Créer'}}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .table-form-container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 16px;
    }
  `],
    standalone: true,
    imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatFormFieldModule, MatInputModule, MatButtonModule, MatError, ReactiveFormsModule, NgIf, MatSelectModule, MatOptionModule]
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
    private snackBar: MatSnackBar
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
