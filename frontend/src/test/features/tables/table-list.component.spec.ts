import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TableListComponent } from '../../../app/features/tables/table-list/table-list.component';
import { TableService } from '../../../app/core/services/table.service';
import { TableBar } from '../../../app/core/models/table.model';

const mockTables: TableBar[] = [
  { id: 1, numero: 1, capacite: 4, zone: 'TERRASSE', occupee: false, createdAt: '', updatedAt: '' },
  { id: 2, numero: 2, capacite: 2, zone: 'INTERIEUR', occupee: true,  createdAt: '', updatedAt: '' },
];

describe('TableListComponent', () => {
  let component: TableListComponent;
  let fixture: ComponentFixture<TableListComponent>;
  let serviceSpy: jasmine.SpyObj<TableService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let storeSpy: jasmine.SpyObj<Store>;
  let router: Router;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('TableService', ['getAll']);
    serviceSpy.getAll.and.returnValue(of(mockTables));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [TableListComponent, IonicModule.forRoot(), RouterTestingModule, HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: TableService, useValue: serviceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(TableListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => expect(component).toBeTruthy());

  it('charger() peuple tables depuis le service', fakeAsync(() => {
    component.charger();
    tick();
    expect(component.tables).toHaveSize(2);
  }));

  it('charger() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('onAdd() navigue vers /tables/new', () => {
    spyOn(router, 'navigate');
    component.onAdd();
    expect(router.navigate).toHaveBeenCalledWith(['/tables/new']);
  });

  it('onView() navigue vers /tables/:id', () => {
    spyOn(router, 'navigate');
    component.onView(mockTables[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/tables', 1]);
  });

  it('onEdit() navigue vers /tables/:id/edit', () => {
    spyOn(router, 'navigate');
    component.onEdit(mockTables[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/tables', 1, 'edit']);
  });

  it('isAdmin$ émet false par défaut', (done) => {
    component.isAdmin$.subscribe(v => { expect(v).toBe(false); done(); });
  });

  it('trackById retourne l\'id de la table', () => {
    expect(component.trackById(0, mockTables[0])).toBe(1);
  });
});
