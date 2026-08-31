import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TableBar } from '../models/table.model';

/**
 * Service managing bar floor plan tables, real-time occupancy state, and QR code / stand exports.
 */
@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly api = `${environment.apiUrl}/tables`;
  private readonly http = inject(HttpClient);

  /**
   * Retrieves all registered tables.
   */
  getAll(): Observable<TableBar[]> {
    return this.http.get<TableBar[]>(this.api);
  }

  /**
   * Retrieves a specific table by its unique identifier.
   */
  getById(id: number): Observable<TableBar> {
    return this.http.get<TableBar>(`${this.api}/${id}`);
  }

  /**
   * Creates a new table entity.
   */
  create(table: Partial<TableBar>): Observable<TableBar> {
    return this.http.post<TableBar>(this.api, table);
  }

  /**
   * Updates an existing table entity.
   */
  update(id: number, table: Partial<TableBar>): Observable<TableBar> {
    return this.http.put<TableBar>(`${this.api}/${id}`, table);
  }

  /**
   * Deletes a table by ID.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  /**
   * Marks a table as occupied by an optional server.
   */
  occuper(id: number, serveurId?: number): Observable<TableBar> {
    return this.http.patch<TableBar>(`${this.api}/${id}/occuper`, { serveurId });
  }

  /**
   * Frees an occupied table.
   */
  liberer(id: number): Observable<TableBar> {
    return this.http.patch<TableBar>(`${this.api}/${id}/liberer`, {});
  }

  /**
   * Retrieves currently free tables.
   */
  getLibres(): Observable<TableBar[]> {
    return this.http.get<TableBar[]>(`${this.api}/libres`);
  }

  /**
   * Retrieves currently occupied tables.
   */
  getOccupees(): Observable<TableBar[]> {
    return this.http.get<TableBar[]>(`${this.api}/occupees`);
  }

  /**
   * Retrieves distinct table zone names.
   */
  getZones(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/zones`);
  }

  /**
   * Returns the direct API URL for a table's QR code (PNG or SVG).
   *
   * @param tableId Unique table ID
   * @param format Output format ('PNG' | 'SVG')
   * @param size Pixel resolution/size
   */
  getTableQrCodeUrl(tableId: number, format: 'PNG' | 'SVG' = 'PNG', size: number = 300): string {
    return `${this.api}/${tableId}/qrcode?format=${format}&size=${size}`;
  }

  /**
   * Downloads a table QR code image as a raw Blob.
   *
   * @param tableId Unique table ID
   * @param format Output format ('PNG' | 'SVG')
   * @param size Pixel resolution/size
   */
  downloadTableQrCode(tableId: number, format: 'PNG' | 'SVG' = 'PNG', size: number = 300): Observable<Blob> {
    const params = new HttpParams()
      .set('format', format)
      .set('size', size.toString());
    return this.http.get(`${this.api}/${tableId}/qrcode`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Downloads printable A4 table QR codes PDF (stands, cards, or stickers).
   *
   * @param layout Printable layout ('STAND' | 'CARD' | 'STICKER')
   * @param tableIds Optional list of table IDs (exports all if empty/omitted)
   * @param includeWifi Whether to render establishment Wi-Fi connection QR codes
   */
  downloadQrCodesPdf(layout: 'STAND' | 'CARD' | 'STICKER' = 'STAND', tableIds?: number[], includeWifi?: boolean): Observable<Blob> {
    let params = new HttpParams().set('layout', layout);
    if (tableIds && tableIds.length > 0) {
      tableIds.forEach(id => {
        params = params.append('tableIds', id.toString());
      });
    }
    if (includeWifi !== undefined) {
      params = params.set('includeWifi', includeWifi.toString());
    }
    return this.http.get(`${this.api}/qrcodes/pdf`, {
      params,
      responseType: 'blob'
    });
  }
}
