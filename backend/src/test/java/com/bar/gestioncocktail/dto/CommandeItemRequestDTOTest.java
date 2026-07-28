package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CommandeItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class CommandeItemRequestDTOTest {

    @Test
    @DisplayName("toEntity - should map all fields to a CommandeItem entity")
    void toEntity_mapsAllFields() {
        CommandeItemRequestDTO dto = new CommandeItemRequestDTO(
            1L, 3L, 2, new BigDecimal("9.00"), "Extra ice", true
        );

        CommandeItem entity = dto.toEntity();

        assertThat(entity).isNotNull();
        assertThat(entity.getCocktail()).isNotNull();
        assertThat(entity.getCocktail().getId()).isEqualTo(1L);
        assertThat(entity.getVariante()).isNotNull();
        assertThat(entity.getVariante().getId()).isEqualTo(3L);
        assertThat(entity.getQuantite()).isEqualTo(2);
        assertThat(entity.getPrixUnitaire()).isEqualByComparingTo(new BigDecimal("9.00"));
        assertThat(entity.getNotes()).isEqualTo("Extra ice");
        assertThat(entity.isPrioritaire()).isTrue();
    }

    @Test
    @DisplayName("toEntity - should handle null varianteId gracefully")
    void toEntity_nullVarianteId_handlesNulls() {
        CommandeItemRequestDTO dto = new CommandeItemRequestDTO(
            1L, null, 1, new BigDecimal("8.00"), null, false
        );

        CommandeItem entity = dto.toEntity();

        assertThat(entity.getCocktail()).isNotNull();
        assertThat(entity.getVariante()).isNull();
        assertThat(entity.isPrioritaire()).isFalse();
    }
}
