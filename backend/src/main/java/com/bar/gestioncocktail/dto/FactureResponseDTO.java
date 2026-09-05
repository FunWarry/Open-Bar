package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Facture;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Response DTO representing an issued invoice.
 */
@Schema(description = "DTO representation of an invoice")
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
    List<FactureReglementDTO> reglements,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Converts a {@link Facture} entity into a response DTO.
     *
     * @param f Source invoice entity
     * @return Corresponding response DTO
     */
    public static FactureResponseDTO from(Facture f) {
        List<FactureItemResponseDTO> items = (f.getItems() != null && org.hibernate.Hibernate.isInitialized(f.getItems()))
            ? f.getItems().stream().map(FactureItemResponseDTO::from).toList()
            : Collections.emptyList();
        List<FactureReglementDTO> reglements = (f.getReglements() != null && org.hibernate.Hibernate.isInitialized(f.getReglements()))
            ? f.getReglements().stream().map(FactureReglementDTO::from).toList()
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
            reglements,
            f.getCreatedAt(),
            f.getUpdatedAt()
        );
    }
}
