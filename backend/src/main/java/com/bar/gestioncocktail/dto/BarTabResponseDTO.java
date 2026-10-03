package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.BarTab;
import com.bar.gestioncocktail.model.BarTabStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data Transfer Object representing summary information for a customer bar tab.
 *
 * @param id                   Unique identifier
 * @param nom                  Tab name or title
 * @param clientReference      Client contact or corporate reference
 * @param notes                Operational notes
 * @param cautionMontant       Deposit or pre-authorization amount
 * @param statut               Operational status
 * @param serveurId            Assigned waiter/bartender identifier
 * @param serveurNom           Assigned waiter/bartender display name
 * @param tableOriginaleId     Original physical table identifier (if applicable)
 * @param tableOriginaleNumero Original physical table number (if applicable)
 * @param openedAt             Creation and opening timestamp
 * @param settledAt            Settlement timestamp
 * @param total                Current cumulative consumption amount
 * @param activeOrdersCount    Number of active unbilled orders attached to this tab
 * @param itemsCount           Total quantity of active items/drinks on this tab
 */
public record BarTabResponseDTO(
        Long id,
        String nom,
        String clientReference,
        String notes,
        BigDecimal cautionMontant,
        BarTabStatus statut,
        Long serveurId,
        String serveurNom,
        Long tableOriginaleId,
        Integer tableOriginaleNumero,
        LocalDateTime openedAt,
        LocalDateTime settledAt,
        BigDecimal total,
        int activeOrdersCount,
        int itemsCount
) {

    /**
     * Converts a {@link BarTab} entity into a response DTO with calculated counts.
     *
     * @param tab               Source bar tab entity
     * @param activeOrdersCount Number of active orders
     * @param itemsCount        Total item count
     * @return Formatted response DTO
     */
    public static BarTabResponseDTO from(BarTab tab, int activeOrdersCount, int itemsCount) {
        if (tab == null) {
            return null;
        }
        Long sId = tab.getServeur() != null ? tab.getServeur().getId() : null;
        String sNom = tab.getServeur() != null ? tab.getServeur().getNom() : null;
        Long tId = tab.getTableOriginale() != null ? tab.getTableOriginale().getId() : null;
        Integer tNum = tab.getTableOriginale() != null ? tab.getTableOriginale().getNumero() : null;

        return new BarTabResponseDTO(
                tab.getId(),
                tab.getNom(),
                tab.getClientReference(),
                tab.getNotes(),
                tab.getCautionMontant(),
                tab.getStatut(),
                sId,
                sNom,
                tId,
                tNum,
                tab.getOpenedAt(),
                tab.getSettledAt(),
                tab.getTotal() != null ? tab.getTotal() : BigDecimal.ZERO,
                activeOrdersCount,
                itemsCount
        );
    }

    /**
     * Converts a {@link BarTab} entity into a response DTO defaulting counts to 0.
     *
     * @param tab Source bar tab entity
     * @return Formatted response DTO
     */
    public static BarTabResponseDTO from(BarTab tab) {
        return from(tab, 0, 0);
    }
}
