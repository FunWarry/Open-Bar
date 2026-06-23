import { TestBed } from '@angular/core/testing';
import { DeleteUserDialogComponent } from '../../../app/features/admin/users/delete-user-dialog/delete-user-dialog.component';
import { ModalController } from '@ionic/angular/standalone';

describe('DeleteUserDialogComponent', () => {
  let component: DeleteUserDialogComponent;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj<ModalController>('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [DeleteUserDialogComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(DeleteUserDialogComponent);
    component = fixture.componentInstance;
    component.data = {
      id: 1,
      username: 'john.doe',
      email: 'john@example.com',
      roles: ['SERVEUR']
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onConfirm() appelle modalCtrl.dismiss(true)', () => {
    component.onConfirm();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledOnceWith(true);
  });

  it('onCancel() appelle modalCtrl.dismiss(false)', () => {
    component.onCancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledOnceWith(false);
  });

  it('data est correctement initialisé via @Input()', () => {
    expect(component.data).toBeDefined();
    expect(component.data.id).toBe(1);
    expect(component.data.username).toBe('john.doe');
  });
});
