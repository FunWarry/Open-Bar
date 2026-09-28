import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Supported semantic color identifiers for the left accent border.
 */
export type CardAccentColor =
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'purple'
  | 'none'
  | (string & {});

/**
 * Divider border line styles between header, body, and footer sections.
 */
export type CardDividerStyle = 'none' | 'solid' | 'dashed';

/**
 * Background variant types for the card container.
 */
export type CardBackgroundVariant =
  | 'surface-1'
  | 'surface-2'
  | 'glass'
  | 'transparent'
  | (string & {});

/**
 * Inner padding preset sizes.
 */
export type CardPaddingSize = 'none' | 'sm' | 'md' | 'lg';

/**
 * Card elevation shadow depth presets.
 */
export type CardElevationSize = 'none' | 'sm' | 'md' | 'lg';

/**
 * Unified, generic card component providing a standardized container for all entity cards
 * across OpenBar (orders, tables, cocktails, invoices, inventory, purchases, and bar tabs).
 *
 * Features:
 * - 3 customizable content projection slots: `[card-header]`, `[card-content]`/`[card-body]`, `[card-footer]`
 * - Rounded left vertical accent border (liseré) styled after the order-taking card
 * - Configurable section dividers ('solid', 'dashed', 'none') with independent visibility toggles
 * - Active / Inactive states (dimmed opacity, muted background, dashed border like unavailable cocktails)
 * - Clickable interactivity with hover lift, active scale, and accessible keyboard navigation (Enter/Space)
 * - Fully adaptive Light/Dark theme support via CSS variable design tokens
 */
@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class CardComponent {
  /**
   * Accent border color. Can be a semantic keyword ('primary', 'success', 'danger', 'warning', 'info', 'purple')
   * or a custom CSS color / variable string. Set to 'none' or null/undefined to omit the accent border.
   */
  @Input() accentColor: CardAccentColor | null = null;

  /**
   * Width of the left accent border strip (default: '4px').
   */
  @Input() accentWidth = '4px';

  /**
   * Background styling variant. Accepts 'surface-1', 'surface-2', 'glass', 'transparent', or a direct CSS color string.
   */
  @Input() background: CardBackgroundVariant = 'surface-1';

  /**
   * Whether the card is active/available. When false, displays dimmed opacity, muted background,
   * and dashed border (identical to unavailable cocktail cards).
   */
  @Input() active = true;

  /**
   * Whether the card is interactive and clickable. Enables hover lift, cursor pointer, and click/key events.
   */
  @Input() clickable = false;

  /**
   * Divider style between header and content sections.
   */
  @Input() headerDivider: CardDividerStyle = 'dashed';

  /**
   * Divider style between content and footer sections.
   */
  @Input() footerDivider: CardDividerStyle = 'dashed';

  /**
   * Visibility flag for the header section.
   */
  @Input() showHeader = true;

  /**
   * Visibility flag for the footer section.
   */
  @Input() showFooter = true;

  /**
   * Padding size applied to sections ('none', 'sm', 'md', 'lg').
   */
  @Input() padding: CardPaddingSize = 'md';

  /**
   * Shadow elevation depth ('none', 'sm', 'md', 'lg').
   */
  @Input() elevation: CardElevationSize = 'sm';

  /**
   * Custom CSS class passed to the container element.
   */
  @Input() customClass = '';

  /**
   * Test identifier for end-to-end and unit testing (`data-testid`).
   */
  @Input() testId = 'app-card';

  /**
   * Emitted when the user clicks or presses Enter on a clickable, active card.
   */
  @Output() cardClick = new EventEmitter<MouseEvent | KeyboardEvent>();

  /**
   * Resolves the CSS color for the accent border based on semantic keywords or custom values.
   */
  get resolvedAccentColor(): string | null {
    if (!this.accentColor || this.accentColor === 'none') {
      return null;
    }
    switch (this.accentColor) {
      case 'primary':
        return 'var(--primary, #6c7fe8)';
      case 'success':
        return 'var(--semantic-success, #34c77b)';
      case 'danger':
        return 'var(--semantic-danger, #e5604f)';
      case 'warning':
        return 'var(--semantic-warning, #f4a52a)';
      case 'info':
        return 'var(--semantic-info, #4fc3f7)';
      case 'purple':
        return 'var(--role-admin, #9b8af2)';
      default:
        return this.accentColor;
    }
  }

  /**
   * Computes the CSS background value according to the chosen variant.
   */
  get resolvedBackground(): string {
    switch (this.background) {
      case 'surface-1':
        return 'var(--background-surface-1, #16192b)';
      case 'surface-2':
        return 'var(--background-surface-2, #21263f)';
      case 'glass':
        return 'var(--background-glass, rgba(22, 25, 43, 0.75))';
      case 'transparent':
        return 'transparent';
      default:
        return this.background;
    }
  }

  /**
   * Handles user click on the card.
   */
  onCardClick(event: MouseEvent): void {
    if (this.clickable && this.active) {
      this.cardClick.emit(event);
    }
  }

  /**
   * Handles keyboard activation (Enter / Space) for accessible navigation.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (!this.clickable || !this.active) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.cardClick.emit(event);
    }
  }
}
