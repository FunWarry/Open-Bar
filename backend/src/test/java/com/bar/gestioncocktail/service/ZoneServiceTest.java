package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.ZoneEntity;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.repository.ZoneRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ZoneServiceTest {

    @Mock
    private ZoneRepository zoneRepository;

    @Mock
    private TableRepository tableRepository;

    @InjectMocks
    private ZoneService zoneService;

    private ZoneEntity zone;

    @BeforeEach
    void setUp() {
        zone = new ZoneEntity();
        zone.setId(1L);
        zone.setNom("Terrasse");
        zone.setCouleur("#123456");
        zone.setPlanX(100.0);
        zone.setPlanY(200.0);
        zone.setPlanWidth(300.0);
        zone.setPlanHeight(400.0);
        zone.setShapeType("RECTANGLE");
        zone.setPointsJson("[]");
        zone.setCornerRadiiJson("[0,0,0,0]");
    }

    @Test
    @DisplayName("getAllZones - returns all zones from repository")
    void getAllZones_returnsList() {
        when(zoneRepository.findAll()).thenReturn(List.of(zone));

        List<ZoneEntity> result = zoneService.getAllZones();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNom()).isEqualTo("Terrasse");
    }

    @Test
    @DisplayName("getZoneById - returns zone when exists")
    void getZoneById_found_returnsZone() {
        when(zoneRepository.findById(1L)).thenReturn(Optional.of(zone));

        ZoneEntity result = zoneService.getZoneById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getZoneById - throws ResourceNotFoundException when null or not found")
    void getZoneById_notFound_throwsException() {
        assertThatThrownBy(() -> zoneService.getZoneById(null))
                .isInstanceOf(ResourceNotFoundException.class);

        when(zoneRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> zoneService.getZoneById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("createZone - creates zone successfully when name is unique")
    void createZone_success() {
        when(zoneRepository.existsByNom("Terrasse")).thenReturn(false);
        when(zoneRepository.save(zone)).thenReturn(zone);

        ZoneEntity created = zoneService.createZone(zone);

        assertThat(created).isNotNull();
        verify(zoneRepository).save(zone);
    }

    @Test
    @DisplayName("createZone - throws BusinessException when name already exists")
    void createZone_duplicateName_throwsException() {
        when(zoneRepository.existsByNom("Terrasse")).thenReturn(true);

        assertThatThrownBy(() -> zoneService.createZone(zone))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    @DisplayName("updateZone - updates all properties and syncs assigned tables")
    void updateZone_success_updatesTables() {
        ZoneEntity updated = new ZoneEntity();
        updated.setNom("Veranda");
        updated.setEtage("Etage 1");
        updated.setPlanX(150.0);
        updated.setPlanY(250.0);
        updated.setPlanWidth(350.0);
        updated.setPlanHeight(450.0);
        updated.setShapeType("POLYGON");
        updated.setPointsJson("[1,2,3,4]");
        updated.setCornerRadiiJson("[5,5,5,5]");
        updated.setCouleur("#654321");

        TableEntity table = new TableEntity();
        table.setId(10L);
        table.setZone("Terrasse");

        when(zoneRepository.findById(1L)).thenReturn(Optional.of(zone));
        when(zoneRepository.existsByNom("Veranda")).thenReturn(false);
        when(zoneRepository.save(any(ZoneEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tableRepository.findByZone("Terrasse")).thenReturn(List.of(table));

        ZoneEntity result = zoneService.updateZone(1L, updated);

        assertThat(result.getNom()).isEqualTo("Veranda");
        assertThat(result.getPlanX()).isEqualTo(150.0);
        assertThat(result.getShapeType()).isEqualTo("POLYGON");
        verify(tableRepository).save(table);
        assertThat(table.getZone()).isEqualTo("Veranda");
    }

    @Test
    @DisplayName("updateZone - throws BusinessException for null id or duplicate name")
    void updateZone_errors() {
        assertThatThrownBy(() -> zoneService.updateZone(null, zone))
                .isInstanceOf(BusinessException.class);

        when(zoneRepository.findById(1L)).thenReturn(Optional.of(zone));
        when(zoneRepository.existsByNom("Bar Central")).thenReturn(true);

        ZoneEntity duplicate = new ZoneEntity();
        duplicate.setNom("Bar Central");

        assertThatThrownBy(() -> zoneService.updateZone(1L, duplicate))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("deleteZone - deletes zone when exists")
    void deleteZone_success() {
        when(zoneRepository.findById(1L)).thenReturn(Optional.of(zone));

        zoneService.deleteZone(1L);

        verify(zoneRepository).delete(zone);
    }

    @Test
    @DisplayName("deleteZone - throws exception when id is null or not found")
    void deleteZone_errors() {
        assertThatThrownBy(() -> zoneService.deleteZone(null))
                .isInstanceOf(BusinessException.class);

        when(zoneRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> zoneService.deleteZone(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
