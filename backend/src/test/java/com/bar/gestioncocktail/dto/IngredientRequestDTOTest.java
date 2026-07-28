package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Ingredient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class IngredientRequestDTOTest {

    @Test
    @DisplayName("toEntity - should map all fields to an Ingredient entity")
    void toEntity_mapsAllFields() {
        LocalDateTime peremption = LocalDateTime.now().plusDays(30);

        IngredientRequestDTO dto = new IngredientRequestDTO(
            "Rhum Blanc", "cl", new BigDecimal("1000.00"), new BigDecimal("100.00"),
            "LOT-1234", peremption, new BigDecimal("15.00"), "Bacardi", "Keep cool"
        );

        Ingredient entity = dto.toEntity();

        assertThat(entity).isNotNull();
        assertThat(entity.getNom()).isEqualTo("Rhum Blanc");
        assertThat(entity.getUniteMesure()).isEqualTo("cl");
        assertThat(entity.getQuantiteStock()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(entity.getSeuilAlerte()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(entity.getNumeroLot()).isEqualTo("LOT-1234");
        assertThat(entity.getDatePeremption()).isEqualTo(peremption);
        assertThat(entity.getPrixUnitaire()).isEqualByComparingTo(new BigDecimal("15.00"));
        assertThat(entity.getFournisseur()).isEqualTo("Bacardi");
        assertThat(entity.getNotes()).isEqualTo("Keep cool");
    }
}
