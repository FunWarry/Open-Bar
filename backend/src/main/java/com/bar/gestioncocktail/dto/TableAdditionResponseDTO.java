package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Data transfer object representing the complete bill breakdown and active orders summary for a table.
 *
 * @param tableId            Unique identifier of the table
 * @param tableNumero        Table numbering identifier
 * @param zone               Floor zone name (e.g. Salle, Terrasse)
 * @param serveurId          Assigned server identifier
 * @param serveurNom         Assigned server display name
 * @param dateOccupation     Timestamp when the table was occupied
 * @param items              Aggregated list of ordered and delivered items
 * @param commandeIds        List of active order identifiers associated with this table
 * @param totalHT            Total amount before tax (HT)
 * @param totalVAT           Total VAT amount across all items
 * @param totalTTC           Net total amount due (TTC) in EUR
 * @param nombreArticles     Total count of physical articles
 * @param hasUnpaidFacture   Whether an unpaid invoice is already generated
 * @param existingFactureId  ID of the existing unpaid invoice if present
 */
@Schema(description = "Detailed bill summary and active orders for a table")
public record TableAdditionResponseDTO(
    Long tableId,
    Integer tableNumero,
    String zone,
    Long serveurId,
    String serveurNom,
    LocalDateTime dateOccupation,
    List<TableAdditionItemDTO> items,
    List<Long> commandeIds,
    BigDecimal totalHT,
    BigDecimal totalVAT,
    BigDecimal totalTTC,
    int nombreArticles,
    boolean hasUnpaidFacture,
    Long existingFactureId
) {
}
