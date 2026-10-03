import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PaginationComponent } from '../../../../app/core/components/ui/pagination/pagination.component';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent, getTranslocoTestingModule()]
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
  });

  it('should create the pagination component', () => {
    component.currentPage = 1;
    component.totalItems = 50;
    component.pageSize = 24;
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  describe('Calculated Metrics', () => {
    it('should calculate totalPages correctly', () => {
      component.totalItems = 50;
      component.pageSize = 24;
      expect(component.totalPages).toBe(3);

      component.totalItems = 0;
      expect(component.totalPages).toBe(1);

      component.totalItems = 24;
      expect(component.totalPages).toBe(1);
    });

    it('should calculate startItem and endItem accurately', () => {
      component.currentPage = 2;
      component.pageSize = 24;
      component.totalItems = 50;

      expect(component.startItem).toBe(25);
      expect(component.endItem).toBe(48);

      component.currentPage = 3;
      expect(component.startItem).toBe(49);
      expect(component.endItem).toBe(50);

      component.totalItems = 0;
      expect(component.startItem).toBe(0);
      expect(component.endItem).toBe(0);
    });
  });

  describe('Page Number Array Generation with Ellipsis', () => {
    it('should return all pages when totalPages <= 7', () => {
      component.totalItems = 70;
      component.pageSize = 10; // 7 pages
      component.currentPage = 4;

      expect(component.pages).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('should include trailing ellipsis when near start of large page set', () => {
      component.totalItems = 150;
      component.pageSize = 10; // 15 pages
      component.currentPage = 2;

      expect(component.pages).toEqual([1, 2, 3, 4, 5, -1, 15]);
    });

    it('should include leading ellipsis when near end of large page set', () => {
      component.totalItems = 150;
      component.pageSize = 10; // 15 pages
      component.currentPage = 13;

      expect(component.pages).toEqual([1, -1, 11, 12, 13, 14, 15]);
    });

    it('should include both leading and trailing ellipsis when in middle of large page set', () => {
      component.totalItems = 150;
      component.pageSize = 10; // 15 pages
      component.currentPage = 8;

      expect(component.pages).toEqual([1, -1, 7, 8, 9, -1, 15]);
    });
  });

  describe('User Interactions & Event Emission', () => {
    beforeEach(() => {
      component.currentPage = 2;
      component.pageSize = 10;
      component.totalItems = 50;
      fixture.detectChanges();
    });

    it('should emit pageChange on valid onPage call', () => {
      spyOn(component.pageChange, 'emit');

      component.onPage(3);
      expect(component.pageChange.emit).toHaveBeenCalledWith(3);

      // Same page should not emit
      component.onPage(2);
      expect(component.pageChange.emit).toHaveBeenCalledTimes(1);
    });

    it('should emit previous and next page changes', () => {
      spyOn(component.pageChange, 'emit');

      component.onPrev();
      expect(component.pageChange.emit).toHaveBeenCalledWith(1);

      component.onNext();
      expect(component.pageChange.emit).toHaveBeenCalledWith(3);
    });

    it('should not emit previous when on first page', () => {
      component.currentPage = 1;
      spyOn(component.pageChange, 'emit');

      component.onPrev();
      expect(component.pageChange.emit).not.toHaveBeenCalled();
    });

    it('should not emit next when on last page', () => {
      component.currentPage = 5;
      spyOn(component.pageChange, 'emit');

      component.onNext();
      expect(component.pageChange.emit).not.toHaveBeenCalled();
    });

    it('should emit pageSizeChange when selecting new page size', () => {
      spyOn(component.pageSizeChange, 'emit');

      component.onPageSize(48);
      expect(component.pageSizeChange.emit).toHaveBeenCalledWith(48);

      // Same page size should not emit
      component.onPageSize(10);
      expect(component.pageSizeChange.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('DOM Rendering & testid Attributes', () => {
    it('should render root navigation with testid', () => {
      component.currentPage = 1;
      component.totalItems = 50;
      component.pageSize = 10;
      component.showSummary = true;
      fixture.detectChanges();

      const root = fixture.debugElement.query(By.css('[data-testid="pagination-root"]'));
      expect(root).toBeTruthy();

      const prevBtn = fixture.debugElement.query(By.css('[data-testid="pagination-prev-btn"]'));
      expect(prevBtn.nativeElement.disabled).toBeTrue();

      const nextBtn = fixture.debugElement.query(By.css('[data-testid="pagination-next-btn"]'));
      expect(nextBtn.nativeElement.disabled).toBeFalse();
    });

    it('should render page size switcher when showPageSize is enabled', () => {
      component.currentPage = 1;
      component.totalItems = 100;
      component.pageSize = 24;
      component.showPageSize = true;
      component.pageSizeOptions = [24, 48, 96];
      fixture.detectChanges();

      const sizePills = fixture.debugElement.query(By.css('[data-testid="pagination-page-size"]'));
      expect(sizePills).toBeTruthy();

      const btn48 = fixture.debugElement.query(By.css('[data-testid="pagination-page-size-48"]'));
      expect(btn48).toBeTruthy();
    });
  });
});
