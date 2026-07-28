package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class CocktailRequestDTOTest {

    @Test
    @DisplayName("toEntity - should map all fields to a Cocktail entity")
    void toEntity_mapsAllFields() {
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusMonths(3);

        CocktailRequestDTO dto = new CocktailRequestDTO(
            "Mojito", "Fresh mint cocktail", new BigDecimal("8.50"),
            CocktailCategorie.ALCOOLISE, true, true, start, end, 5, 8
        );

        Cocktail entity = dto.toEntity();

        assertThat(entity).isNotNull();
        assertThat(entity.getNom()).isEqualTo("Mojito");
        assertThat(entity.getDescription()).isEqualTo("Fresh mint cocktail");
        assertThat(entity.getPrix()).isEqualByComparingTo(new BigDecimal("8.50"));
        assertThat(entity.getCategorie()).isEqualTo(CocktailCategorie.ALCOOLISE);
        assertThat(entity.isDisponible()).isTrue();
        assertThat(entity.isSaisonnier()).isTrue();
        assertThat(entity.getDateDebutSaison()).isEqualTo(start);
        assertThat(entity.getDateFinSaison()).isEqualTo(end);
        assertThat(entity.getMoisDebut()).isEqualTo(5);
        assertThat(entity.getMoisFin()).isEqualTo(8);
    }
}
