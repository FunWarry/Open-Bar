import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  SearchableSelectComponent,
  SearchableOption,
} from '../../../../app/core/components/ui/searchable-select/searchable-select.component';

describe('SearchableSelectComponent', () => {
  let component: SearchableSelectComponent;
  let fixture: ComponentFixture<SearchableSelectComponent>;

  const mockOptions: SearchableOption[] = [
    { value: 1, label: 'Rhum Blanc', badge: 'cl', subLabel: 'Stock: 50 cl' },
    { value: 2, label: 'Sirop de Canne', badge: 'cl', subLabel: 'Stock: 30 cl' },
    { value: 3, label: 'Menthe Fraîche', badge: 'feuilles', subLabel: 'Stock: 100 feuilles' },
    { value: 4, label: 'Citron Vert', badge: 'pièce', disabled: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableSelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchableSelectComponent);
    component = fixture.componentInstance;
    component.options = mockOptions;
    fixture.detectChanges();
  });

  it('should create with default values', () => {
    expect(component).toBeTruthy();
    expect(component.isOpen()).toBeFalse();
    expect(component.placeholder).toBe('Sélectionner...');
    expect(component.searchPlaceholder).toBe('Rechercher...');
  });

  it('should toggle dropdown open and closed', () => {
    component.toggleDropdown();
    expect(component.isOpen()).toBeTrue();

    component.toggleDropdown();
    expect(component.isOpen()).toBeFalse();
  });

  it('should not open dropdown when disabled', () => {
    component.disabled = true;
    component.openDropdown();
    expect(component.isOpen()).toBeFalse();
  });

  it('should filter options based on search query', () => {
    component.openDropdown();
    component.searchQuery.set('rhum');
    expect(component.filteredOptions()).toHaveSize(1);
    expect(component.filteredOptions()[0].label).toBe('Rhum Blanc');

    component.searchQuery.set('feuilles');
    expect(component.filteredOptions()).toHaveSize(1);
    expect(component.filteredOptions()[0].label).toBe('Menthe Fraîche');
  });

  it('should select an option and emit selectionChange', () => {
    spyOn(component.selectionChange, 'emit');
    const changeSpy = jasmine.createSpy('onChange');
    component.registerOnChange(changeSpy);

    component.selectOption(mockOptions[0]);

    expect(component.value).toBe(1);
    expect(changeSpy).toHaveBeenCalledWith(1);
    expect(component.selectionChange.emit).toHaveBeenCalledWith(mockOptions[0]);
    expect(component.isOpen()).toBeFalse();
  });

  it('should not select disabled options', () => {
    spyOn(component.selectionChange, 'emit');
    component.selectOption(mockOptions[3]); // Citron Vert (disabled: true)

    expect(component.value).toBeNull();
    expect(component.selectionChange.emit).not.toHaveBeenCalled();
  });

  it('should clear selection when clearSelection is called', () => {
    component.value = 1;
    spyOn(component.selectionChange, 'emit');
    const changeSpy = jasmine.createSpy('onChange');
    component.registerOnChange(changeSpy);

    const mockEvent = new MouseEvent('click');
    component.clearSelection(mockEvent);

    expect(component.value).toBeNull();
    expect(changeSpy).toHaveBeenCalledWith(null);
    expect(component.selectionChange.emit).toHaveBeenCalledWith(null);
  });

  it('should emit actionButtonClick and actionClick when action button is clicked', () => {
    spyOn(component.actionButtonClick, 'emit');
    spyOn(component.actionClick, 'emit');
    const mockEvent = new MouseEvent('click');

    component.onActionClick(mockEvent);

    expect(component.actionButtonClick.emit).toHaveBeenCalled();
    expect(component.actionClick.emit).toHaveBeenCalled();
    expect(component.isOpen()).toBeFalse();
  });

  it('should handle keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)', () => {
    component.openDropdown();

    // ArrowDown
    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onKeyDown(downEvent);
    expect(component.highlightedIndex()).toBe(0);

    // ArrowUp (wraps around)
    const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    component.onKeyDown(upEvent);
    expect(component.highlightedIndex()).toBe(mockOptions.length - 1);

    // Escape closes dropdown
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    component.onKeyDown(escEvent);
    expect(component.isOpen()).toBeFalse();
  });

  it('should support ControlValueAccessor writeValue', () => {
    component.writeValue(2);
    expect(component.value).toBe(2);
    expect(component.selectedOption()?.label).toBe('Sirop de Canne');
  });

  it('should render image when option has imageUrl', () => {
    component.options = [
      {
        value: 10,
        label: 'Verre Margarita',
        subLabel: 'Coupette évasée idéale pour Margarita avec bord givré',
        imageUrl: 'assets/images/verres/verre_margarita.png',
        badge: '25 cl',
      },
    ];
    component.writeValue(10);
    fixture.detectChanges();

    const imgElement = fixture.nativeElement.querySelector('.item-img');
    expect(imgElement).toBeTruthy();
    expect(imgElement.getAttribute('src')).toBe('assets/images/verres/verre_margarita.png');
  });

  it('should resolve /uploads/ relative images to backend host', () => {
    const resolved = component.resolveImageUrl('/uploads/glassware/glassware_10.png');
    expect(resolved).toContain('/uploads/glassware/glassware_10.png');
    expect(resolved.startsWith('http')).toBeTrue();
  });
});
