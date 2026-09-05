import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FooterComponent } from '../../../app/core/components/footer/footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent, getTranslocoTestingModule()]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a footer element', () => {
    const footerEl = fixture.debugElement.query(By.css('footer.footer'));
    expect(footerEl).toBeTruthy();
  });

  it('should display copyright text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('© 2024 OpenBar');
  });

  it('should display version number', () => {
    const versionEl = fixture.debugElement.query(By.css('.version'));
    expect(versionEl).toBeTruthy();
    expect(versionEl.nativeElement.textContent).toContain('Version 1.0.0');
  });

  it('should render footer-content wrapper', () => {
    const contentEl = fixture.debugElement.query(By.css('.footer-content'));
    expect(contentEl).toBeTruthy();
  });
});
