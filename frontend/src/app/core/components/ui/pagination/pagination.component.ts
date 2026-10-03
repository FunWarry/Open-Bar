import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';

/**
 * Reusable Pagination component adhering to OpenBar Design System.
 *
 * Provides responsive pagination navigation with previous/next controls,
 * smart ellipsis number pills, item range summary, and optional page size options.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, IonIcon, TranslocoModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent {
  /** Current active 1-indexed page number. */
  @Input() currentPage: number = 1;

  /** Total count of items across all pages. */
  @Input() totalItems: number = 0;

  /** Number of items displayed per page. */
  @Input() pageSize: number = 24;

  /** Available page size selection options. */
  @Input() pageSizeOptions: number[] = [24, 48, 96];

  /** Whether to show the page size switcher controls. */
  @Input() showPageSize: boolean = false;

  /** Whether to show the item range summary ("Showing X to Y of Z"). */
  @Input() showSummary: boolean = true;

  /** Transloco translation key for the summary line. */
  @Input() summaryKey: string = 'COMMON.PAGINATION.SHOWING';

  /** Custom root testid attribute for automated testing. */
  @Input() testId: string = 'pagination';

  /** Event emitted when user selects a new page. */
  @Output() readonly pageChange = new EventEmitter<number>();

  /** Event emitted when user changes the page size. */
  @Output() readonly pageSizeChange = new EventEmitter<number>();

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline });
  }

  /**
   * Total number of pages calculated from total items and page size.
   */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / (this.pageSize || 1)));
  }

  /**
   * 1-indexed starting item number for current page.
   */
  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  /**
   * Ending item number for current page.
   */
  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  /**
   * Generates the array of visible page numbers with -1 representing ellipsis ('…').
   */
  get pages(): number[] {
    const total = this.totalPages;
    if (total <= 7) {
      const result: number[] = [];
      for (let i = 1; i <= total; i++) {
        result.push(i);
      }
      return result;
    }

    const current = Math.min(Math.max(1, this.currentPage), total);

    if (current <= 4) {
      return [1, 2, 3, 4, 5, -1, total];
    }

    if (current >= total - 3) {
      return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, -1, current - 1, current, current + 1, -1, total];
  }

  /**
   * Navigates to a specific page if valid and different from current.
   *
   * @param page Target page number
   */
  onPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  /**
   * Navigates to the previous page.
   */
  onPrev(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  /**
   * Navigates to the next page.
   */
  onNext(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  /**
   * Changes the items per page.
   *
   * @param size New page size
   */
  onPageSize(size: number): void {
    if (size !== this.pageSize) {
      this.pageSizeChange.emit(size);
    }
  }
}
