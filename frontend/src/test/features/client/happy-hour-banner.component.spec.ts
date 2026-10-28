import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { HappyHourBannerComponent } from '../../../app/features/client/components/happy-hour-banner/happy-hour-banner.component';
import { HappyHourService } from '../../../app/core/services/happy-hour.service';
import { ActiveCountdownInfo, HappyHourRule, UpcomingTeaserInfo } from '../../../app/core/models/happy-hour.model';

describe('HappyHourBannerComponent', () => {
  let component: HappyHourBannerComponent;
  let fixture: ComponentFixture<HappyHourBannerComponent>;

  const activeCountdownSignal = signal<ActiveCountdownInfo | null>(null);
  const upcomingTeaserSignal = signal<UpcomingTeaserInfo | null>(null);

  const mockRule: HappyHourRule = {
    id: 1,
    name: 'Cocktails Signature',
    startTime: '18:00',
    endTime: '20:00',
    daysOfWeek: ['MONDAY'],
    discountType: 'PERCENTAGE',
    discountValue: 25,
    active: true,
    categories: ['SPECIAL'],
    cocktailIds: []
  };

  const happyHourServiceMock = {
    activeCountdown: activeCountdownSignal.asReadonly(),
    upcomingTeaser: upcomingTeaserSignal.asReadonly()
  };

  beforeEach(async () => {
    activeCountdownSignal.set(null);
    upcomingTeaserSignal.set(null);

    await TestBed.configureTestingModule({
      imports: [
        HappyHourBannerComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              PRICING: {
                HAPPY_HOUR_ACTIVE_TITLE: '🍸 Happy Hour en cours !',
                HAPPY_HOUR_ENDS_IN: 'Fin dans {{ time }}',
                HAPPY_HOUR_UPCOMING_TITLE: '⏰ Happy Hour approche !',
                HAPPY_HOUR_STARTS_IN: 'Commence dans {{ minutes }} minutes {{ target }} !',
                TARGET_ALL: 'sur toute la carte',
                TARGET_NAMED: 'sur {{ name }}'
              }
            }
          },
          translocoConfig: {
            availableLangs: ['fr'],
            defaultLang: 'fr'
          }
        })
      ],
      providers: [
        { provide: HappyHourService, useValue: happyHourServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HappyHourBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create successfully', () => {
    expect(component).toBeTruthy();
  });

  it('should render nothing when neither active countdown nor upcoming teaser is present', () => {
    activeCountdownSignal.set(null);
    upcomingTeaserSignal.set(null);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.hh-banner');
    expect(banner).toBeNull();
  });

  it('should render glowing active banner with live countdown pill when Happy Hour is active', () => {
    activeCountdownSignal.set({
      rule: mockRule,
      remainingSeconds: 1455,
      formattedTime: '24:15',
      scopeDescriptionKey: 'PRICING.TARGET_NAMED',
      scopeDescriptionParams: { name: 'Cocktails Signature' }
    });
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('[data-testid="hh-active-banner"]');
    expect(banner).not.toBeNull();

    const title = fixture.nativeElement.querySelector('[data-testid="hh-active-title"]');
    expect(title.textContent).toContain('Happy Hour en cours');

    const countdown = fixture.nativeElement.querySelector('[data-testid="hh-active-countdown"]');
    expect(countdown.textContent).toContain('Fin dans 24:15');

    const scope = fixture.nativeElement.querySelector('[data-testid="hh-active-scope"]');
    expect(scope.textContent).toContain('Cocktails Signature');
  });

  it('should render upcoming teaser alert when Happy Hour starts within 60 minutes', () => {
    activeCountdownSignal.set(null);
    upcomingTeaserSignal.set({
      rule: mockRule,
      minutesUntilStart: 35,
      scopeDescriptionKey: 'PRICING.TARGET_NAMED',
      scopeDescriptionParams: { name: 'Cocktails Signature' }
    });
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('[data-testid="hh-upcoming-banner"]');
    expect(banner).not.toBeNull();

    const title = fixture.nativeElement.querySelector('[data-testid="hh-upcoming-title"]');
    expect(title.textContent).toContain('Happy Hour approche');

    const desc = fixture.nativeElement.querySelector('[data-testid="hh-upcoming-desc"]');
    expect(desc.textContent).toContain('Commence dans 35 minutes');

    const timeBadge = fixture.nativeElement.querySelector('[data-testid="hh-upcoming-time"]');
    expect(timeBadge.textContent).toContain('35 min');
  });
});

