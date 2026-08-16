import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableSidePanelComponent } from '../../../app/features/plan-salle/components/table-side-panel/table-side-panel.component';
import { TableBar } from '../../../app/core/models/table.model';

describe('TableSidePanelComponent', () => {
  let component: TableSidePanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableSidePanelComponent, CommonModule, FormsModule, getTranslocoTestingModule()],
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
});
