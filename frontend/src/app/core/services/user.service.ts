import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Service managing user administration operations.
 * Handles API communication for user retrieval, creation, modification, and deletion.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetches all registered users from the backend API.
   *
   * @returns Observable emitting an array of {@link User} entities.
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  /**
   * Fetches paginated users with optional search and role filtering.
   *
   * @param page Page index (0-based)
   * @param size Number of items per page
   * @param search Optional search term
   * @param role Optional role filter
   * @returns Observable emitting a {@link PageResponse} of {@link User}
   */
  getUsersPaged(page = 0, size = 10, search = '', role = ''): Observable<PageResponse<User>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    if (role && role !== 'ALL') {
      params = params.set('role', role);
    }

    return this.http.get<PageResponse<User>>(`${this.apiUrl}/paged`, { params });
  }

  /**
   * Fetches a single user by unique identifier.
   *
   * @param id Unique identifier of the user.
   * @returns Observable emitting the matching {@link User}.
   */
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  /**
   * Creates a new user record.
   *
   * @param user Partial user object containing user details.
   * @returns Observable emitting the newly created {@link User}.
   */
  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  /**
   * Updates an existing user record.
   *
   * @param id Unique identifier of the user to update.
   * @param user Partial user object containing updated attributes.
   * @returns Observable emitting the updated {@link User}.
   */
  updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }

  /**
   * Deletes a user record by unique identifier.
   *
   * @param id Unique identifier of the user to remove.
   * @returns Observable completing upon successful deletion.
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
