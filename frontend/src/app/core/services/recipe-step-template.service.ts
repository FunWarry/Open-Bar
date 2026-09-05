import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RecipeStepActionType,
  RecipeStepTemplate,
  RecipeStepTemplateRequest,
} from '../models/recipe-step.model';

/**
 * Service managing reusable recipe step templates for the cocktail builder.
 */
@Injectable({ providedIn: 'root' })
export class RecipeStepTemplateService {
  private readonly api = `${environment.apiUrl}/recipe-step-templates`;
  private readonly http = inject(HttpClient);

  /**
   * Retrieves all available recipe step templates.
   *
   * @param actionType Optional action type filter
   * @returns Observable of recipe step templates array
   */
  getAll(actionType?: RecipeStepActionType): Observable<RecipeStepTemplate[]> {
    const params: { actionType?: string } = {};
    if (actionType) {
      params.actionType = actionType;
    }
    return this.http.get<RecipeStepTemplate[]>(this.api, { params });
  }

  /**
   * Retrieves a recipe step template by ID.
   *
   * @param id Template ID
   * @returns Observable of recipe step template
   */
  getById(id: number): Observable<RecipeStepTemplate> {
    return this.http.get<RecipeStepTemplate>(`${this.api}/${id}`);
  }

  /**
   * Creates a new reusable recipe step template.
   *
   * @param template Template creation payload
   * @returns Observable of created recipe step template
   */
  create(template: RecipeStepTemplateRequest): Observable<RecipeStepTemplate> {
    return this.http.post<RecipeStepTemplate>(this.api, template);
  }

  /**
   * Updates an existing recipe step template.
   *
   * @param id Template ID
   * @param template Template update payload
   * @returns Observable of updated recipe step template
   */
  update(
    id: number,
    template: RecipeStepTemplateRequest,
  ): Observable<RecipeStepTemplate> {
    return this.http.put<RecipeStepTemplate>(`${this.api}/${id}`, template);
  }

  /**
   * Deletes a custom recipe step template.
   *
   * @param id Template ID
   * @returns Observable of void
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
