package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailVariante;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class CocktailVarianteRequestDTOTest {

    @Test
    @DisplayName("toEntity - should map all fields to a CocktailVariante entity")
    void toEntity_mapsAllFields() {
        CocktailVarianteRequestDTO dto = new CocktailVarianteRequestDTO(
            10L, "XL", "Extra large size", new BigDecimal("2.00"),
            new BigDecimal("1.5"), true, "Use big glass"
        );

        CocktailVariante entity = dto.toEntity();

        assertThat(entity).isNotNull();
        assertThat(entity.getCocktail()).isNotNull();
        assertThat(entity.getCocktail().getId()).isEqualTo(10L);
        assertThat(entity.getNom()).isEqualTo("XL");
        assertThat(entity.getDescription()).isEqualTo("Extra large size");
        assertThat(entity.getPrixSupplement()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(entity.getMultiplicateurIngredient()).isEqualByComparingTo(new BigDecimal("1.5"));
        assertThat(entity.isDisponible()).isTrue();
        assertThat(entity.getInstructions()).isEqualTo("Use big glass");
    }

    @Test
    @DisplayName("toEntity - should handle null cocktailId and null multiplicateur gracefully")
    void toEntity_nullCocktailId_handlesNulls() {
        CocktailVarianteRequestDTO dto = new CocktailVarianteRequestDTO(
            null, "Sans Alcool", null, null, null, false, null
        );

        CocktailVariante entity = dto.toEntity();

        assertThat(entity.getCocktail()).isNull();
        assertThat(entity.getNom()).isEqualTo("Sans Alcool");
        assertThat(entity.getMultiplicateurIngredient()).isEqualByComparingTo(BigDecimal.ONE);
    }
}
