/**
 * Represents a single slide/card step in the interactive onboarding tutorial flow.
 */
export interface OnboardingStep {
  /** Unique identifier for the step. */
  id: string;
  /** Translation key for the step title. */
  titleKey: string;
  /** Translation key for the detailed step description. */
  descriptionKey: string;
  /** Emoji illustration or icon name displayed on the card. */
  illustrationEmoji: string;
  /** Targeted user role ('ADMIN' | 'MANAGER' | 'SERVEUR' | 'BARMAN' | 'CLIENT' | 'ALL'). */
  roleTarget: 'ADMIN' | 'MANAGER' | 'SERVEUR' | 'BARMAN' | 'CLIENT' | 'ALL';
  /** List of translation keys highlighting key feature bullet points. */
  featureHighlightsKeys: string[];
  /** Optional target route path to navigate on step action. */
  routeAction?: string;
}
