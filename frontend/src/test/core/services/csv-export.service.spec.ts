import { TestBed } from '@angular/core/testing';
import { CsvExportService, CsvColumn, CsvExportOptions } from '../../../app/core/services/csv-export.service';

interface TestItem {
  id: number;
  name: string;
  price: number;
  notes?: string;
}

describe('CsvExportService', () => {
  let service: CsvExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CsvExportService]
    });
    service = TestBed.inject(CsvExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sanitizeFormula', () => {
    it('should return empty string for empty input', () => {
      expect(service.sanitizeFormula('')).toBe('');
    });

    it('should return benign text unchanged', () => {
      expect(service.sanitizeFormula('Mojito')).toBe('Mojito');
      expect(service.sanitizeFormula('123.45')).toBe('123.45');
    });

    it('should prefix dangerous leading characters with single quote', () => {
      expect(service.sanitizeFormula('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(service.sanitizeFormula('+cmd|calc')).toBe("'+cmd|calc");
      expect(service.sanitizeFormula('-10+2')).toBe("'-10+2");
      expect(service.sanitizeFormula('@evil')).toBe("'@evil");
      expect(service.sanitizeFormula('\tcmd')).toBe("'\tcmd");
      expect(service.sanitizeFormula('\rcmd')).toBe("'\rcmd");
    });

    it('should handle leading whitespace before formula character', () => {
      expect(service.sanitizeFormula('  =cmd')).toBe("'  =cmd");
    });
  });

  describe('escapeCell', () => {
    it('should return empty string for null or undefined', () => {
      expect(service.escapeCell(null)).toBe('');
      expect(service.escapeCell(undefined)).toBe('');
    });

    it('should keep plain values unquoted', () => {
      expect(service.escapeCell('Cocktail')).toBe('Cocktail');
      expect(service.escapeCell(123)).toBe('123');
      expect(service.escapeCell(true)).toBe('true');
    });

    it('should quote values containing the delimiter', () => {
      expect(service.escapeCell('Gin; Tonic')).toBe('"Gin; Tonic"');
      expect(service.escapeCell('Gin, Tonic', ',')).toBe('"Gin, Tonic"');
    });

    it('should double internal double quotes and wrap in quotes', () => {
      expect(service.escapeCell('The "Best" Cocktail')).toBe('"The ""Best"" Cocktail"');
    });

    it('should quote values containing newline or carriage return', () => {
      expect(service.escapeCell('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(service.escapeCell('Line1\rLine2')).toBe('"Line1\rLine2"');
    });

    it('should sanitize and quote formula injection values', () => {
      expect(service.escapeCell('=1+1')).toBe("\"'=1+1\"");
    });

    it('should allow disabling formula sanitization when requested', () => {
      expect(service.escapeCell('=1+1', ';', false)).toBe('=1+1');
    });
  });

  describe('generateFilename', () => {
    it('should format filename according to openbar_<dataset>_<YYYY-MM-DD_HHmm>.csv', () => {
      const fixedDate = new Date(2026, 8, 14, 15, 30); // 2026-09-14 15:30
      const filename = service.generateFilename('stock-waste', fixedDate);
      expect(filename).toBe('openbar_stock_waste_2026-09-14_1530.csv');
    });

    it('should clean special characters in dataset name', () => {
      const fixedDate = new Date(2026, 0, 5, 8, 5); // 2026-01-05 08:05
      const filename = service.generateFilename('audit logs / test!', fixedDate);
      expect(filename).toBe('openbar_audit_logs___test__2026-01-05_0805.csv');
    });
  });

  describe('exportTable and exportRows', () => {
    let downloadSpy: jasmine.Spy;

    beforeEach(() => {
      downloadSpy = spyOn(service, 'downloadCsv').and.stub();
    });

    it('should format table with headers, formatters, BOM and trigger download', () => {
      const data: TestItem[] = [
        { id: 1, name: 'Mojito', price: 9.5, notes: 'Fresh mint; lime' },
        { id: 2, name: '=Malicious', price: 12.0 }
      ];

      const columns: CsvColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Nom' },
        { key: 'price', header: 'Prix', formatter: (val) => `${val} €` },
        { key: 'notes', header: 'Remarques' }
      ];

      const fixedDate = new Date(2026, 8, 14, 12, 0);
      service.exportTable(data, columns, 'cocktails', { referenceDate: fixedDate });

      expect(downloadSpy).toHaveBeenCalledTimes(1);
      const [content, filename] = downloadSpy.calls.mostRecent().args;

      expect(filename).toBe('openbar_cocktails_2026-09-14_1200.csv');
      expect(content).toContain('\uFEFF');
      expect(content).toContain('ID;Nom;Prix;Remarques');
      expect(content).toContain('1;Mojito;9.5 €;"Fresh mint; lime"');
      expect(content).toContain('2;"\'=Malicious";12 €;');
    });

    it('should respect custom delimiter and direct filename', () => {
      const data: TestItem[] = [{ id: 10, name: 'Tonic', price: 3.5 }];
      const columns: CsvColumn<TestItem>[] = [
        { key: 'id', header: 'Code' },
        { key: 'name', header: 'Article' }
      ];

      service.exportTable(data, columns, 'custom_export.csv', { delimiter: ',', includeBom: false });

      const [content, filename] = downloadSpy.calls.mostRecent().args;
      expect(filename).toBe('custom_export.csv');
      expect(content.startsWith('\uFEFF')).toBeFalse();
      expect(content).toContain('Code,Article\r\n10,Tonic');
    });

    it('should export arbitrary 2D rows with exportRows', () => {
      const rows = [
        ['Rapport', 'Valeur'],
        ['Total', 1500],
        ['Formule', '=CMD()']
      ];

      service.exportRows(rows, 'metrics_report.csv');

      expect(downloadSpy).toHaveBeenCalledTimes(1);
      const [content, filename] = downloadSpy.calls.mostRecent().args;
      expect(filename).toBe('metrics_report.csv');
      expect(content).toContain('Rapport;Valeur\r\nTotal;1500\r\nFormule;"\'=CMD()"');
    });
  });

  describe('downloadCsv DOM interactions', () => {
    it('should create object URL, anchor, append, click and clean up', () => {
      const appendSpy = spyOn(document.body, 'appendChild').and.callThrough();
      const removeSpy = spyOn(HTMLAnchorElement.prototype, 'remove').and.callThrough();
      const createUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/test');
      const revokeUrlSpy = spyOn(URL, 'revokeObjectURL').and.stub();

      service.downloadCsv('header1;header2\r\nval1;val2', 'test_export.csv');

      expect(createUrlSpy).toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(revokeUrlSpy).toHaveBeenCalledWith('blob:http://localhost/test');
    });
  });
});
