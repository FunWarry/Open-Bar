import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RecipeStepTemplateService } from '../../../app/core/services/recipe-step-template.service';
import { environment } from '../../../environments/environment';
import { RecipeStepTemplate, RecipeStepTemplateRequest } from '../../../app/core/models/recipe-step.model';

describe('RecipeStepTemplateService', () => {
  let service: RecipeStepTemplateService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/recipe-step-templates`;

  const mockTemplates: RecipeStepTemplate[] = [
    {
      id: 1,
      name: 'Shake vigorously',
      actionType: 'SHAKE',
      defaultDurationSeconds: 15,
      icon: 'wine-outline',
      description: 'Shake until frost forms',
      predefined: true,
    },
    {
      id: 2,
      name: 'Fine Strain',
      actionType: 'STRAIN',
      defaultDurationSeconds: 10,
      icon: 'funnel-outline',
      predefined: true,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RecipeStepTemplateService],
    });
    service = TestBed.inject(RecipeStepTemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should call GET /api/recipe-step-templates and return all templates', () => {
    service.getAll().subscribe((data) => {
      expect(data).toHaveSize(2);
      expect(data[0].name).toBe('Shake vigorously');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockTemplates);
  });

  it('should call GET /api/recipe-step-templates with actionType filter', () => {
    service.getAll('SHAKE').subscribe((data) => {
      expect(data).toHaveSize(1);
    });

    const req = httpMock.expectOne(`${baseUrl}?actionType=SHAKE`);
    expect(req.request.method).toBe('GET');
    req.flush([mockTemplates[0]]);
  });

  it('should call GET /api/recipe-step-templates/:id and return single template', () => {
    service.getById(1).subscribe((data) => {
      expect(data.id).toBe(1);
      expect(data.actionType).toBe('SHAKE');
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTemplates[0]);
  });

  it('should call POST /api/recipe-step-templates and return newly created template', () => {
    const payload: RecipeStepTemplateRequest = {
      name: 'Double Strain',
      actionType: 'STRAIN',
      defaultDurationSeconds: 10,
      icon: 'funnel-outline',
    };

    service.create(payload).subscribe((created) => {
      expect(created.id).toBe(3);
      expect(created.name).toBe('Double Strain');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 3, ...payload, predefined: false });
  });

  it('should call PUT /api/recipe-step-templates/:id and return updated template', () => {
    const payload: RecipeStepTemplateRequest = {
      name: 'Gentle Stir',
      actionType: 'STIR',
      defaultDurationSeconds: 20,
    };

    service.update(1, payload).subscribe((updated) => {
      expect(updated.name).toBe('Gentle Stir');
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockTemplates[0], name: 'Gentle Stir', defaultDurationSeconds: 20 });
  });

  it('should call DELETE /api/recipe-step-templates/:id', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
