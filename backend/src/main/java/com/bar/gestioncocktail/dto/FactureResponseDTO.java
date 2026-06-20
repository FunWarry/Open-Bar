package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Facture;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

public record FactureResponseDTO(
    Long id,
    Long tableId,
    Integer tableNumero,
    String numero,
    BigDecimal total,
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
    public static FactureResponseDTO from(Facture f) {
        List<FactureItemResponseDTO> items = f.getItems() != null
            ? f.getItems().stream().map(FactureItemResponseDTO::from).toList()
            : Collections.emptyList();
        return new FactureResponseDTO(
            f.getId(),
            f.getTable().getId(),
            f.getTable().getNumero(),
            f.getNumero(),
            f.getTotal(),
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
