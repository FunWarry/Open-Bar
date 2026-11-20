import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Supported layout variants for the official OpenBar brand logo. */
export type BrandLogoVariant = 'full' | 'icon' | 'horizontal';

/** Canonical visual scale presets for the OpenBar brand logo. */
export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

let nextBrandLogoId = 0;

/**
 * Reusable OpenBar Brand Logo component rendering the official neon chalice SVG
 * across full vertical lockups, compact icon marks, and horizontal navigation headers.
 *
 * <p>Adapts stroke, wordmark gradients, and glow intensity automatically to the active
 * Dark/Light theme via Design System CSS variables (`--brand-logo-*`), and assigns
 * collision-free SVG gradient and filter IDs per component instance.</p>
 */
@Component({
  selector: 'app-brand-logo',
  standalone: true,
  templateUrl: './brand-logo.component.html',
  styleUrls: ['./brand-logo.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLogoComponent {
  /** Visual variant: 'full' (vertical icon + wordmark), 'icon' (mark only), or 'horizontal' (inline mark + wordmark). */
  @Input() variant: BrandLogoVariant = 'icon';

  /** Size preset controlling SVG height/dimensions and horizontal wordmark scale. */
  @Input() size: BrandLogoSize = 'md';

  /** Enables or disables the soft neon glow filter around the chalice strokes. */
  @Input() glow = true;

  /** Renders the logo using `currentColor` instead of the multi-stop brand gradient (ideal for colored toolbars). */
  @Input() monochrome = false;

  /** Brand wordmark text and accessible label when decorative is false. */
  @Input() label = 'OpenBar';

  /** Marks the logo as purely decorative (`aria-hidden="true"`) when adjacent visible text already names the brand. */
  @Input() decorative = false;

  /** Data test identifier bound to the root `data-testid` attribute. */
  @Input() testId = 'brand-logo';

  private readonly instanceUid = ++nextBrandLogoId;

  /** Unique `<linearGradient>` ID for chalice stroke gradient within this component instance. */
  readonly iconGradId = `openbar-icon-grad-${this.instanceUid}`;

  /** Unique `<linearGradient>` ID for SVG wordmark gradient within this component instance. */
  readonly textGradId = `openbar-text-grad-${this.instanceUid}`;

  /** Unique `<filter>` ID for the soft neon glow filter within this component instance. */
  readonly softGlowId = `openbar-soft-glow-${this.instanceUid}`;

  /** Resolved SVG stroke `url(#...)` reference for the chalice icon paths. */
  get iconStrokeUrl(): string {
    return `url(#${this.iconGradId})`;
  }

  /** Resolved SVG fill `url(#...)` reference for the vertical lockup wordmark. */
  get textFillUrl(): string {
    return `url(#${this.textGradId})`;
  }

  /** Resolved SVG filter `url(#...)` reference for the neon glow effect. */
  get glowFilterUrl(): string {
    return `url(#${this.softGlowId})`;
  }
}
