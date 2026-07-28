package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Facture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class FactureRequestDTOTest {

    @Test
    @DisplayName("toEntity - should map all fields to a Facture entity")
    void toEntity_mapsAllFields() {
        FactureRequestDTO dto = new FactureRequestDTO(
            3L, "Table VIP", new BigDecimal("5.00"), "CB"
        );

        Facture facture = dto.toEntity();

        assertThat(facture).isNotNull();
        assertThat(facture.getTable()).isNotNull();
        assertThat(facture.getTable().getId()).isEqualTo(3L);
        assertThat(facture.getNotes()).isEqualTo("Table VIP");
        assertThat(facture.getPourboire()).isEqualByComparingTo(new BigDecimal("5.00"));
        assertThat(facture.getModePaiement()).isEqualTo("CB");
    }

    @Test
    @DisplayName("toEntity - should handle null tableId gracefully")
    void toEntity_nullTableId_skipsTableRelation() {
        FactureRequestDTO dto = new FactureRequestDTO(
            null, null, null, null
        );

        Facture facture = dto.toEntity();

        assertThat(facture.getTable()).isNull();
        assertThat(facture.getNotes()).isNull();
        assertThat(facture.getPourboire()).isNull();
        assertThat(facture.getModePaiement()).isNull();
    }
}
