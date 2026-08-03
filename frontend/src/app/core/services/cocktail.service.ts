import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cocktail } from '../models/cocktail.model';

@Injectable({ providedIn: 'root' })
export class CocktailService {
  private readonly api = `${environment.apiUrl}/cocktails`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<Cocktail[]> {
    return this.http.get<Cocktail[]>(this.api);
  }

  getById(id: number): Observable<Cocktail> {
    return this.http.get<Cocktail>(`${this.api}/${id}`);
  }

  create(cocktail: Partial<Cocktail>): Observable<Cocktail> {
    return this.http.post<Cocktail>(this.api, cocktail);
  }

  update(id: number, cocktail: Partial<Cocktail>): Observable<Cocktail> {
    return this.http.put<Cocktail>(`${this.api}/${id}`, cocktail);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  toggleDisponibilite(id: number): Observable<Cocktail> {
    return this.http.patch<Cocktail>(`${this.api}/${id}/toggle-disponibilite`, {});
  }

  search(nom: string): Observable<Cocktail[]> {
    return this.http.get<Cocktail[]>(`${this.api}/search`, { params: { nom } });
  }

  getDisponibles(): Observable<Cocktail[]> {
    return this.http.get<Cocktail[]>(`${this.api}/disponibles`);
  }

  updateSaisonnalite(id: number, moisDebut: number | null, moisFin: number | null): Observable<Cocktail> {
    return this.http.patch<Cocktail>(`${this.api}/${id}/saisonnalite`, { moisDebut, moisFin });
  }

  uploadImage(id: number, file: File): Observable<Cocktail> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Cocktail>(`${this.api}/${id}/image`, formData);
  }
}
