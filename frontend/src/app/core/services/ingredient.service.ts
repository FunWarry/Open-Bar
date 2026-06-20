import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ingredient } from '../models/ingredient.model';

@Injectable({ providedIn: 'root' })
export class IngredientService {
  private readonly api = `${environment.apiUrl}/ingredients`;
  private http = inject(HttpClient);

  getAll(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(this.api);
  }

  getById(id: number): Observable<Ingredient> {
    return this.http.get<Ingredient>(`${this.api}/${id}`);
  }

  create(ingredient: Partial<Ingredient>): Observable<Ingredient> {
    return this.http.post<Ingredient>(this.api, ingredient);
  }

  update(id: number, ingredient: Partial<Ingredient>): Observable<Ingredient> {
    return this.http.put<Ingredient>(`${this.api}/${id}`, ingredient);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  updateStock(id: number, quantite: number): Observable<Ingredient> {
    return this.http.patch<Ingredient>(`${this.api}/${id}/stock`, { quantite });
  }

  setSeuilAlerte(id: number, seuil: number): Observable<Ingredient> {
    return this.http.patch<Ingredient>(`${this.api}/${id}/seuil-alerte`, { seuil });
  }

  search(nom: string): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(`${this.api}/search`, { params: { nom } });
  }

  getEnAlerte(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(`${this.api}/alerte`);
  }
}
