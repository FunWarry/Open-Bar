package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TableEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class TableResponseDTOTest {

    @Test
    @DisplayName("from - should return null when input entity is null")
    void from_nullEntity_returnsNull() {
        TableResponseDTO result = TableResponseDTO.from(null);
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("from - should correctly map all fields from TableEntity")
    void from_validEntity_mapsAllFields() {
        TableEntity entity = new TableEntity();
        entity.setId(10L);
        entity.setNumero(5);
        entity.setCapacite(4);
        entity.setZone("TERRASSE");
        entity.setOccupee(true);
        entity.setServeurId(2L);
        LocalDateTime now = LocalDateTime.now();
        entity.setDateOccupation(now);
        entity.setDateLiberation(now.plusHours(1));
        entity.setCreatedAt(now.minusDays(1));
        entity.setUpdatedAt(now);

        TableResponseDTO result = TableResponseDTO.from(entity);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.numero()).isEqualTo(5);
        assertThat(result.capacite()).isEqualTo(4);
        assertThat(result.zone()).isEqualTo("TERRASSE");
        assertThat(result.occupee()).isTrue();
        assertThat(result.serveurId()).isEqualTo(2L);
        assertThat(result.dateOccupation()).isEqualTo(now);
        assertThat(result.dateLiberation()).isEqualTo(now.plusHours(1));
        assertThat(result.createdAt()).isEqualTo(now.minusDays(1));
        assertThat(result.updatedAt()).isEqualTo(now);
    }
}
