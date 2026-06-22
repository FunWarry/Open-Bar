import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { TableListComponent } from '../../../app/features/tables/table-list/table-list.component';

describe('TableListComponent', () => {
  let component: TableListComponent;
  let fixture: ComponentFixture<TableListComponent>;
  let storeSpy: jasmine.SpyObj<Store>;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [
        TableListComponent,
        IonicModule.forRoot()
      ],
      providers: [
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TableListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with an empty tables array', () => {
    expect(component.tables).toEqual([]);
  });

  it('isAdmin$ should be populated from the store', (done) => {
    storeSpy.select.and.returnValue(of(true));

    fixture = TestBed.createComponent(TableListComponent);
    component = fixture.componentInstance;

    component.isAdmin$.subscribe(isAdmin => {
      expect(isAdmin).toBe(true);
      done();
    });
  });

  it('isAdmin$ should emit false when store returns false', (done) => {
    storeSpy.select.and.returnValue(of(false));

    fixture = TestBed.createComponent(TableListComponent);
    component = fixture.componentInstance;

    component.isAdmin$.subscribe(isAdmin => {
      expect(isAdmin).toBe(false);
      done();
    });
  });

  describe('ngOnInit()', () => {
    it('should not throw on init', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('tables should remain empty after ngOnInit (load not yet implemented)', () => {
      component.ngOnInit();
      expect(component.tables).toEqual([]);
    });
  });

  describe('onAdd()', () => {
    it('should execute without error (stub method)', () => {
      expect(() => component.onAdd()).not.toThrow();
    });
  });

  describe('onView()', () => {
    it('should execute without error when called with a table object', () => {
      const mockTable = { id: 1, numero: 5, statut: 'LIBRE' };
      expect(() => component.onView(mockTable)).not.toThrow();
    });
  });

  describe('onEdit()', () => {
    it('should execute without error when called with a table object', () => {
      const mockTable = { id: 2, numero: 3, statut: 'OCCUPEE' };
      expect(() => component.onEdit(mockTable)).not.toThrow();
    });
  });
});
