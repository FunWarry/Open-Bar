package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailGlass;
import com.bar.gestioncocktail.model.Glassware;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class CocktailGlassDTOTest {

    @Test
    @DisplayName("CocktailGlassResponseDTO.from - maps entity correctly with glassware projection")
    void mapsEntityCorrectly() {
        Glassware glass = new Glassware();
        glass.setId(10L);
        glass.setNom("Shot de Prosecco");
        glass.setContenanceCl(BigDecimal.valueOf(5.0));
        glass.setImageUrl("shot.png");

        Cocktail cocktail = new Cocktail();
        cocktail.setId(5L);

        CocktailGlass entity = new CocktailGlass();
        entity.setId(1L);
        entity.setCocktail(cocktail);
        entity.setGlassware(glass);
        entity.setGlassOrder(2);
        entity.setRoleLabel("Accompagnement");
        entity.setPrimary(false);
        entity.setCreatedAt(LocalDateTime.of(2026, 1, 1, 12, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 1, 1, 12, 30));

        CocktailGlassResponseDTO dto = CocktailGlassResponseDTO.from(entity);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.cocktailId()).isEqualTo(5L);
        assertThat(dto.glassware()).isNotNull();
        assertThat(dto.glassware().id()).isEqualTo(10L);
        assertThat(dto.glassware().nom()).isEqualTo("Shot de Prosecco");
        assertThat(dto.glassware().contenanceCl()).isEqualTo(BigDecimal.valueOf(5.0));
        assertThat(dto.glassware().imageUrl()).isEqualTo("shot.png");
        assertThat(dto.glassOrder()).isEqualTo(2);
        assertThat(dto.roleLabel()).isEqualTo("Accompagnement");
        assertThat(dto.isPrimary()).isFalse();
    }

    @Test
    @DisplayName("CocktailGlassResponseDTO.from - handles null glassware and null entity gracefully")
    void handlesNullGracefully() {
        assertThat(CocktailGlassResponseDTO.from(null)).isNull();

        CocktailGlass entityWithoutGlass = new CocktailGlass();
        entityWithoutGlass.setId(2L);
        entityWithoutGlass.setGlassOrder(1);
        entityWithoutGlass.setPrimary(true);

        CocktailGlassResponseDTO dto = CocktailGlassResponseDTO.from(entityWithoutGlass);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(2L);
        assertThat(dto.glassware()).isNull();
        assertThat(dto.isPrimary()).isTrue();
    }

    @Test
    @DisplayName("CocktailGlassRequestDTO - records constructor and values")
    void requestDtoRecordsValues() {
        CocktailGlassRequestDTO request = new CocktailGlassRequestDTO(10L, 2, "Shot", false);

        assertThat(request.glasswareId()).isEqualTo(10L);
        assertThat(request.glassOrder()).isEqualTo(2);
        assertThat(request.roleLabel()).isEqualTo("Shot");
        assertThat(request.isPrimary()).isFalse();
    }
}
