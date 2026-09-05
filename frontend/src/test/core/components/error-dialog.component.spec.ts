import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorDialogComponent } from '../../../app/core/components/error-dialog/error-dialog.component';
import { ModalController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';

describe('ErrorDialogComponent', () => {
  let component: ErrorDialogComponent;
  let fixture: ComponentFixture<ErrorDialogComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [
        ErrorDialogComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { defaultLang: 'en', availableLangs: ['en', 'fr'] },
        }),
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorDialogComponent);
    component = fixture.componentInstance;
    component.data = { message: 'An unexpected error occurred' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dismiss modal on close', () => {
    component.onClose();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });
});
