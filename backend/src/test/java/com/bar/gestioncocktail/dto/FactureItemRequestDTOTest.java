package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.FactureItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class FactureItemRequestDTOTest {

    @Test
    @DisplayName("toEntity - should map all fields to a FactureItem entity")
    void toEntity_mapsAllFields() {
        FactureItemRequestDTO dto = new FactureItemRequestDTO(
            5L, "Mojito x2", 2, new BigDecimal("8.50"), "sans sucre"
        );

        FactureItem item = dto.toEntity();

        assertThat(item).isNotNull();
        assertThat(item.getCommandeItem()).isNotNull();
        assertThat(item.getCommandeItem().getId()).isEqualTo(5L);
        assertThat(item.getDescription()).isEqualTo("Mojito x2");
        assertThat(item.getQuantite()).isEqualTo(2);
        assertThat(item.getPrixUnitaire()).isEqualByComparingTo(new BigDecimal("8.50"));
        assertThat(item.getTotal()).isEqualByComparingTo(new BigDecimal("17.00"));
        assertThat(item.getNotes()).isEqualTo("sans sucre");
    }

    @Test
    @DisplayName("toEntity - should handle null commandeItemId gracefully")
    void toEntity_nullCommandeItemId_skipsRelation() {
        FactureItemRequestDTO dto = new FactureItemRequestDTO(
            null, "Eau plate", 1, new BigDecimal("2.00"), null
        );

        FactureItem item = dto.toEntity();

        assertThat(item.getCommandeItem()).isNull();
        assertThat(item.getTotal()).isEqualByComparingTo(new BigDecimal("2.00"));
    }

    @Test
    @DisplayName("toEntity - should handle null prixUnitaire without computing total")
    void toEntity_nullPrixUnitaire_doesNotComputeTotal() {
        FactureItemRequestDTO dto = new FactureItemRequestDTO(
            1L, "Article test", 3, null, null
        );

        FactureItem item = dto.toEntity();

        assertThat(item.getPrixUnitaire()).isNull();
        assertThat(item.getTotal()).isNull();
    }
}
