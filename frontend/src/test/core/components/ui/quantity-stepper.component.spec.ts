import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuantityStepperComponent } from '../../../../app/core/components/ui/quantity-stepper/quantity-stepper.component';

describe('QuantityStepperComponent', () => {
  let component: QuantityStepperComponent;
  let fixture: ComponentFixture<QuantityStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuantityStepperComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(QuantityStepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with default values', () => {
    expect(component).toBeTruthy();
    expect(component.value).toBe(1);
    expect(component.min).toBe(1);
    expect(component.max).toBe(99);
    expect(component.step).toBe(1);
    expect(component.disabled).toBeFalse();
  });

  it('should increment value within max bound and emit valueChange', () => {
    spyOn(component.valueChange, 'emit');
    component.value = 5;
    component.max = 10;
    component.step = 1;

    component.increment();

    expect(component.value).toBe(6);
    expect(component.valueChange.emit).toHaveBeenCalledWith(6);
  });

  it('should not increment beyond max bound', () => {
    spyOn(component.valueChange, 'emit');
    component.value = 10;
    component.max = 10;

    component.increment();

    expect(component.value).toBe(10);
    expect(component.valueChange.emit).not.toHaveBeenCalled();
  });

  it('should decrement value within min bound and emit valueChange', () => {
    spyOn(component.valueChange, 'emit');
    component.value = 5;
    component.min = 1;
    component.step = 1;

    component.decrement();

    expect(component.value).toBe(4);
    expect(component.valueChange.emit).toHaveBeenCalledWith(4);
  });

  it('should not decrement below min bound', () => {
    spyOn(component.valueChange, 'emit');
    component.value = 1;
    component.min = 1;

    component.decrement();

    expect(component.value).toBe(1);
    expect(component.valueChange.emit).not.toHaveBeenCalled();
  });

  it('should not increment or decrement when disabled', () => {
    spyOn(component.valueChange, 'emit');
    component.disabled = true;
    component.value = 5;

    component.increment();
    expect(component.value).toBe(5);

    component.decrement();
    expect(component.value).toBe(5);

    expect(component.valueChange.emit).not.toHaveBeenCalled();
  });

  it('should update and emit on direct input typing', () => {
    spyOn(component.valueChange, 'emit');
    const inputElement = fixture.nativeElement.querySelector('input.stepper-input') as HTMLInputElement;

    inputElement.value = '25';
    inputElement.dispatchEvent(new Event('input'));

    expect(component.value).toBe(25);
    expect(component.valueChange.emit).toHaveBeenCalledWith(25);
  });

  it('should clamp value to min on blur if input is below minimum', () => {
    spyOn(component.valueChange, 'emit');
    component.min = 2;
    const inputElement = fixture.nativeElement.querySelector('input.stepper-input') as HTMLInputElement;

    inputElement.value = '0';
    inputElement.dispatchEvent(new Event('blur'));

    expect(component.value).toBe(2);
    expect(inputElement.value).toBe('2');
    expect(component.valueChange.emit).toHaveBeenCalledWith(2);
  });

  it('should clamp value to max on blur if input exceeds maximum', () => {
    spyOn(component.valueChange, 'emit');
    component.max = 50;
    const inputElement = fixture.nativeElement.querySelector('input.stepper-input') as HTMLInputElement;

    inputElement.value = '100';
    inputElement.dispatchEvent(new Event('blur'));

    expect(component.value).toBe(50);
    expect(inputElement.value).toBe('50');
    expect(component.valueChange.emit).toHaveBeenCalledWith(50);
  });

  it('should select text on focus for quick typing', () => {
    const inputElement = fixture.nativeElement.querySelector('input.stepper-input') as HTMLInputElement;
    spyOn(inputElement, 'select');

    inputElement.dispatchEvent(new Event('focus'));

    expect(inputElement.select).toHaveBeenCalled();
  });
});
