import { Component, Input, Output, EventEmitter, forwardRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, search, closeCircle, closeCircleOutline } from 'ionicons/icons';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BaseControlValueAccessor } from '../base-control-value-accessor';

/**
 * Reusable SearchBar component conforming to OpenBar Design System.
 * Styled after the Cocktails page searchbar design (rounded corners, subtle border,
 * background-surface-2, focus ring, search icon and clear button).
 *
 * Provides a responsive search input with magnifying glass icon, focus halo,
 * clear button, debounce capability, and ControlValueAccessor support.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchBarComponent),
      multi: true
    }
  ]
})
export class SearchBarComponent extends BaseControlValueAccessor<string> implements OnInit, OnDestroy {
  private static nextId = 0;

  /** Unique ID for input accessibility. */
  readonly inputId: string;

  /** Placeholder text. */
  @Input() placeholder = '';

  /** Visual shape of the searchbar: 'rounded' (default, 10px like Cocktails page) or 'pill' (999px). */
  @Input() shape: 'rounded' | 'pill' = 'rounded';

  /** Debounce delay in milliseconds before emitting searchChange (0 for instant). */
  @Input() debounce = 0;

  /** Custom data-testid attribute for E2E testing. */
  @Input() testId = 'search-bar';

  /** Custom aria-label for accessibility. */
  @Input() ariaLabel?: string;

  /** Whether the clear button is shown when search has text. */
  @Input() clearable = true;

  /** Emitted whenever the input value changes (two-way binding support). */
  @Output() valueChange = new EventEmitter<string>();

  /** Emitted when search term changes (debounced if debounce > 0). */
  @Output() searchChange = new EventEmitter<string>();

  /** Emitted when clear button is clicked. */
  @Output() cleared = new EventEmitter<void>();

  override value: string = '';

  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor() {
    super();
    SearchBarComponent.nextId += 1;
    this.inputId = `app-search-bar-${SearchBarComponent.nextId}`;
    addIcons({ searchOutline, search, closeCircleOutline, closeCircle });
  }

  ngOnInit(): void {
    if (this.debounce > 0) {
      this.searchSubscription = this.searchSubject
        .pipe(debounceTime(this.debounce), distinctUntilChanged())
        .subscribe(val => this.searchChange.emit(val));
    }
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  override writeValue(val: string): void {
    this.value = val || '';
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newVal = input.value;
    this.value = newVal;
    this.onChange(newVal);
    this.valueChange.emit(newVal);

    if (this.debounce > 0) {
      this.searchSubject.next(newVal);
    } else {
      this.searchChange.emit(newVal);
    }
  }

  clear(): void {
    if (this.disabled) return;
    this.value = '';
    this.onChange('');
    this.valueChange.emit('');
    this.searchChange.emit('');
    this.cleared.emit();
  }
}
