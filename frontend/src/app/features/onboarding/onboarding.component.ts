import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IonContent, IonCard, IonCardContent } from '@ionic/angular/standalone';
import { selectCurrentUser } from '../../core/store/auth.selectors';
import { User } from '../../core/models/user.model';
import { OnboardingStep } from '../../core/models/onboarding-step.model';
import { OnboardingService } from '../../core/services/onboarding.service';
import { RoleBadgeComponent } from '../../core/components/ui/role-badge/role-badge.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';

/**
 * Interactive Onboarding Component displaying role-tailored tutorial cards
 * upon first login or on demand from Profile screen (Figma 633:1100–1173).
 *
 * <p>Supports step pagination, feature highlights list, role badge, skip/next/finish actions,
 * and persistence via {@link OnboardingService}.</p>
 */
@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css'],
  standalone: true,
  imports: [
    IonContent,
    IonCard,
    IonCardContent,
    TranslocoModule,
    RoleBadgeComponent,
    ActionButtonComponent
  ]
})
export class OnboardingComponent implements OnInit, OnDestroy {
  /** Currently authenticated user. */
  currentUser: User | null = null;

  /** Active role string ('ADMIN' | 'MANAGER' | 'SERVEUR' | 'BARMAN' | 'CLIENT'). */
  userRole = signal<string>('CLIENT');

  /** List of tutorial steps for the user's role. */
  steps = signal<OnboardingStep[]>([]);

  /** Currently displayed step index (0-based). */
  currentIndex = signal<number>(0);

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly onboardingService: OnboardingService,
    private readonly transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.store.select(selectCurrentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        const role = (user?.roles?.[0] as string) || 'CLIENT';
        this.userRole.set(role);

        const loadedSteps = this.onboardingService.getStepsForRole(role);
        this.steps.set(loadedSteps);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Returns current active OnboardingStep model.
   */
  get currentStep(): OnboardingStep | undefined {
    return this.steps()[this.currentIndex()];
  }

  /**
   * Whether the user is viewing the final step card.
   */
  get isLastStep(): boolean {
    return this.currentIndex() === this.steps().length - 1;
  }

  /**
   * Advances to next step card or finishes onboarding if on last card.
   */
  next(): void {
    if (this.isLastStep) {
      this.finish();
    } else {
      this.currentIndex.update(idx => idx + 1);
    }
  }

  /**
   * Navigates back to previous step card.
   */
  previous(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(idx => idx - 1);
    }
  }

  /**
   * Directly sets active step index.
   *
   * @param index Target index.
   */
  goToStep(index: number): void {
    if (index >= 0 && index < this.steps().length) {
      this.currentIndex.set(index);
    }
  }

  /**
   * Skips remaining tutorial slides and finishes onboarding.
   */
  skip(): void {
    this.finish();
  }

  /**
   * Persists onboarding completion and navigates user to their main dashboard.
   */
  finish(): void {
    const key = this.currentUser?.id ? String(this.currentUser.id) : this.userRole();
    this.onboardingService.markAsCompleted(key);

    const targetRoute = this.getDestinationRoute();
    void this.router.navigate([targetRoute]);
  }

  /**
   * Resolves target destination route based on user role.
   */
  getDestinationRoute(): string {
    switch (this.userRole()) {
      case 'ADMIN': return '/admin';
      case 'MANAGER': return '/manager';
      case 'SERVEUR': return '/serveur';
      case 'BARMAN': return '/barman';
      case 'CLIENT':
      default: return '/client/commande';
    }
  }
}
