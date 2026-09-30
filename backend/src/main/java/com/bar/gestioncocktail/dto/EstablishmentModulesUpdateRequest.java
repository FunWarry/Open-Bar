package com.bar.gestioncocktail.dto;

/**
 * Request payload for updating the activation status of establishment capability modules.
 * Null values indicate unchanged state.
 *
 * @param cuisineKds          Optional new status for Kitchen Display Screen module
 * @param happyHour           Optional new status for Happy Hour pricing module
 * @param employeeManagement  Optional new status for Employee Management module
 * @param floorPlan           Optional new status for Floor Plan module
 * @param qrClientOrdering    Optional new status for QR Client Ordering module
 * @param stockTracking       Optional new status for Stock Tracking module
 * @param cashDrawer          Optional new status for Cash Drawer module
 * @param barTabs             Optional new status for Bar Tabs module
 * @param cocktailLibrary     Optional new status for Cocktail & Ingredient Library module
 * @param suppliersManagement Optional new status for Suppliers & Purchase Orders module
 * @param inventoryAudit      Optional new status for Physical Inventory Audit module
 * @param mysteryRoulette     Optional new status for Mystery Drink Roulette module
 * @param paymentTerminal     Optional new status for Physical Payment Terminal (TPE) module
 */
public record EstablishmentModulesUpdateRequest(
        Boolean cuisineKds,
        Boolean happyHour,
        Boolean employeeManagement,
        Boolean floorPlan,
        Boolean qrClientOrdering,
        Boolean stockTracking,
        Boolean cashDrawer,
        Boolean barTabs,
        Boolean cocktailLibrary,
        Boolean suppliersManagement,
        Boolean inventoryAudit,
        Boolean mysteryRoulette,
        Boolean paymentTerminal
) {
    @Override
    public Boolean paymentTerminal() {
        return paymentTerminal;
    }

    /**
     * Backward-compatible constructor for 12 modules before paymentTerminal was introduced.
     */
    public EstablishmentModulesUpdateRequest(
            Boolean cuisineKds,
            Boolean happyHour,
            Boolean employeeManagement,
            Boolean floorPlan,
            Boolean qrClientOrdering,
            Boolean stockTracking,
            Boolean cashDrawer,
            Boolean barTabs,
            Boolean cocktailLibrary,
            Boolean suppliersManagement,
            Boolean inventoryAudit,
            Boolean mysteryRoulette
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, cocktailLibrary, suppliersManagement, inventoryAudit, mysteryRoulette, null);
    }

    /**
     * Backward-compatible constructor for 11 modules before mysteryRoulette was introduced.
     */
    public EstablishmentModulesUpdateRequest(
            Boolean cuisineKds,
            Boolean happyHour,
            Boolean employeeManagement,
            Boolean floorPlan,
            Boolean qrClientOrdering,
            Boolean stockTracking,
            Boolean cashDrawer,
            Boolean barTabs,
            Boolean cocktailLibrary,
            Boolean suppliersManagement,
            Boolean inventoryAudit
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, cocktailLibrary, suppliersManagement, inventoryAudit, null);
    }

    /**
     * Backward-compatible constructor for 10 modules before inventoryAudit was introduced.
     */
    public EstablishmentModulesUpdateRequest(
            Boolean cuisineKds,
            Boolean happyHour,
            Boolean employeeManagement,
            Boolean floorPlan,
            Boolean qrClientOrdering,
            Boolean stockTracking,
            Boolean cashDrawer,
            Boolean barTabs,
            Boolean cocktailLibrary,
            Boolean suppliersManagement
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, cocktailLibrary, suppliersManagement, null);
    }

    /**
     * Backward-compatible constructor for 9 modules before suppliersManagement was introduced.
     */
    public EstablishmentModulesUpdateRequest(
            Boolean cuisineKds,
            Boolean happyHour,
            Boolean employeeManagement,
            Boolean floorPlan,
            Boolean qrClientOrdering,
            Boolean stockTracking,
            Boolean cashDrawer,
            Boolean barTabs,
            Boolean cocktailLibrary
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, cocktailLibrary, null, null);
    }

    /**
     * Backward-compatible constructor for 8 modules before cocktailLibrary was introduced.
     */
    public EstablishmentModulesUpdateRequest(
            Boolean cuisineKds,
            Boolean happyHour,
            Boolean employeeManagement,
            Boolean floorPlan,
            Boolean qrClientOrdering,
            Boolean stockTracking,
            Boolean cashDrawer,
            Boolean barTabs
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, barTabs, null, null);
    }

    /**
     * Backward-compatible constructor for 7 modules before barTabs was introduced.
     */
    public EstablishmentModulesUpdateRequest(
            Boolean cuisineKds,
            Boolean happyHour,
            Boolean employeeManagement,
            Boolean floorPlan,
            Boolean qrClientOrdering,
            Boolean stockTracking,
            Boolean cashDrawer
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, cashDrawer, null, null);
    }

    /**
     * Backward-compatible constructor for 6 core modules before cashDrawer was introduced.
     */
    public EstablishmentModulesUpdateRequest(
            Boolean cuisineKds,
            Boolean happyHour,
            Boolean employeeManagement,
            Boolean floorPlan,
            Boolean qrClientOrdering,
            Boolean stockTracking
    ) {
        this(cuisineKds, happyHour, employeeManagement, floorPlan, qrClientOrdering, stockTracking, null, null, null);
    }
}

