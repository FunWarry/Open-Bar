import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SearchBarComponent } from '../../../../../../src/app/core/components/ui/search-bar/search-bar.component';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the searchbar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render input with correct placeholder and testId', () => {
    component.placeholder = 'Search table...';
    component.testId = 'custom-search';
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.placeholder).toBe('Search table...');
    expect(input.getAttribute('data-testid')).toBe('custom-search');
  });

  it('should emit valueChange and searchChange on input change', () => {
    spyOn(component.valueChange, 'emit');
    spyOn(component.searchChange, 'emit');

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'Mojito';
    input.dispatchEvent(new Event('input'));

    expect(component.value).toBe('Mojito');
    expect(component.valueChange.emit).toHaveBeenCalledWith('Mojito');
    expect(component.searchChange.emit).toHaveBeenCalledWith('Mojito');
  });

  it('should support debounce when debounce > 0', fakeAsync(() => {
    component.debounce = 200;
    component.ngOnInit();
    spyOn(component.searchChange, 'emit');

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'M';
    input.dispatchEvent(new Event('input'));
    tick(100);
    expect(component.searchChange.emit).not.toHaveBeenCalled();

    input.value = 'Martini';
    input.dispatchEvent(new Event('input'));
    tick(200);
    expect(component.searchChange.emit).toHaveBeenCalledWith('Martini');
  }));

  it('should clear value and emit cleared event when clear button is clicked', () => {
    component.value = 'Cosmopolitan';
    fixture.detectChanges();

    spyOn(component.valueChange, 'emit');
    spyOn(component.searchChange, 'emit');
    spyOn(component.cleared, 'emit');

    const clearBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.clear-btn');
    expect(clearBtn).toBeTruthy();

    clearBtn.click();
    fixture.detectChanges();

    expect(component.value).toBe('');
    expect(component.valueChange.emit).toHaveBeenCalledWith('');
    expect(component.searchChange.emit).toHaveBeenCalledWith('');
    expect(component.cleared.emit).toHaveBeenCalled();
  });

  it('should support ControlValueAccessor writeValue', () => {
    component.writeValue('Old Fashioned');
    expect(component.value).toBe('Old Fashioned');

    component.writeValue('');
    expect(component.value).toBe('');
  });

  it('should respect disabled state', () => {
    component.value = 'Existing Query';
    component.setDisabledState(true);
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.disabled).toBeTrue();

    component.clear();
    // value should not change when disabled
    expect(component.value).toBe('Existing Query');
  });
});
