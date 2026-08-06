import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import { selectCurrentUser } from '../../core/store/auth.selectors';
import { User } from '../../core/models/user.model';
import { AsyncPipe } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';

import { UserService } from '../../core/services/user.service';
import { CocktailService } from '../../core/services/cocktail.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { EtablissementService } from '../../core/services/etablissement.service';
import { NavigationService } from '../../core/services/navigation.service';

/**
 * Admin Component providing centralized administration dashboard and quick actions.
 * Features live KPI metric counters, categorized management shortcuts, and modern glassmorphism UI.
 */
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  standalone: true,
  imports: [AsyncPipe, RouterLink, TranslocoModule]
})
export class AdminComponent implements OnInit {
  currentUser$: Observable<User | null>;
  userCount$: Observable<number> = of(0);
  cocktailCount$: Observable<number> = of(0);
  ingredientCount$: Observable<number> = of(0);
  etablissementName$: Observable<string> = of('OpenBar SARL');

  constructor(
    private readonly store: Store,
    protected readonly navigationService: NavigationService,
    private readonly userService: UserService,
    private readonly cocktailService: CocktailService,
    private readonly ingredientService: IngredientService,
    private readonly etablissementService: EtablissementService
  ) {
    this.currentUser$ = this.store.select(selectCurrentUser);
  }

  ngOnInit(): void {
    this.userCount$ = this.userService.getUsers().pipe(
      map(users => users ? users.length : 0),
      catchError(() => of(0))
    );

    this.cocktailCount$ = this.cocktailService.getAll().pipe(
      map(cocktails => cocktails ? cocktails.length : 0),
      catchError(() => of(0))
    );

    this.ingredientCount$ = this.ingredientService.getAll().pipe(
      map(ingredients => ingredients ? ingredients.length : 0),
      catchError(() => of(0))
    );

    this.etablissementName$ = this.etablissementService.getConfig().pipe(
      map(config => config ? config.legalName : 'OpenBar SARL'),
      catchError(() => of('OpenBar SARL'))
    );
  }
}
