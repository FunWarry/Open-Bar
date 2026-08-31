import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { TableSidePanelComponent } from '../../../app/features/plan-salle/components/table-side-panel/table-side-panel.component';
import { TableBar } from '../../../app/core/models/table.model';
import { ZoneArea } from '../../../app/features/plan-salle/models/table-position.model';

describe('TableSidePanelComponent', () => {
  let component: TableSidePanelComponent;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockModal = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: { confirmed: true } }))
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    await TestBed.configureTestingModule({
      imports: [TableSidePanelComponent, CommonModule, FormsModule, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(TableSidePanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit closePanel event on onClose()', () => {
    spyOn(component.closePanel, 'emit');
    component.onClose();
    expect(component.closePanel.emit).toHaveBeenCalled();
  });

  it('should emit startFusion event with table', () => {
    const mockTable: TableBar = { id: 1, numero: 5, capacite: 4, occupee: false, zone: 'INTERIEUR', createdAt: '', updatedAt: '' };
    component.table = mockTable;
    spyOn(component.startFusion, 'emit');

    component.onStartFusion();
    expect(component.startFusion.emit).toHaveBeenCalledWith(mockTable);
  });

  it('should emit saveTable event with table and position data', () => {
    const mockTable: TableBar = { id: 2, numero: 8, capacite: 2, occupee: true, zone: 'TERRASSE', createdAt: '', updatedAt: '' };
    component.table = mockTable;
    component.position = { tableId: 2, x: 100, y: 100, width: 80, height: 80, rotation: 0, shape: 'rect', zone: 'TERRASSE' };
    spyOn(component.saveTable, 'emit');

    component.onSave();
    expect(component.saveTable.emit).toHaveBeenCalledWith({
      table: {
        numero: 8,
        capacite: 2,
        zone: 'TERRASSE',
      },
      position: {
        width: 80,
        height: 80,
        rotation: 0,
        shape: 'rect',
        zone: 'TERRASSE',
      },
    });
  });

  it('should emit liveUpdateTable when changing table shape to circle or oval', () => {
    component.table = { id: 1, numero: 1, capacite: 4, occupee: false, zone: 'INTERIEUR', createdAt: '', updatedAt: '' };
    component.position = { tableId: 1, x: 50, y: 50, width: 120, height: 80, rotation: 0, shape: 'rect' };
    spyOn(component.liveUpdateTable, 'emit');

    component.onChangeTableShape('circle');
    expect(component.position.shape).toBe('circle');
    expect(component.position.width).toBe(120);
    expect(component.position.height).toBe(80);
    expect(component.liveUpdateTable.emit).toHaveBeenCalled();
  });

  it('should rotate position by 90 degrees on onRotate90()', () => {
    component.table = { id: 1, numero: 1, capacite: 4, occupee: false, zone: 'INTERIEUR', createdAt: '', updatedAt: '' };
    component.position = { tableId: 1, x: 50, y: 50, width: 120, height: 80, rotation: 45, shape: 'rect' };
    spyOn(component.liveUpdateTable, 'emit');

    component.onRotate90();
    expect(component.position.rotation).toBe(135);
    expect(component.liveUpdateTable.emit).toHaveBeenCalled();
  });

  it('should toggle and select zone option', () => {
    component.table = { id: 1, numero: 1, capacite: 4, occupee: false, zone: 'INTERIEUR', createdAt: '', updatedAt: '' };
    component.position = { tableId: 1, x: 50, y: 50, width: 120, height: 80, rotation: 0, shape: 'rect' };
    const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;

    component.toggleZoneDropdown(mockEvent);
    expect(component.isZoneDropdownOpen).toBeTrue();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();

    component.selectZoneOption('MEZZANINE');
    expect(component.table.zone).toBe('MEZZANINE');
    expect(component.isZoneDropdownOpen).toBeFalse();
  });

  it('onDeleteTable opens ConfirmDeleteModalComponent and emits deleteTable on confirmation', fakeAsync(() => {
    component.table = { id: 999, numero: 999, capacite: 4, occupee: false, zone: 'INTERIEUR', createdAt: '', updatedAt: '' };
    spyOn(component.deleteTable, 'emit');
    spyOn(component, 'onClose');

    component.onDeleteTable();
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(mockModal.present).toHaveBeenCalled();
    expect(component.deleteTable.emit).toHaveBeenCalledWith(999);
    expect(component.onClose).toHaveBeenCalled();
  }));

  it('onDeleteZoneArea opens ConfirmDeleteModalComponent and emits deleteZoneArea on confirmation', fakeAsync(() => {
    const mockZoneArea: ZoneArea = {
      id: 'za-1',
      nom: 'TERRASSE',
      etage: 'RDC',
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      shapeType: 'rect'
    };
    component.selectedZoneArea = mockZoneArea;
    spyOn(component.deleteZoneArea, 'emit');
    spyOn(component, 'onClose');

    component.onDeleteZoneArea();
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(mockModal.present).toHaveBeenCalled();
    expect(component.deleteZoneArea.emit).toHaveBeenCalledWith('za-1');
    expect(component.onClose).toHaveBeenCalled();
  }));

  it('should handle zone corner radii and polygon vertices', () => {
    const mockZoneArea: ZoneArea = {
      id: 'za-2',
      nom: 'VIP POLYGON',
      etage: 'RDC',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      shapeType: 'polygon',
      points: [0, 0, 300, 0, 300, 200, 0, 200]
    };
    component.selectedZoneArea = mockZoneArea;

    expect(component.polygonVertices).toHaveSize(4);

    component.addPolygonVertex();
    expect(component.polygonVertices).toHaveSize(5);

    component.removePolygonVertex(4);
    expect(component.polygonVertices).toHaveSize(4);

    component.setCornerRadius(0, 25);
    expect(component.cornerRadii[0]).toBe(25);
  });

  it('should open TableQrModalComponent when onOpenQrModal() is called', fakeAsync(() => {
    const mockTable: TableBar = { id: 1, numero: 5, capacite: 4, occupee: false, zone: 'INTERIEUR', createdAt: '', updatedAt: '' };
    component.table = mockTable;

    component.onOpenQrModal();
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      componentProps: { table: mockTable }
    }));
    expect(mockModal.present).toHaveBeenCalled();
  }));
});
