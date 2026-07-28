package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Commande;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class CommandeRequestDTOTest {

    @Test
    @DisplayName("toEntity - should map all fields to a Commande entity")
    void toEntity_mapsAllFields() {
        CommandeRequestDTO dto = new CommandeRequestDTO(
            5L, 2L, "Pressing urgent", new BigDecimal("3.00")
        );

        Commande entity = dto.toEntity();

        assertThat(entity).isNotNull();
        assertThat(entity.getTable()).isNotNull();
        assertThat(entity.getTable().getId()).isEqualTo(5L);
        assertThat(entity.getServeur()).isNotNull();
        assertThat(entity.getServeur().getId()).isEqualTo(2L);
        assertThat(entity.getNotes()).isEqualTo("Pressing urgent");
        assertThat(entity.getPourboire()).isEqualByComparingTo(new BigDecimal("3.00"));
    }

    @Test
    @DisplayName("toEntity - should handle null tableId and serveurId gracefully")
    void toEntity_nullRelations_handlesNulls() {
        CommandeRequestDTO dto = new CommandeRequestDTO(
            null, null, null, null
        );

        Commande entity = dto.toEntity();

        assertThat(entity.getTable()).isNull();
        assertThat(entity.getServeur()).isNull();
        assertThat(entity.getNotes()).isNull();
        assertThat(entity.getPourboire()).isNull();
    }
}
