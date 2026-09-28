import {
  Component,
  Input,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
  inject,
  signal,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonChip,
  IonBadge,
  IonSpinner,
  ModalController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  sparklesOutline,
  checkmarkCircleOutline,
  wineOutline,
  filterOutline,
  alertCircleOutline,
  addOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';
import { RouletteWheelComponent } from '../../../../core/components/ui/roulette-wheel/roulette-wheel.component';
import { RouletteService } from '../../../../core/services/roulette.service';
import {
  RoulettePublicConfig,
  RouletteSpinResult,
  RouletteWheelSector
} from '../../../../core/models/roulette.model';

/**
 * Interactive modal dialog allowing patrons and servers to spin the Cocktail Roulette Wheel.
 * Features spirit category filters, allergen exclusion safeguards, celebratory win reveals,
 * and automatic addition to the table cart.
 */
@Component({
  selector: 'app-roulette-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonChip,
    IonBadge,
    IonSpinner,
    TranslocoModule,
    AppCurrencyPipe,
    RouletteWheelComponent
  ],
  templateUrl: './roulette-modal.component.html',
  styleUrl: './roulette-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouletteModalComponent implements OnInit {
  @ViewChild('wheel') wheelComponent?: RouletteWheelComponent;

  /** Target table ID for auto-adding won drinks. */
  @Input() tableId?: number | null;

  /** Patron session identifier. */
  @Input() guestSessionId?: string | null;

  /** Patron nickname. */
  @Input() guestName?: string | null;

  private readonly rouletteService = inject(RouletteService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly translocoService = inject(TranslocoService);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  isSpinning = false;
  config: RoulettePublicConfig | null = null;
  sectors: RouletteWheelSector[] = [];
  selectedCategory = 'ALL';
  selectedAllergens: string[] = [];

  winningResult = signal<RouletteSpinResult | null>(null);

  readonly availableCategories = ['ALL', 'GIN', 'RUM', 'VODKA', 'WHISKY', 'TEQUILA', 'MOCKTAIL'];

  constructor() {
    addIcons({
      closeOutline,
      sparklesOutline,
      checkmarkCircleOutline,
      wineOutline,
      filterOutline,
      alertCircleOutline,
      addOutline
    });
  }

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.rouletteService.getPublicConfig().subscribe({
      next: (cfg) => {
        this.config = cfg;
        this.sectors = cfg.sectors || [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.markForCheck();
        this.showToast(this.translocoService.translate('ROULETTE.LOAD_ERROR'), 'danger');
      }
    });
  }

  selectCategory(category: string): void {
    if (this.isSpinning) return;
    this.selectedCategory = category;
    this.winningResult.set(null);
    this.cdr.markForCheck();
  }

  startSpin(): void {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.winningResult.set(null);
    this.cdr.markForCheck();

    const isMocktail = this.selectedCategory === 'MOCKTAIL';

    this.rouletteService.spin({
      tableId: this.tableId,
      guestSessionId: this.guestSessionId,
      guestName: this.guestName,
      spiritCategory: this.selectedCategory !== 'ALL' ? this.selectedCategory : undefined,
      nonAlcoholicOnly: isMocktail,
      autoAddToCart: false
    }).subscribe({
      next: (result) => {
        if (this.wheelComponent) {
          this.wheelComponent.spinTo(result.winningIndex, 5000);
        }
        // Save result so it displays upon spin completion
        this.pendingResult = result;
      },
      error: (err) => {
        this.isSpinning = false;
        this.cdr.markForCheck();
        const msg = err?.error?.message || this.translocoService.translate('ROULETTE.SPIN_ERROR');
        this.showToast(msg, 'danger');
      }
    });
  }

  private pendingResult: RouletteSpinResult | null = null;

  onSpinComplete(event: { sector: RouletteWheelSector; index: number }): void {
    this.isSpinning = false;
    if (this.pendingResult) {
      this.winningResult.set(this.pendingResult);
    }
    this.cdr.markForCheck();
  }

  confirmAndAddToCart(): void {
    const result = this.winningResult();
    if (!result) {
      this.dismiss();
      return;
    }

    this.modalCtrl.dismiss({
      action: 'ADD_TO_CART',
      result
    });
  }

  dismiss(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
