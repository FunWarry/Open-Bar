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
 */
public record EstablishmentModulesUpdateRequest(
        Boolean cuisineKds,
        Boolean happyHour,
        Boolean employeeManagement,
        Boolean floorPlan,
        Boolean qrClientOrdering,
        Boolean stockTracking
) {
}
