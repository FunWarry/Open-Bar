import { Injectable } from '@angular/core';

/**
 * Column definition for tabular CSV exports.
 */
export interface CsvColumn<T> {
  /** Property key of the model or an identifier */
  key?: keyof T | string;
  /** Translated header label to display in the first row */
  header: string;
  /** Optional custom formatter function to convert item value to string or primitive */
  formatter?: (value: unknown, item: T) => string | number | boolean | null | undefined;
}

/**
 * Configuration options for CSV exports.
 */
export interface CsvExportOptions {
  /** Delimiter character, defaults to semicolon (;) for Excel European locale compatibility */
  delimiter?: string;
  /** Whether to prepend UTF-8 Byte Order Mark (\uFEFF) to support accents in Excel, defaults to true */
  includeBom?: boolean;
  /** Whether to sanitize formula injection characters (=, +, -, @, \t, \r), defaults to true */
  sanitizeFormulas?: boolean;
  /** Optional reference date for filename timestamp formatting */
  referenceDate?: Date;
}

/**
 * Centralized service for standardized, RFC 4180 compliant, and formula injection safe CSV exports.
 */
@Injectable({
  providedIn: 'root'
})
export class CsvExportService {
  /** Default delimiter conforming to French and European spreadsheet standards */
  readonly defaultDelimiter = ';';

  /**
   * Sanitizes string values to prevent CSV formula injection (DDE attacks) in Microsoft Excel and LibreOffice.
   * Prefixes dangerous leading characters (=, +, -, @, \t, \r) with a single quote (').
   *
   * @param value Raw text value
   * @returns Sanitized text safe from formula execution
   */
  sanitizeFormula(value: string): string {
    if (!value) {
      return '';
    }
    const rawFirst = value.charAt(0);
    if (rawFirst === '=' || rawFirst === '+' || rawFirst === '-' || rawFirst === '@' || rawFirst === '\t' || rawFirst === '\r') {
      return `'${value}`;
    }
    const trimmed = value.trimStart();
    if (trimmed.length > 0) {
      const firstChar = trimmed.charAt(0);
      if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@') {
        return `'${value}`;
      }
    }
    return value;
  }

  /**
   * Escapes a single cell value according to RFC 4180 rules.
   *
   * @param value Cell value of any type
   * @param delimiter Column delimiter
   * @param sanitizeFormulas Whether to neutralize leading formula characters
   * @returns RFC 4180 compliant escaped cell string
   */
  escapeCell(value: unknown, delimiter: string = this.defaultDelimiter, sanitizeFormulas = true): string {
    if (value === null || value === undefined) {
      return '';
    }

    let str: string;
    if (typeof value === 'string') {
      str = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      str = value.toString();
    } else if (value instanceof Date) {
      str = value.toISOString();
    } else if (typeof value === 'object') {
      str = JSON.stringify(value);
    } else {
      str = (value as object).toString();
    }

    if (sanitizeFormulas) {
      str = this.sanitizeFormula(str);
    }

    const needsQuotes =
      str.includes(delimiter) ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r') ||
      str.startsWith("'");

    if (needsQuotes) {
      return `"${str.replaceAll('"', '""')}"`;
    }

    return str;
  }

  /**
   * Generates a standardized filename conforming to pattern: openbar_<dataset>_<YYYY-MM-DD_HHmm>.csv.
   *
   * @param dataset Identifier or name of the exported dataset
   * @param date Optional timestamp date, defaults to current time
   * @returns Formatted filename string
   */
  generateFilename(dataset: string, date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const cleanDataset = dataset.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    return `openbar_${cleanDataset}_${yyyy}-${mm}-${dd}_${hours}${minutes}.csv`;
  }

  /**
   * Resolves final filename either from a full filename or dataset identifier.
   *
   * @param datasetOrFilename Dataset name or target file name
   * @param date Optional reference date
   * @returns Full .csv filename
   */
  private resolveFilename(datasetOrFilename: string, date?: Date): string {
    if (datasetOrFilename.toLowerCase().endsWith('.csv')) {
      return datasetOrFilename;
    }
    return this.generateFilename(datasetOrFilename, date);
  }

  /**
   * Exports an array of typed objects as a structured tabular CSV file.
   *
   * @param data Array of records to export
   * @param columns Column definitions with headers and optional formatters
   * @param datasetOrFilename Dataset key or explicit filename
   * @param options Export configuration options
   */
  exportTable<T>(
    data: T[],
    columns: CsvColumn<T>[],
    datasetOrFilename: string,
    options?: CsvExportOptions
  ): void {
    const delimiter = options?.delimiter ?? this.defaultDelimiter;
    const sanitize = options?.sanitizeFormulas ?? true;
    const includeBom = options?.includeBom ?? true;

    const headerRow = columns
      .map((col) => this.escapeCell(col.header, delimiter, false))
      .join(delimiter);

    const rows = data.map((item) =>
      columns
        .map((col) => {
          let rawValue: unknown;
          if (col.formatter) {
            rawValue = col.formatter(col.key ? (item as Record<string, unknown>)[col.key as string] : item, item);
          } else if (col.key) {
            rawValue = (item as Record<string, unknown>)[col.key as string];
          } else {
            rawValue = item;
          }
          return this.escapeCell(rawValue, delimiter, sanitize);
        })
        .join(delimiter)
    );

    const csvContent = [headerRow, ...rows].join('\r\n');
    const fullContent = includeBom ? `\uFEFF${csvContent}` : csvContent;
    const filename = this.resolveFilename(datasetOrFilename, options?.referenceDate);

    this.downloadCsv(fullContent, filename);
  }

  /**
   * Exports an arbitrary 2D array of cells (e.g. key-value sections, composite reports) to CSV.
   *
   * @param rows 2D array of cell values
   * @param datasetOrFilename Dataset key or explicit filename
   * @param options Export configuration options
   */
  exportRows(
    rows: (string | number | boolean | null | undefined)[][],
    datasetOrFilename: string,
    options?: CsvExportOptions
  ): void {
    const delimiter = options?.delimiter ?? this.defaultDelimiter;
    const sanitize = options?.sanitizeFormulas ?? true;
    const includeBom = options?.includeBom ?? true;

    const csvContent = rows
      .map((row) => row.map((cell) => this.escapeCell(cell, delimiter, sanitize)).join(delimiter))
      .join('\r\n');

    const fullContent = includeBom ? `\uFEFF${csvContent}` : csvContent;
    const filename = this.resolveFilename(datasetOrFilename, options?.referenceDate);

    this.downloadCsv(fullContent, filename);
  }

  /**
   * Downloads a CSV string as a local file using a safe DOM anchor.
   *
   * @param content CSV string content (optionally prefixed with BOM)
   * @param filename Target download file name
   */
  downloadCsv(content: string, filename: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
