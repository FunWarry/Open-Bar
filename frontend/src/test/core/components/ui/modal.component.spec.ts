import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ModalComponent, ModalSize } from '../../../../app/core/components/ui/modal/modal.component';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [ModalComponent, getTranslocoTestingModule()],
      providers: [{ provide: ModalController, useValue: modalCtrlSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
  });

  it('should create with default values', () => {
    expect(component).toBeTruthy();
    expect(component.size).toBe('md');
    expect(component.showCloseButton).toBeTrue();
    expect(component.title).toBe('');
  });

  it('should render title, subtitle, and badge correctly', () => {
    component.title = 'Test Title';
    component.subtitle = 'Test Subtitle';
    component.badgeText = '(Test Badge)';
    component.icon = 'sparkles-outline';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const titleEl = el.querySelector('[data-testid="app-modal-title"]');
    const subtitleEl = el.querySelector('[data-testid="app-modal-subtitle"]');
    const badgeEl = el.querySelector('[data-testid="app-modal-badge"]');
    const iconEl = el.querySelector('.modal-icon-badge ion-icon');

    expect(titleEl?.textContent?.trim()).toBe('Test Title');
    expect(subtitleEl?.textContent?.trim()).toBe('Test Subtitle');
    expect(badgeEl?.textContent?.trim()).toBe('(Test Badge)');
    expect(iconEl).toBeTruthy();
  });

  it('should emit dismiss event and call modalCtrl.dismiss on onDismiss', () => {
    const dismissSpy = spyOn(component.dismiss, 'emit');
    component.onDismiss();

    expect(dismissSpy).toHaveBeenCalled();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should not render close button when showCloseButton is false', () => {
    component.showCloseButton = false;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const closeBtn = el.querySelector('[data-testid="app-modal-close-btn"]');
    expect(closeBtn).toBeNull();
  });

  it('should synchronize size classes onto parent ion-modal element', () => {
    const fakeIonModal = document.createElement('ion-modal');
    fakeIonModal.appendChild(fixture.nativeElement);

    component.size = 'xl';
    component.ngOnInit();

    expect(fakeIonModal.classList.contains('modal-xl')).toBeTrue();
    expect(fakeIonModal.classList.contains('app-modal-host')).toBeTrue();

    // Test dynamic size change
    component.size = 'sm';
    component.ngOnChanges({
      size: new SimpleChange('xl', 'sm', false),
    });

    expect(fakeIonModal.classList.contains('modal-sm')).toBeTrue();
    expect(fakeIonModal.classList.contains('modal-xl')).toBeFalse();

    fakeIonModal.remove();
  });
});
