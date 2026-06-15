import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatError} from '@angular/material/form-field';
import { NgIf } from '@angular/common';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
@Component({
    selector: 'app-cocktail-form',
    templateUrl: './cocktail-form.component.html',
    styleUrls: ['./cocktail-form.component.scss'],
    standalone: true,
    imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatFormFieldModule, MatInputModule, MatButtonModule, MatError, ReactiveFormsModule, NgIf, MatOptionModule, MatSelectModule]
})
export class CocktailFormComponent implements OnInit {
  cocktailForm: FormGroup;
  isEditMode = false;
  cocktailId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private snackBar: MatSnackBar
  ) {
    this.cocktailForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.cocktailId = +id;
      // TODO: Charger les données du cocktail
    }
  }

  onSubmit(): void {
    if (this.cocktailForm.valid) {
      // TODO: Implémenter la logique de sauvegarde
      this.snackBar.open('Cocktail sauvegardé avec succès', 'Fermer', {
        duration: 3000
      });
      this.router.navigate(['/cocktails']);
    }
  }
}
