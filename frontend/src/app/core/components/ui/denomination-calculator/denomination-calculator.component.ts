import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  removeOutline,
  cashOutline,
  calculatorOutline,
  refreshOutline,
  walletOutline
} from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../pipes/app-currency.pipe';
import { AppSettingsService } from '../../../services/app-settings.service';
import {
  CashDenomination,
  DEFAULT_EUR_DENOMINATIONS,
  getDefaultDenominationsForCurrency
} from '../../../models/cash-denomination.model';
import { ActionButtonComponent } from '../action-button/action-button.component';

/**
 * Reusable interactive cash denomination calculator component for cash drawers,
 * safe deposits, tills, and cash-up counting sessions.
 *
 * Provides physical count steppers, direct numeric entry, grouped banknote/coin sections,
 * live subtotal calculations, and responsive layout across mobile, tablet, and desktop viewports.
 */
@Component({
  selector: 'app-denomination-calculator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    TranslocoModule,
    AppCurrencyPipe,
    ActionButtonComponent
  ],
  templateUrl: './denomination-calculator.component.html',
  styleUrls: ['./denomination-calculator.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DenominationCalculatorComponent implements OnInit, OnChanges {
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Map of denomination keys to quantities counted. */
  @Input() counting: Record<string, number> = {};

  /** Custom list of denominations to count. If omitted, uses establishment settings or defaults. */
  @Input() denominations?: CashDenomination[];

  /** When true, inputs and controls are disabled in read-only audit mode. */
  @Input() readOnly = false;

  /** When true, renders a tighter, compact layout suitable for dialog sidebars or small modals. */
  @Input() compact = false;

  /** Whether to render the subtotal & grand total summary banner. */
  @Input() showSummary = true;

  /** Whether to show a quick reset button to clear counts. */
  @Input() showResetButton = true;

  /** Custom test ID attribute prefix for E2E testing. */
  @Input() testId = 'denomination-calculator';

  /** Emits the updated counting record whenever counts change. */
  @Output() readonly countingChange = new EventEmitter<Record<string, number>>();

  /** Emits the computed grand total amount whenever counts change. */
  @Output() readonly totalChange = new EventEmitter<number>();

  activeDenominations: CashDenomination[] = DEFAULT_EUR_DENOMINATIONS;

  constructor() {
    addIcons({
      addOutline,
      removeOutline,
      cashOutline,
      calculatorOutline,
      refreshOutline,
      walletOutline,
      'add-outline': addOutline,
      'remove-outline': removeOutline,
      'cash-outline': cashOutline,
      'calculator-outline': calculatorOutline,
      'refresh-outline': refreshOutline,
      'wallet-outline': walletOutline
    });
  }

  ngOnInit(): void {
    this.resolveDenominations();
    this.ensureCountingKeys();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['denominations']) {
      this.resolveDenominations();
      this.ensureCountingKeys();
    }
    if (changes['counting']) {
      this.ensureCountingKeys();
    }
  }

  /**
   * Banknote denominations sorted descending by value.
   */
  get bills(): CashDenomination[] {
    return this.activeDenominations.filter(d => d.type === 'bill');
  }

  /**
   * Coin denominations sorted descending by value.
   */
  get coins(): CashDenomination[] {
    return this.activeDenominations.filter(d => d.type === 'coin');
  }

  /**
   * Subtotal value for counted banknotes.
   */
  get billsTotal(): number {
    return this.calculateSubtotal(this.bills);
  }

  /**
   * Subtotal value for counted coins.
   */
  get coinsTotal(): number {
    return this.calculateSubtotal(this.coins);
  }

  /**
   * Grand total calculated from all denominations.
   */
  get grandTotal(): number {
    return Math.round((this.billsTotal + this.coinsTotal) * 100) / 100;
  }

  /**
   * Adjusts count by delta (+1 / -1) with floor at 0.
   *
   * @param key Denomination key
   * @param delta Integer change
   */
  adjustCount(key: string, delta: number): void {
    if (this.readOnly) return;
    const current = this.counting[key] || 0;
    const updated = Math.max(0, current + delta);
    this.counting = { ...this.counting, [key]: updated };
    this.emitChanges();
  }

  /**
   * Handles keyboard input change on a denomination count.
   *
   * @param key Denomination key
   * @param rawVal Value from input event
   */
  onCountInput(key: string, rawVal: unknown): void {
    if (this.readOnly) return;
    const parsed = Math.max(0, Number.parseInt(String(rawVal), 10) || 0);
    this.counting = { ...this.counting, [key]: parsed };
    this.emitChanges();
  }

  /**
   * Resets all denomination counts to zero.
   */
  resetCounts(): void {
    if (this.readOnly) return;
    const cleared: Record<string, number> = {};
    for (const d of this.activeDenominations) {
      cleared[d.key] = 0;
    }
    this.counting = cleared;
    this.emitChanges();
  }

  /**
   * Returns line total amount for a specific denomination.
   *
   * @param item Denomination item
   */
  getLineTotal(item: CashDenomination): number {
    const qty = this.counting[item.key] || 0;
    return Math.round(qty * item.value * 100) / 100;
  }

  private calculateSubtotal(items: CashDenomination[]): number {
    let subtotal = 0;
    for (const item of items) {
      const qty = this.counting[item.key] || 0;
      subtotal += qty * item.value;
    }
    return Math.round(subtotal * 100) / 100;
  }

  private resolveDenominations(): void {
    if (this.denominations && this.denominations.length > 0) {
      this.activeDenominations = this.denominations;
      return;
    }

    const configured = this.appSettingsService.getCashDenominations?.();
    if (configured && configured.length > 0) {
      this.activeDenominations = configured;
      return;
    }

    const currencyCode = this.appSettingsService.currencyCode || 'EUR';
    const currencySymbol = this.appSettingsService.currencySymbol || '€';
    const position = this.appSettingsService.currencyPosition || 'AFTER';
    this.activeDenominations = getDefaultDenominationsForCurrency(currencyCode, currencySymbol, position);
  }

  private ensureCountingKeys(): void {
    if (!this.counting) {
      this.counting = {};
    }
    let updated = false;
    const nextCounting = { ...this.counting };
    for (const d of this.activeDenominations) {
      if (nextCounting[d.key] === undefined) {
        nextCounting[d.key] = 0;
        updated = true;
      }
    }
    if (updated) {
      this.counting = nextCounting;
    }
    this.cdr.markForCheck();
  }

  private emitChanges(): void {
    this.countingChange.emit(this.counting);
    this.totalChange.emit(this.grandTotal);
    this.cdr.markForCheck();
  }
}
