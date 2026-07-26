import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableSidePanelComponent } from '../../../app/features/plan-salle/components/table-side-panel/table-side-panel.component';
import { TableBar } from '../../../app/core/models/table.model';

describe('TableSidePanelComponent', () => {
  let component: TableSidePanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableSidePanelComponent, CommonModule, FormsModule],
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

  it('should emit saveTable event with table', () => {
    const mockTable: TableBar = { id: 2, numero: 8, capacite: 2, occupee: true, zone: 'TERRASSE', createdAt: '', updatedAt: '' };
    component.table = mockTable;
    spyOn(component.saveTable, 'emit');

    component.onSave();
    expect(component.saveTable.emit).toHaveBeenCalledWith(mockTable);
  });
});
