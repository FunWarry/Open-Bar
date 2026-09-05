package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailIngredient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class CocktailIngredientRequestDTOTest {

    @Test
    @DisplayName("toEntity - should map all fields to a CocktailIngredient entity")
    void toEntity_mapsAllFields() {
        CocktailIngredientRequestDTO dto = new CocktailIngredientRequestDTO(
            1L, 2L, new BigDecimal("4.00"), "Fresh leaves only"
        );

        CocktailIngredient entity = dto.toEntity();

        assertThat(entity).isNotNull();
        assertThat(entity.getCocktail()).isNotNull();
        assertThat(entity.getCocktail().getId()).isEqualTo(1L);
        assertThat(entity.getIngredient()).isNotNull();
        assertThat(entity.getIngredient().getId()).isEqualTo(2L);
        assertThat(entity.getQuantite()).isEqualByComparingTo(new BigDecimal("4.00"));
        assertThat(entity.getNotes()).isEqualTo("Fresh leaves only");
    }

    @Test
    @DisplayName("toEntity - should handle null IDs gracefully")
    void toEntity_nullIds_handlesNulls() {
        CocktailIngredientRequestDTO dto = new CocktailIngredientRequestDTO(
            null, null, new BigDecimal("1.00"), null
        );

        CocktailIngredient entity = dto.toEntity();

        assertThat(entity.getCocktail()).isNull();
        assertThat(entity.getIngredient()).isNull();
        assertThat(entity.getQuantite()).isEqualByComparingTo(new BigDecimal("1.00"));
    }
}
