import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
import { LegalComponent } from '../../../app/features/legal/legal.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('LegalComponent', () => {
  let component: LegalComponent;
  let fixture: ComponentFixture<LegalComponent>;
  let locationSpy: jasmine.SpyObj<Location>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    locationSpy = jasmine.createSpyObj('Location', ['back']);
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss', 'getTop']);
    modalControllerSpy.dismiss.and.returnValue(Promise.resolve(true));
    modalControllerSpy.getTop.and.returnValue(Promise.resolve(undefined));

    await TestBed.configureTestingModule({
      imports: [LegalComponent, getTranslocoTestingModule()],
      providers: [
        { provide: Location, useValue: locationSpy },
        { provide: ModalController, useValue: modalControllerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: {},
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LegalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created with default terms tab', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab).toBe('terms');
  });

  it('should switch tabs when selectTab is invoked', () => {
    component.selectTab('license');
    expect(component.activeTab).toBe('license');

    component.selectTab('compliance');
    expect(component.activeTab).toBe('compliance');

    component.selectTab('commercial');
    expect(component.activeTab).toBe('commercial');

    component.selectTab('terms');
    expect(component.activeTab).toBe('terms');
  });

  it('should dismiss modal when close is called and isModal is true', async () => {
    component.isModal = true;
    await component.close();
    expect(modalControllerSpy.dismiss).toHaveBeenCalledWith(null, 'close');
  });

  it('should navigate back via Location when close is called in route mode without modal', async () => {
    component.isModal = false;
    modalControllerSpy.getTop.and.returnValue(Promise.resolve(undefined));
    await component.close();
    expect(locationSpy.back).toHaveBeenCalled();
  });

  it('should render the corresponding panel when activeTab is changed', () => {
    component.selectTab('license');
    fixture.detectChanges();
    const licensePanel = fixture.nativeElement.querySelector('[data-testid="legal-panel-license"]');
    expect(licensePanel).toBeTruthy();

    component.selectTab('compliance');
    fixture.detectChanges();
    const compliancePanel = fixture.nativeElement.querySelector('[data-testid="legal-panel-compliance"]');
    expect(compliancePanel).toBeTruthy();

    component.selectTab('commercial');
    fixture.detectChanges();
    const commercialPanel = fixture.nativeElement.querySelector('[data-testid="legal-panel-commercial"]');
    expect(commercialPanel).toBeTruthy();
  });

  it('should initialize activeTab from valid query parameter', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot as any).queryParams = { tab: 'commercial' };
    component.ngOnInit();
    expect(component.activeTab).toBe('commercial');
  });

  it('should ignore invalid query parameter tab on ngOnInit', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot as any).queryParams = { tab: 'invalid-tab' };
    component.activeTab = 'terms';
    component.ngOnInit();
    expect(component.activeTab).toBe('terms');
  });

  it('should dismiss modal when isModal is false but topModal is present', async () => {
    component.isModal = false;
    modalControllerSpy.getTop.and.returnValue(Promise.resolve({} as any));
    await component.close();
    expect(modalControllerSpy.dismiss).toHaveBeenCalledWith(null, 'close');
  });

  it('should fallback to location back if modalController dismiss throws', async () => {
    component.isModal = true;
    modalControllerSpy.dismiss.and.returnValue(Promise.reject(new Error('Dismiss failed')));
    await component.close();
    expect(locationSpy.back).toHaveBeenCalled();
  });
});
