/**
 * Modular capability identifiers for OpenBar establishment configuration.
 */
export enum EstablishmentModule {
  CUISINE_KDS = 'CUISINE_KDS',
  HAPPY_HOUR = 'HAPPY_HOUR',
  EMPLOYEE_MANAGEMENT = 'EMPLOYEE_MANAGEMENT',
  FLOOR_PLAN = 'FLOOR_PLAN',
  QR_CLIENT_ORDERING = 'QR_CLIENT_ORDERING',
  STOCK_TRACKING = 'STOCK_TRACKING',
}

/**
 * State of all modular capabilities for an establishment.
 */
export interface EstablishmentModules {
  cuisineKds: boolean;
  happyHour: boolean;
  employeeManagement: boolean;
  floorPlan: boolean;
  qrClientOrdering: boolean;
  stockTracking: boolean;
}

/**
 * Establishment business activity presets for quick feature flag configuration.
 */
export type EstablishmentPresetType = 'BAR' | 'RESTAURANT' | 'FOOD_TRUCK' | 'NIGHTCLUB' | 'CUSTOM';

/**
 * Preset mapping definition for rapid configuration during onboarding and settings.
 */
export const ESTABLISHMENT_PRESETS: Record<Exclude<EstablishmentPresetType, 'CUSTOM'>, EstablishmentModules> = {
  BAR: {
    cuisineKds: false,
    happyHour: true,
    employeeManagement: true,
    floorPlan: true,
    qrClientOrdering: true,
    stockTracking: true,
  },
  RESTAURANT: {
    cuisineKds: true,
    happyHour: true,
    employeeManagement: true,
    floorPlan: true,
    qrClientOrdering: true,
    stockTracking: true,
  },
  FOOD_TRUCK: {
    cuisineKds: true,
    happyHour: false,
    employeeManagement: false,
    floorPlan: false,
    qrClientOrdering: true,
    stockTracking: true,
  },
  NIGHTCLUB: {
    cuisineKds: false,
    happyHour: true,
    employeeManagement: true,
    floorPlan: false,
    qrClientOrdering: false,
    stockTracking: true,
  },
};
