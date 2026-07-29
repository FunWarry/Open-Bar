package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Facture;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * DTO de réponse représentant une facture émise.
 */
@Schema(description = "Représentation DTO d'une facture")
public record FactureResponseDTO(
    Long id,
    Long tableId,
    Integer tableNumero,
    String numero,
    BigDecimal total,
    BigDecimal totalHT,
    BigDecimal totalVAT,
    BigDecimal pourboire,
    BigDecimal totalTTC,
    LocalDateTime dateFacture,
    LocalDateTime dateReglement,
    boolean reglee,
    String modePaiement,
    String notes,
    List<FactureItemResponseDTO> items,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Convertit une entité {@link Facture} en DTO de réponse.
     *
     * @param f L'entité facture
     * @return Le DTO correspondant
     */
    public static FactureResponseDTO from(Facture f) {
        List<FactureItemResponseDTO> items = f.getItems() != null
            ? f.getItems().stream().map(FactureItemResponseDTO::from).toList()
            : Collections.emptyList();
        return new FactureResponseDTO(
            f.getId(),
            f.getTable() != null ? f.getTable().getId() : null,
            f.getTable() != null ? f.getTable().getNumero() : null,
            f.getNumero(),
            f.getTotal(),
            f.getTotalHT(),
            f.getTotalVAT(),
            f.getPourboire(),
            f.getTotalTTC(),
            f.getDateFacture(),
            f.getDateReglement(),
            f.isReglee(),
            f.getModePaiement(),
            f.getNotes(),
            items,
            f.getCreatedAt(),
            f.getUpdatedAt()
        );
    }
}
