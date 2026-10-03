package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.EstablishmentConfig;

/**
 * Data Transfer Object representing the configuration state of all modular establishment capabilities.
 *
 * @param cuisineKds          Whether Kitchen Display Screen and workstation routing are enabled
 * @param happyHour           Whether dynamic Happy Hour promotional pricing is enabled
 * @param employeeManagement  Whether employee shifts and scheduling are enabled
 * @param floorPlan           Whether the 2D interactive Konva floor plan is enabled
 * @param qrClientOrdering    Whether customer self-ordering via table QR code is enabled
 * @param stockTracking       Whether automatic stock deduction and shrinkage tracking are enabled
 * @param cashDrawer          Whether daily cash register drawer lifecycle and intermediate X-reports are enabled
 * @param barTabs             Whether customer bar tabs and running ledgers without mandatory physical table assignment are enabled
 * @param cocktailLibrary     Whether cocktail and ingredient library import wizard is enabled
 * @param suppliersManagement Whether beverage and produce supplier management, purchase orders, and PAMP calculation are enabled
 * @param inventoryAudit      Whether periodic physical inventory audit (stocktake) and shrinkage reconciliation are enabled
 * @param mysteryRoulette     Whether mystery drink roulette wheel gamification is enabled
 * @param paymentTerminal     Whether physical card payment terminal (TPE) integration is enabled
 * @param tableReservations    Whether table reservations and floor plan booking assignments are enabled
 */
public record EstablishmentModulesDTO(
        boolean cuisineKds,
        boolean happyHour,
        boolean employeeManagement,
        boolean floorPlan,
        boolean qrClientOrdering,
        boolean stockTracking,
        boolean cashDrawer,
        boolean barTabs,
        boolean cocktailLibrary,
        boolean suppliersManagement,
        boolean inventoryAudit,
        boolean mysteryRoulette,
        boolean paymentTerminal,
        boolean tableReservations
) {
    public EstablishmentModulesDTO(
            boolean cuisineKds,
            boolean happyHour,
            boolean employeeManagement,
            boolean floorPlan,
            boolean qrClientOrdering,
            boolean stockTracking,
            boolean cashDrawer,
            boolean barTabs,
            boolean cocktailLibrary,
            boolean suppliersManagement,
            boolean inventoryAudit,
            boolean mysteryRoulette,
            boolean paymentTerminal
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, cocktailLibrary, suppliersManagement, inventoryAudit, mysteryRoulette, paymentTerminal, true);
    }

    public EstablishmentModulesDTO(
            boolean cuisineKds,
            boolean happyHour,
            boolean employeeManagement,
            boolean floorPlan,
            boolean qrClientOrdering,
            boolean stockTracking,
            boolean cashDrawer,
            boolean barTabs,
            boolean cocktailLibrary,
            boolean suppliersManagement,
            boolean inventoryAudit,
            boolean mysteryRoulette
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, cocktailLibrary, suppliersManagement, inventoryAudit, mysteryRoulette, true, true);
    }
    public EstablishmentModulesDTO(
            boolean cuisineKds,
            boolean happyHour,
            boolean employeeManagement,
            boolean floorPlan,
            boolean qrClientOrdering,
            boolean stockTracking,
            boolean cashDrawer,
            boolean barTabs,
            boolean cocktailLibrary,
            boolean suppliersManagement,
            boolean inventoryAudit
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, cocktailLibrary, suppliersManagement, inventoryAudit, true, true);
    }

    public EstablishmentModulesDTO(
            boolean cuisineKds,
            boolean happyHour,
            boolean employeeManagement,
            boolean floorPlan,
            boolean qrClientOrdering,
            boolean stockTracking,
            boolean cashDrawer,
            boolean barTabs,
            boolean cocktailLibrary,
            boolean suppliersManagement
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, cocktailLibrary, suppliersManagement, true, true, true);
    }

    public EstablishmentModulesDTO(
            boolean cuisineKds,
            boolean happyHour,
            boolean employeeManagement,
            boolean floorPlan,
            boolean qrClientOrdering,
            boolean stockTracking,
            boolean cashDrawer,
            boolean barTabs,
            boolean cocktailLibrary
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, cocktailLibrary, true, true, true, true);
    }

    public EstablishmentModulesDTO(
            boolean cuisineKds,
            boolean happyHour,
            boolean employeeManagement,
            boolean floorPlan,
            boolean qrClientOrdering,
            boolean stockTracking,
            boolean cashDrawer,
            boolean barTabs
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, true, true, true, true, true);
    }

    public EstablishmentModulesDTO(
            boolean cuisineKds,
            boolean happyHour,
            boolean employeeManagement,
            boolean floorPlan,
            boolean qrClientOrdering,
            boolean stockTracking,
            boolean cashDrawer
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, true, true, true, true, true, true);
    }

    /**
     * Constructs a DTO from an {@link EstablishmentConfig} entity.
     *
     * @param config The source establishment configuration entity
     * @return Transformed modules DTO with guaranteed non-null booleans (defaults to true)
     */
    public static EstablishmentModulesDTO from(EstablishmentConfig config) {
        if (config == null) {
            return defaultEnabled();
        }
        return new EstablishmentModulesDTO(
                config.getModuleKitchenKdsEnabled() == null || config.getModuleKitchenKdsEnabled(),
                config.getModuleHappyHourEnabled() == null || config.getModuleHappyHourEnabled(),
                config.getModuleEmployeeManagementEnabled() == null || config.getModuleEmployeeManagementEnabled(),
                config.getModuleFloorPlanEnabled() == null || config.getModuleFloorPlanEnabled(),
                config.getModuleQrClientOrderingEnabled() == null || config.getModuleQrClientOrderingEnabled(),
                config.getModuleStockTrackingEnabled() == null || config.getModuleStockTrackingEnabled(),
                config.getModuleCashDrawerEnabled() == null || config.getModuleCashDrawerEnabled(),
                config.getModuleBarTabsEnabled() == null || config.getModuleBarTabsEnabled(),
                config.getModuleCocktailLibraryEnabled() == null || config.getModuleCocktailLibraryEnabled(),
                config.getModuleSuppliersManagementEnabled() == null || config.getModuleSuppliersManagementEnabled(),
                config.getModuleInventoryAuditEnabled() == null || config.getModuleInventoryAuditEnabled(),
                config.getModuleMysteryRouletteEnabled() == null || config.getModuleMysteryRouletteEnabled(),
                config.getModulePaymentTerminalEnabled() == null || config.getModulePaymentTerminalEnabled(),
                config.getModuleTableReservationsEnabled() == null || config.getModuleTableReservationsEnabled()
        );
    }

    /**
     * Returns a default configuration where all modules are fully enabled.
     *
     * @return New instance with all flags set to true
     */
    public static EstablishmentModulesDTO defaultEnabled() {
        return new EstablishmentModulesDTO(true, true, true, true, true, true, true, true, true, true, true, true, true, true);
    }
}
