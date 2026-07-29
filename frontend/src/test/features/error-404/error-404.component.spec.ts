import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Error404Component } from '../../../app/features/error-404/error-404.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('Error404Component', () => {
  let component: Error404Component;
  let fixture: ComponentFixture<Error404Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Error404Component, getTranslocoTestingModule()],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Error404Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
