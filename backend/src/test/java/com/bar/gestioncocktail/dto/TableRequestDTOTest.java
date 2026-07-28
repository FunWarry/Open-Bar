package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TableRequestDTOTest {

    @Test
    @DisplayName("toEntity - should map all fields to a TableEntity")
    void toEntity_mapsAllFields() {
        TableRequestDTO dto = new TableRequestDTO(
            12, 4, TableZone.TERASSE, 150.0, 200.0, 90.0, "ROND"
        );

        TableEntity entity = dto.toEntity();

        assertThat(entity).isNotNull();
        assertThat(entity.getNumero()).isEqualTo(12);
        assertThat(entity.getCapacite()).isEqualTo(4);
        assertThat(entity.getZone()).isEqualTo(TableZone.TERASSE);
        assertThat(entity.getPlanX()).isEqualTo(150.0);
        assertThat(entity.getPlanY()).isEqualTo(200.0);
        assertThat(entity.getPlanRotation()).isEqualTo(90.0);
        assertThat(entity.getPlanForme()).isEqualTo("ROND");
    }

    @Test
    @DisplayName("toEntity - should handle null optional plan fields gracefully")
    void toEntity_nullPlanFields_usesDefaults() {
        TableRequestDTO dto = new TableRequestDTO(
            1, 2, TableZone.INTERIEUR, null, null, null, null
        );

        TableEntity entity = dto.toEntity();

        assertThat(entity.getNumero()).isEqualTo(1);
        assertThat(entity.getCapacite()).isEqualTo(2);
        assertThat(entity.getPlanRotation()).isEqualTo(0.0);
        assertThat(entity.getPlanForme()).isEqualTo("CARRE");
    }
}
