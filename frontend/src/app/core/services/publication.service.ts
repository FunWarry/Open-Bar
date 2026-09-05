import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * DTO representing the publication state of a weekly schedule.
 */
export interface WeekSchedulePublicationDTO {
  /** Publication record identifier */
  id: number;
  /** ISO date (yyyy-MM-dd) of the Monday of the published week */
  weekStart: string;
  /** ISO datetime of the most recent publication */
  publishedAt: string;
  /** Username of the manager who published the planning */
  publishedBy: string;
  /** JSON snapshot of shifts at publication time */
  snapshotJson?: string;
}

/**
 * Angular service managing REST calls for weekly schedule publication.
 * <p>
 * Calls:
 * - {@code POST /api/schedule/publish?weekStart=yyyy-MM-dd} — publish a week
 * - {@code GET /api/schedule/publication?weekStart=yyyy-MM-dd} — query publication state
 */
@Injectable({ providedIn: 'root' })
export class PublicationService {
  private readonly apiUrl = `${environment.apiUrl}/schedule`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Publishes (or republishes) the weekly planning for the given Monday date.
   * Triggers a STOMP broadcast on /topic/schedule/published for all connected users.
   *
   * @param weekStart ISO date (yyyy-MM-dd) of the Monday of the target week
   * @returns Observable of the saved publication DTO
   */
  publishWeek(weekStart: string): Observable<WeekSchedulePublicationDTO> {
    return this.http.post<WeekSchedulePublicationDTO>(
      `${this.apiUrl}/publish`,
      null,
      { params: { weekStart } }
    );
  }

  /**
   * Returns the publication record for the given week if it has been published.
   * Returns null (HTTP 204) if the week has not been published yet.
   *
   * @param weekStart ISO date (yyyy-MM-dd) of the Monday of the target week
   * @returns Observable of the publication DTO, or null if not yet published
   */
  getPublication(weekStart: string): Observable<WeekSchedulePublicationDTO | null> {
    return this.http.get<WeekSchedulePublicationDTO | null>(
      `${this.apiUrl}/publication`,
      { params: { weekStart } }
    );
  }
}
