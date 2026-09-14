package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.FactureItem;
import java.math.BigDecimal;
/**
 * Response DTO representing an individual billed item on an invoice.
 */

public record FactureItemResponseDTO(
    Long id,
    Long factureId,
    Long commandeItemId,
    String description,
    int quantite,
    BigDecimal prixUnitaire,
    BigDecimal total,
    String vatRate,
    BigDecimal priceHT,
    BigDecimal vatAmount,
    String notes,
    String guestName
) {
    /**
     * Backward-compatible 11-parameter constructor.
     */
    public FactureItemResponseDTO(
        Long id,
        Long factureId,
        Long commandeItemId,
        String description,
        int quantite,
        BigDecimal prixUnitaire,
        BigDecimal total,
        String vatRate,
        BigDecimal priceHT,
        BigDecimal vatAmount,
        String notes
    ) {
        this(id, factureId, commandeItemId, description, quantite, prixUnitaire, total, vatRate, priceHT, vatAmount, notes, null);
    }

    public static FactureItemResponseDTO from(FactureItem fi) {
        String guest = fi.getGuestName();
        if ((guest == null || guest.isBlank()) && fi.getNotes() != null) {
            guest = extractGuestFromNotes(fi.getNotes());
        }
        return new FactureItemResponseDTO(
            fi.getId(),
            fi.getFacture() != null ? fi.getFacture().getId() : null,
            fi.getCommandeItem() != null ? fi.getCommandeItem().getId() : null,
            fi.getDescription(),
            fi.getQuantite(),
            fi.getPrixUnitaire(),
            fi.getTotal(),
            fi.getVatRate() != null ? fi.getVatRate().getLabel() : "20%",
            fi.getPriceHT(),
            fi.getVatAmount(),
            fi.getNotes(),
            guest
        );
    }

    private static String extractGuestFromNotes(String notes) {
        if (notes == null || !notes.startsWith("[")) {
            return null;
        }
        int endIdx = notes.indexOf(']');
        if (endIdx > 1) {
            return notes.substring(1, endIdx).trim();
        }
        return null;
    }
}
