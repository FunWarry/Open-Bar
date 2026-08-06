import { Injectable, signal } from '@angular/core';
import { OnboardingStep } from '../models/onboarding-step.model';

/**
 * Service managing first-time onboarding completion state, persistence in localStorage,
 * and retrieval of role-tailored tutorial cards (Figma 633:1100–1173).
 */
@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private readonly STORAGE_PREFIX = 'openbar_onboarding_completed_';

  /** Signal tracking whether onboarding has been completed for the active user session. */
  readonly isCompletedSignal = signal<boolean>(false);

  private readonly COMMON_WELCOME_STEP: OnboardingStep = {
    id: 'welcome',
    titleKey: 'ONBOARDING.WELCOME_TITLE',
    descriptionKey: 'ONBOARDING.WELCOME_DESC',
    illustrationEmoji: '🍹',
    roleTarget: 'ALL',
    featureHighlightsKeys: [
      'ONBOARDING.WELCOME_FEAT_1',
      'ONBOARDING.WELCOME_FEAT_2',
      'ONBOARDING.WELCOME_FEAT_3'
    ]
  };

  private readonly ROLE_STEPS_MAP: Record<string, OnboardingStep[]> = {
    ADMIN: [
      {
        id: 'admin_users',
        titleKey: 'ONBOARDING.ADMIN_USERS_TITLE',
        descriptionKey: 'ONBOARDING.ADMIN_USERS_DESC',
        illustrationEmoji: '👥',
        roleTarget: 'ADMIN',
        featureHighlightsKeys: ['ONBOARDING.ADMIN_USERS_FEAT_1', 'ONBOARDING.ADMIN_USERS_FEAT_2'],
        routeAction: '/admin/users'
      },
      {
        id: 'admin_setup',
        titleKey: 'ONBOARDING.ADMIN_SETUP_TITLE',
        descriptionKey: 'ONBOARDING.ADMIN_SETUP_DESC',
        illustrationEmoji: '⚙️',
        roleTarget: 'ADMIN',
        featureHighlightsKeys: ['ONBOARDING.ADMIN_SETUP_FEAT_1', 'ONBOARDING.ADMIN_SETUP_FEAT_2'],
        routeAction: '/admin/etablissement'
      }
    ],
    MANAGER: [
      {
        id: 'manager_dashboard',
        titleKey: 'ONBOARDING.MANAGER_DASHBOARD_TITLE',
        descriptionKey: 'ONBOARDING.MANAGER_DASHBOARD_DESC',
        illustrationEmoji: '📊',
        roleTarget: 'MANAGER',
        featureHighlightsKeys: ['ONBOARDING.MANAGER_DASHBOARD_FEAT_1', 'ONBOARDING.MANAGER_DASHBOARD_FEAT_2'],
        routeAction: '/manager'
      },
      {
        id: 'manager_recap',
        titleKey: 'ONBOARDING.MANAGER_RECAP_TITLE',
        descriptionKey: 'ONBOARDING.MANAGER_RECAP_DESC',
        illustrationEmoji: '🧾',
        roleTarget: 'MANAGER',
        featureHighlightsKeys: ['ONBOARDING.MANAGER_RECAP_FEAT_1', 'ONBOARDING.MANAGER_RECAP_FEAT_2'],
        routeAction: '/factures/recap'
      }
    ],
    SERVEUR: [
      {
        id: 'serveur_plan',
        titleKey: 'ONBOARDING.SERVEUR_PLAN_TITLE',
        descriptionKey: 'ONBOARDING.SERVEUR_PLAN_DESC',
        illustrationEmoji: '🗺️',
        roleTarget: 'SERVEUR',
        featureHighlightsKeys: ['ONBOARDING.SERVEUR_PLAN_FEAT_1', 'ONBOARDING.SERVEUR_PLAN_FEAT_2'],
        routeAction: '/serveur'
      },
      {
        id: 'serveur_order',
        titleKey: 'ONBOARDING.SERVEUR_ORDER_TITLE',
        descriptionKey: 'ONBOARDING.SERVEUR_ORDER_DESC',
        illustrationEmoji: '📝',
        roleTarget: 'SERVEUR',
        featureHighlightsKeys: ['ONBOARDING.SERVEUR_ORDER_FEAT_1', 'ONBOARDING.SERVEUR_ORDER_FEAT_2'],
        routeAction: '/commandes/new'
      }
    ],
    BARMAN: [
      {
        id: 'barman_kanban',
        titleKey: 'ONBOARDING.BARMAN_KANBAN_TITLE',
        descriptionKey: 'ONBOARDING.BARMAN_KANBAN_DESC',
        illustrationEmoji: '🍺',
        roleTarget: 'BARMAN',
        featureHighlightsKeys: ['ONBOARDING.BARMAN_KANBAN_FEAT_1', 'ONBOARDING.BARMAN_KANBAN_FEAT_2'],
        routeAction: '/barman'
      },
      {
        id: 'barman_stock',
        titleKey: 'ONBOARDING.BARMAN_STOCK_TITLE',
        descriptionKey: 'ONBOARDING.BARMAN_STOCK_DESC',
        illustrationEmoji: '📦',
        roleTarget: 'BARMAN',
        featureHighlightsKeys: ['ONBOARDING.BARMAN_STOCK_FEAT_1', 'ONBOARDING.BARMAN_STOCK_FEAT_2'],
        routeAction: '/ingredients'
      }
    ],
    CLIENT: [
      {
        id: 'client_menu',
        titleKey: 'ONBOARDING.CLIENT_MENU_TITLE',
        descriptionKey: 'ONBOARDING.CLIENT_MENU_DESC',
        illustrationEmoji: '📱',
        roleTarget: 'CLIENT',
        featureHighlightsKeys: ['ONBOARDING.CLIENT_MENU_FEAT_1', 'ONBOARDING.CLIENT_MENU_FEAT_2'],
        routeAction: '/client/commande'
      }
    ]
  };

  /**
   * Checks if onboarding is completed for a specific user ID or role.
   *
   * @param userKey User ID or Role string identifier.
   * @returns True if onboarding was previously completed.
   */
  isCompleted(userKey: string): boolean {
    if (!userKey) return false;
    const val = localStorage.getItem(`${this.STORAGE_PREFIX}${userKey}`);
    const completed = val === 'true';
    this.isCompletedSignal.set(completed);
    return completed;
  }

  /**
   * Persists onboarding completion for a specific user ID or role.
   *
   * @param userKey User ID or Role string identifier.
   */
  markAsCompleted(userKey: string): void {
    if (!userKey) return;
    localStorage.setItem(`${this.STORAGE_PREFIX}${userKey}`, 'true');
    this.isCompletedSignal.set(true);
  }

  /**
   * Resets onboarding completion state allowing re-watching from Profile screen.
   *
   * @param userKey User ID or Role string identifier.
   */
  resetOnboarding(userKey: string): void {
    if (!userKey) return;
    localStorage.removeItem(`${this.STORAGE_PREFIX}${userKey}`);
    this.isCompletedSignal.set(false);
  }

  /**
   * Returns tailored tutorial step cards based on user role.
   *
   * @param role User role ('ADMIN' | 'MANAGER' | 'SERVEUR' | 'BARMAN' | 'CLIENT').
   * @returns Array of OnboardingStep models.
   */
  getStepsForRole(role: string): OnboardingStep[] {
    const specificSteps = this.ROLE_STEPS_MAP[role] || this.ROLE_STEPS_MAP['CLIENT'];
    return [this.COMMON_WELCOME_STEP, ...specificSteps];
  }
}
