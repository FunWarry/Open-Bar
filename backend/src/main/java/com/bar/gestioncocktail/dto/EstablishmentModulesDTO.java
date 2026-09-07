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
 */
public record EstablishmentModulesDTO(
        boolean cuisineKds,
        boolean happyHour,
        boolean employeeManagement,
        boolean floorPlan,
        boolean qrClientOrdering,
        boolean stockTracking
) {

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
                config.getModuleStockTrackingEnabled() == null || config.getModuleStockTrackingEnabled()
        );
    }

    /**
     * Returns a default configuration where all modules are fully enabled.
     *
     * @return New instance with all flags set to true
     */
    public static EstablishmentModulesDTO defaultEnabled() {
        return new EstablishmentModulesDTO(true, true, true, true, true, true);
    }
}
