package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.FactureReglement;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Data Transfer Object representing an individual split settlement on an invoice.
 */
public record FactureReglementDTO(
    Long id,
    Long factureId,
    String nomConvive,
    Integer partIndex,
    Integer totalParts,
    BigDecimal montant,
    BigDecimal pourboire,
    BigDecimal totalRegle,
    String modePaiement,
    String typeSplit,
    List<SplitResultDTO.SplitItemDTO> items,
    LocalDateTime dateReglement
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Converts a JPA {@link FactureReglement} entity into its corresponding DTO representation.
     *
     * @param r The JPA entity
     * @return Populated FactureReglementDTO
     */
    public static FactureReglementDTO from(FactureReglement r) {
        if (r == null) return null;
        List<SplitResultDTO.SplitItemDTO> itemList = Collections.emptyList();
        if (r.getItemsJson() != null && !r.getItemsJson().isBlank()) {
            try {
                itemList = MAPPER.readValue(r.getItemsJson(), new TypeReference<List<SplitResultDTO.SplitItemDTO>>() {});
            } catch (Exception _) {
                itemList = Collections.emptyList();
            }
        }

        return new FactureReglementDTO(
            r.getId(),
            r.getFacture() != null ? r.getFacture().getId() : null,
            r.getNomConvive(),
            r.getPartIndex(),
            r.getTotalParts(),
            r.getMontant(),
            r.getPourboire() != null ? r.getPourboire() : BigDecimal.ZERO,
            r.getTotalRegle(),
            r.getModePaiement(),
            r.getTypeSplit(),
            itemList,
            r.getDateReglement()
        );
    }
}
