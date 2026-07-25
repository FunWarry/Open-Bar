import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SetupGuard } from '../../../app/core/guards/setup.guard';
import { SetupService } from '../../../app/core/services/setup.service';

describe('SetupGuard', () => {
  let guard: SetupGuard;
  let setupServiceSpy: jasmine.SpyObj<SetupService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    setupServiceSpy = jasmine.createSpyObj('SetupService', ['getStatus']);
    routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        SetupGuard,
        { provide: SetupService, useValue: setupServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(SetupGuard);
  });

  it('autorise l\'accès à /setup si l\'application n\'est pas encore initialisée', (done) => {
    setupServiceSpy.getStatus.and.returnValue(of({ initialized: false, userCount: 0 }));

    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('redirige vers /auth/login si l\'application est déjà initialisée', (done) => {
    const dummyUrlTree = {} as UrlTree;
    setupServiceSpy.getStatus.and.returnValue(of({ initialized: true, userCount: 1 }));
    routerSpy.createUrlTree.and.returnValue(dummyUrlTree);

    guard.canActivate().subscribe(result => {
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
      expect(result).toBe(dummyUrlTree);
      done();
    });
  });

  it('laisse passer si getStatus échoue avec une erreur HTTP', (done) => {
    setupServiceSpy.getStatus.and.returnValue(throwError(() => new Error('Network error')));

    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });
});
