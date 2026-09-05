import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { restaurantOutline } from 'ionicons/icons';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';
import { ConfirmModalComponent } from '../../../../app/core/components/ui/confirm-modal/confirm-modal.component';

describe('ConfirmModalComponent', () => {
  let component: ConfirmModalComponent;
  let fixture: ComponentFixture<ConfirmModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    addIcons({ restaurantOutline });
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [
        ConfirmModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmModalComponent);
    component = fixture.componentInstance;
    component.title = 'Modifications non enregistrées';
    component.message = 'Vous avez des modifications en cours qui n\'ont pas été enregistrées.';
    component.tone = 'warning';
    fixture.detectChanges();
  });

  it('should create the confirm modal component', () => {
    expect(component).toBeTruthy();
  });

  it('should dismiss with confirmed = true when onConfirm is called', async () => {
    await component.onConfirm();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ confirmed: true });
  });

  it('should dismiss with confirmed = false when onCancel is called', async () => {
    await component.onCancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ confirmed: false });
  });

  it('should display provided title and message', () => {
    component.title = 'Custom Title';
    component.message = 'Custom message content';
    component.tone = 'danger';
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('[data-testid="confirm-modal-title"]');
    const msgEl = fixture.nativeElement.querySelector('[data-testid="confirm-modal-message"]');

    expect(titleEl.textContent.trim()).toBe('Custom Title');
    expect(msgEl.textContent.trim()).toBe('Custom message content');
  });

  it('should return correct badgeIconName based on icon and tone', () => {
    component.icon = 'help-circle-outline';
    expect(component.badgeIconName).toBe('help-circle-outline');

    component.icon = 'warning-outline';
    component.tone = 'info';
    expect(component.badgeIconName).toBe('information-circle-outline');

    component.tone = 'warning';
    expect(component.badgeIconName).toBe('alert-circle-outline');
  });

  it('should return correct actionIconName based on tone and button text', () => {
    component.tone = 'danger';
    component.confirmBtnText = 'Supprimer';
    expect(component.actionIconName).toBe('trash-outline');

    component.confirmBtnText = 'Delete table';
    expect(component.actionIconName).toBe('trash-outline');

    component.confirmBtnText = 'Leave without saving';
    expect(component.actionIconName).toBe('log-out-outline');

    component.tone = 'info';
    expect(component.actionIconName).toBe('information-circle-outline');

    component.tone = 'warning';
    expect(component.actionIconName).toBe('log-out-outline');
  });

  it('should render metaTags when provided', () => {
    component.metaTags = [
      { text: 'Table 4', icon: 'restaurant-outline' },
      { text: 'Terrasse' }
    ];
    fixture.detectChanges();

    const tags = fixture.nativeElement.querySelectorAll('.meta-tag');
    expect(tags).toHaveSize(2);
    expect(tags[0].textContent).toContain('Table 4');
    expect(tags[1].textContent).toContain('Terrasse');
  });
});
