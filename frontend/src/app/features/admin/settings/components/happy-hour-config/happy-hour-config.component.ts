import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonSpinner,
  IonToggle,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  pricetagOutline,
  trashOutline,
  createOutline,
  addOutline,
  calendarOutline,
  flashOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  calculatorOutline,
  sparklesOutline,
  refreshOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HappyHourService } from '../../../../../core/services/happy-hour.service';
import { CocktailService } from '../../../../../core/services/cocktail.service';
import { AppSettingsService } from '../../../../../core/services/app-settings.service';
import {
  DayOfWeek,
  DiscountType,
  HappyHourRule,
  HappyHourRuleRequest,
  PricingPreviewResult,
} from '../../../../../core/models/happy-hour.model';
import { Cocktail } from '../../../../../core/models/cocktail.model';
import {
  SearchableSelectComponent,
  SearchableOption,
} from '../../../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Manager component managing Happy Hour promotional dynamic pricing rules,
 * rule scheduling, drink and category scoping, and live pricing simulation.
 */
@Component({
  selector: 'app-happy-hour-config',
  templateUrl: './happy-hour-config.component.html',
  styleUrls: ['./happy-hour-config.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SlicePipe,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonSpinner,
    IonToggle,
    TranslocoPipe,
    SearchableSelectComponent,
  ],
})
export class HappyHourConfigComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly happyHourService = inject(HappyHourService);
  private readonly cocktailService = inject(CocktailService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  readonly daysList: DayOfWeek[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  readonly discountTypes: { value: DiscountType; labelKey: string }[] = [
    { value: 'PERCENTAGE', labelKey: 'SETTINGS.HAPPY_HOUR_DISCOUNT_PERCENTAGE' },
    { value: 'FIXED_PRICE', labelKey: 'SETTINGS.HAPPY_HOUR_DISCOUNT_FIXED_PRICE' },
    { value: 'FIXED_DISCOUNT', labelKey: 'SETTINGS.HAPPY_HOUR_DISCOUNT_FIXED_DISCOUNT' },
  ];

  /** Reactive state signals */
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly rules = this.happyHourService.rules;
  readonly cocktails = signal<Cocktail[]>([]);
  readonly selectedDays = signal<DayOfWeek[]>([]);
  readonly isEditing = signal<boolean>(false);
  readonly editingRuleId = signal<number | null>(null);
  readonly showModal = signal<boolean>(false);

  /** Live simulator state */
  readonly simulationCocktailId = signal<number | null>(null);
  readonly simulationTime = signal<string>('');
  readonly simulationResult = signal<PricingPreviewResult | null>(null);
  readonly isSimulating = signal<boolean>(false);

  ruleForm!: FormGroup;

  /** Options for discount type dropdown conforming to OpenBar design system */
  readonly discountTypeOptions = computed<SearchableOption<DiscountType>[]>(() =>
    this.discountTypes.map((dt) => ({
      value: dt.value,
      label: this.translocoService.translate(dt.labelKey),
    }))
  );

  /** Multi-select options for cocktails */
  readonly cocktailOptions = computed<SearchableOption<number>[]>(() =>
    this.cocktails().map((c) => ({
      value: c.id,
      label: `${c.nom} (${this.appSettingsService.formatCurrency(c.prix)})`,
    }))
  );

  /** Multi-select options for categories */
  readonly categoryOptions = computed<SearchableOption<string>[]>(() => {
    const cats = new Set<string>();
    for (const c of this.cocktails()) {
      if (c.categorie) {
        cats.add(c.categorie);
      }
    }
    return Array.from(cats)
      .sort((a, b) => a.localeCompare(b))
      .map((cat) => ({
        value: cat,
        label: cat,
      }));
  });

  constructor() {
    addIcons({
      timeOutline,
      pricetagOutline,
      trashOutline,
      createOutline,
      addOutline,
      calendarOutline,
      flashOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      calculatorOutline,
      sparklesOutline,
      refreshOutline,
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.initSimulator();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.ruleForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      startTime: ['17:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]],
      endTime: ['19:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]],
      discountType: ['PERCENTAGE', [Validators.required]],
      discountValue: [20, [Validators.required, Validators.min(0.01)]],
      active: [true],
      categories: [[]],
      cocktailIds: [[]],
    });
  }

  private initSimulator(): void {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    this.simulationTime.set(`${hours}:${minutes}`);
  }

  loadData(): void {
    this.isLoading.set(true);
    this.happyHourService
      .getAllRules()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.isLoading.set(false),
        error: () => this.isLoading.set(false),
      });

    this.cocktailService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cocktails) => {
          this.cocktails.set(cocktails);
          if (cocktails.length > 0 && !this.simulationCocktailId()) {
            this.simulationCocktailId.set(cocktails[0].id);
            this.runSimulation();
          }
        },
      });
  }

  readonly selectedCategories = signal<string[]>([]);
  readonly selectedCocktailIds = signal<number[]>([]);

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingRuleId.set(null);
    this.selectedDays.set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
    this.selectedCategories.set([]);
    this.selectedCocktailIds.set([]);
    this.ruleForm.reset({
      name: '',
      startTime: '17:00',
      endTime: '19:00',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      active: true,
      categories: [],
      cocktailIds: [],
    });
    this.showModal.set(true);
  }

  openEditModal(rule: HappyHourRule): void {
    this.isEditing.set(true);
    this.editingRuleId.set(rule.id);
    this.selectedDays.set([...rule.daysOfWeek]);
    this.selectedCategories.set([...(rule.categories || [])]);
    this.selectedCocktailIds.set([...(rule.cocktailIds || [])]);
    this.ruleForm.patchValue({
      name: rule.name,
      startTime: rule.startTime.substring(0, 5),
      endTime: rule.endTime.substring(0, 5),
      discountType: rule.discountType,
      discountValue: rule.discountValue,
      active: rule.active,
      categories: rule.categories || [],
      cocktailIds: rule.cocktailIds || [],
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  toggleDay(day: DayOfWeek): void {
    const current = this.selectedDays();
    if (current.includes(day)) {
      this.selectedDays.set(current.filter((d) => d !== day));
    } else {
      this.selectedDays.set([...current, day]);
    }
  }

  isDaySelected(day: DayOfWeek): boolean {
    return this.selectedDays().includes(day);
  }

  onAddCategoryOption(option: SearchableOption<string> | null): void {
    if (!option?.value) return;
    const current = this.selectedCategories();
    if (!current.includes(option.value)) {
      this.selectedCategories.set([...current, option.value]);
    }
  }

  removeCategory(category: string): void {
    this.selectedCategories.set(this.selectedCategories().filter(c => c !== category));
  }

  onAddCocktailOption(option: SearchableOption<number> | null): void {
    if (option?.value == null) return;
    const current = this.selectedCocktailIds();
    if (!current.includes(option.value)) {
      this.selectedCocktailIds.set([...current, option.value]);
    }
  }

  removeCocktail(id: number): void {
    this.selectedCocktailIds.set(this.selectedCocktailIds().filter(cId => cId !== id));
  }

  getCocktailName(id: number): string {
    const found = this.cocktails().find(c => c.id === id);
    return found ? `${found.nom} (${this.formatCurrency(found.prix)})` : `Cocktail #${id}`;
  }

  saveRule(): void {
    if (this.ruleForm.invalid) {
      this.ruleForm.markAllAsTouched();
      return;
    }

    const formVal = this.ruleForm.value;
    const payload: HappyHourRuleRequest = {
      name: formVal.name.trim(),
      startTime: formVal.startTime,
      endTime: formVal.endTime,
      daysOfWeek: this.selectedDays(),
      discountType: formVal.discountType,
      discountValue: Number(formVal.discountValue),
      active: !!formVal.active,
      categories: this.selectedCategories(),
      cocktailIds: this.selectedCocktailIds(),
    };

    this.isSaving.set(true);
    const ruleId = this.editingRuleId();

    const op$ = this.isEditing() && ruleId != null
      ? this.happyHourService.updateRule(ruleId, payload)
      : this.happyHourService.createRule(payload);

    op$.pipe(takeUntil(this.destroy$)).subscribe({
      next: async () => {
        this.isSaving.set(false);
        this.closeModal();
        await this.showToast(this.translocoService.translate('SETTINGS.HAPPY_HOUR_SAVE_SUCCESS'), 'success');
        this.runSimulation();
      },
      error: async () => {
        this.isSaving.set(false);
        await this.showToast(this.translocoService.translate('COMMON.ERROR'), 'danger');
      },
    });
  }

  toggleRuleActive(rule: HappyHourRule, event: Event): void {
    event.stopPropagation();
    this.happyHourService
      .toggleRule(rule.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          await this.showToast(this.translocoService.translate('SETTINGS.HAPPY_HOUR_TOGGLE_SUCCESS'), 'success');
          this.runSimulation();
        },
        error: async () => {
          await this.showToast(this.translocoService.translate('COMMON.ERROR'), 'danger');
        },
      });
  }

  async confirmDelete(rule: HappyHourRule, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: this.translocoService.translate('COMMON.CONFIRM'),
      message: this.translocoService.translate('SETTINGS.HAPPY_HOUR_DELETE_CONFIRM'),
      buttons: [
        {
          text: this.translocoService.translate('COMMON.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translocoService.translate('COMMON.DELETE'),
          role: 'destructive',
          handler: () => {
            this.deleteRule(rule.id);
          },
        },
      ],
    });
    await alert.present();
  }

  private deleteRule(id: number): void {
    this.happyHourService
      .deleteRule(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          await this.showToast(this.translocoService.translate('SETTINGS.HAPPY_HOUR_DELETE_SUCCESS'), 'success');
          this.runSimulation();
        },
        error: async () => {
          await this.showToast(this.translocoService.translate('COMMON.ERROR'), 'danger');
        },
      });
  }

  isRuleActiveNow(rule: HappyHourRule): boolean {
    return this.happyHourService.isRuleApplicableNow(rule);
  }

  formatCurrency(amount: number | null | undefined): string {
    return this.appSettingsService.formatCurrency(amount);
  }

  formatDiscountDisplay(type: DiscountType, value: number): string {
    switch (type) {
      case 'PERCENTAGE':
        return `-${value}%`;
      case 'FIXED_PRICE':
        return `${this.formatCurrency(value)}`;
      case 'FIXED_DISCOUNT':
        return `-${this.formatCurrency(value)}`;
    }
  }

  onSimulationCocktailSelect(opt: SearchableOption<number> | null): void {
    if (opt && opt.value !== null && opt.value !== undefined) {
      this.simulationCocktailId.set(Number(opt.value));
      this.runSimulation();
    }
  }

  onSimulationCocktailChange(cocktailId: number | string): void {
    this.simulationCocktailId.set(Number(cocktailId));
    this.runSimulation();
  }

  onSimulationTimeChange(time: string): void {
    this.simulationTime.set(time);
    this.runSimulation();
  }

  runSimulation(): void {
    const cocktailId = this.simulationCocktailId();
    if (!cocktailId) return;

    const cocktail = this.cocktails().find((c) => c.id === cocktailId);
    if (!cocktail) return;

    // Build target date with the simulated time
    const [hours, minutes] = (this.simulationTime() || '18:00').split(':').map(Number);
    const targetDate = new Date();
    targetDate.setHours(hours || 0, minutes || 0, 0, 0);

    this.isSimulating.set(true);
    // Use client-side resolution for instant preview, verified with service calculation
    const resolved = this.happyHourService.resolvePrice(
      cocktail.prix,
      cocktail.id,
      cocktail.categorie,
      targetDate
    );

    this.simulationResult.set({
      cocktailId: cocktail.id,
      cocktailNom: cocktail.nom,
      basePrice: cocktail.prix,
      effectivePrice: resolved.effectivePrice,
      discountAmount: resolved.savings,
      discountPercentage: resolved.savings > 0 ? Math.round((resolved.savings / cocktail.prix) * 100) : 0,
      isHappyHour: resolved.isHappyHour,
      appliedRuleId: resolved.appliedRule?.id ?? null,
      appliedRuleName: resolved.appliedRule?.name ?? null,
      discountType: resolved.appliedRule?.discountType ?? null,
      discountValue: resolved.appliedRule?.discountValue ?? null,
      evaluatedAt: targetDate.toISOString(),
    });
    this.isSimulating.set(false);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
