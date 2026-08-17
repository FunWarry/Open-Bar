import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  HostListener,
  HostBinding,
  ViewChild,
  forwardRef,
  computed,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronDownOutline,
  searchOutline,
  closeCircleOutline,
  checkmarkOutline,
  addOutline,
} from 'ionicons/icons';
import { BaseControlValueAccessor } from '../base-control-value-accessor';
import { environment } from '../../../../../environments/environment';

export interface SearchableOption<T = any> {
  value: T;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeType?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  icon?: string;
  imageUrl?: string;
  disabled?: boolean;
}

/**
 * Searchable Select (Combobox) component conforming to OpenBar Design System.
 * Provides a sleek glassmorphic dropdown with real-time search filtering,
 * icon & badge support, and ControlValueAccessor integration.
 */
@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './searchable-select.component.html',
  styleUrls: ['./searchable-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent extends BaseControlValueAccessor<any> implements OnChanges {
  private static nextId = 0;
  readonly selectId: string;

  @HostBinding('class.dropdown-is-open')
  get hostIsOpen(): boolean {
    return this.isOpen();
  }

  @HostBinding('style.z-index')
  get hostZIndex(): string {
    return this.isOpen() ? '1050' : '1';
  }

  @HostBinding('style.position')
  readonly hostPosition = 'relative';

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;
  @ViewChild('triggerButton') triggerButtonElement?: ElementRef<HTMLButtonElement>;

  readonly selectedValue = signal<any>(null);

  /** Value binding for standalone or form binding. */
  @Input() override value: any = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.selectedValue.set(this.value);
    }
  }

  override writeValue(val: any): void {
    this.value = val;
    this.selectedValue.set(val);
  }

  /** Label text for the select field. */
  @Input() label?: string;

  /** Placeholder when no option is selected. */
  @Input() placeholder = 'Sélectionner...';

  /** Placeholder inside the dropdown search bar. */
  @Input() searchPlaceholder = 'Rechercher...';

  /** Whether the field is required. */
  @Input() required = false;

  /** Whether the field is clearable with an (X) button. */
  @Input() clearable = true;

  /** Custom data-testid for testing. */
  @Input() testId = 'searchable-select';

  /** Message displayed when no results match the search query. */
  @Input() emptyMessage = 'Aucun élément trouvé';

  /** Optional action button text at bottom of dropdown (e.g. "+ Nouveau modèle"). */
  @Input() actionButtonLabel?: string;

  /** Optional action button icon. */
  @Input() actionButtonIcon?: string;

  /** Options list. */
  @Input() set options(items: SearchableOption[]) {
    this._options.set(items || []);
  }

  /** Event emitted when bottom action button is clicked. */
  @Output() readonly actionButtonClick = new EventEmitter<void>();

  /** Alias for actionButtonClick. */
  @Output() readonly actionClick = new EventEmitter<void>();

  /** Event emitted when selected option changes. */
  @Output() readonly selectionChange = new EventEmitter<SearchableOption | null>();

  protected readonly _options = signal<SearchableOption[]>([]);
  readonly isOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly highlightedIndex = signal<number>(-1);

  readonly filteredOptions = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this._options();
    if (!query) return list;

    return list.filter((opt) => {
      const matchLabel = opt.label?.toLowerCase().includes(query);
      const matchSub = opt.subLabel?.toLowerCase().includes(query);
      const matchBadge = opt.badge?.toLowerCase().includes(query);
      return matchLabel || matchSub || matchBadge;
    });
  });

  readonly selectedOption = computed(() => {
    const val = this.selectedValue();
    if (val === null || val === undefined || val === '') return null;
    return this._options().find((opt) => opt.value === val) || null;
  });

  constructor(private readonly elementRef: ElementRef) {
    super();
    SearchableSelectComponent.nextId += 1;
    this.selectId = `app-searchable-select-${SearchableSelectComponent.nextId}`;
    addIcons({
      chevronDownOutline,
      searchOutline,
      closeCircleOutline,
      checkmarkOutline,
      addOutline,
    });
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    if (this.isOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown(): void {
    if (this.disabled) return;
    this.searchQuery.set('');
    this.highlightedIndex.set(-1);
    this.isOpen.set(true);

    setTimeout(() => {
      this.searchInputElement?.nativeElement?.focus();
    }, 50);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.searchQuery.set('');
    this.highlightedIndex.set(-1);
    this.onTouched();
  }

  selectOption(opt: SearchableOption, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (opt.disabled) return;

    this.value = opt.value;
    this.selectedValue.set(opt.value);
    this.onChange(this.value);
    this.selectionChange.emit(opt);
    this.closeDropdown();
    this.triggerButtonElement?.nativeElement?.focus();
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    if (this.disabled) return;

    this.value = null;
    this.selectedValue.set(null);
    this.onChange(this.value);
    this.selectionChange.emit(null);
    this.closeDropdown();
  }

  onActionClick(event: Event): void {
    event.stopPropagation();
    this.closeDropdown();
    this.actionButtonClick.emit();
    this.actionClick.emit();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.highlightedIndex.set(0);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.openDropdown();
      }
      return;
    }

    const filtered = this.filteredOptions();
    if (filtered.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex.update((idx) => (idx < filtered.length - 1 ? idx + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex.update((idx) => (idx > 0 ? idx - 1 : filtered.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const currentIdx = this.highlightedIndex();
      if (currentIdx >= 0 && currentIdx < filtered.length) {
        this.selectOption(filtered[currentIdx]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
      this.triggerButtonElement?.nativeElement?.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      if (this.isOpen()) {
        this.closeDropdown();
      }
    }
  }

  /**
   * Resolves relative image paths to the backend host when starting with /uploads/.
   *
   * @param url Image URL or relative path
   * @returns Fully qualified or untouched URL
   */
  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${baseUrl}${url}`;
    }
    return url;
  }
}
