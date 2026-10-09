package com.bar.gestioncocktail.dto;

/**
 * Request payload to finalize an entire checklist run session.
 *
 * @param notes Optional closing comments or handover notes
 */
public record CompleteChecklistRunRequest(
        String notes
) {
}
