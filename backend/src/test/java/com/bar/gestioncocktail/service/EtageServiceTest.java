package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EtageEntity;
import com.bar.gestioncocktail.model.ZoneEntity;
import com.bar.gestioncocktail.repository.EtageRepository;
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
class EtageServiceTest {

    @Mock
    private EtageRepository etageRepository;

    @Mock
    private ZoneRepository zoneRepository;

    @InjectMocks
    private EtageService etageService;

    private EtageEntity sampleEtage;

    @BeforeEach
    void setUp() {
        sampleEtage = new EtageEntity();
        sampleEtage.setId(1L);
        sampleEtage.setCode("RDC");
        sampleEtage.setNom("Rez-de-chaussée");
        sampleEtage.setOrdre(1);
    }



    @Test
    @DisplayName("getAllEtages should return list ordered by position")
    void getAllEtages_shouldReturnList() {
        when(etageRepository.findAllByOrderByOrdreAsc()).thenReturn(List.of(sampleEtage));

        List<EtageEntity> result = etageService.getAllEtages();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("RDC");
    }

    @Test
    @DisplayName("createEtage should save when code is unique")
    void createEtage_success() {
        when(etageRepository.existsByCode("VIP")).thenReturn(false);
        when(etageRepository.save(any(EtageEntity.class))).thenAnswer(i -> i.getArgument(0));

        EtageEntity created = etageService.createEtage("VIP", "Espace VIP", 10);

        assertThat(created.getCode()).isEqualTo("VIP");
        assertThat(created.getNom()).isEqualTo("Espace VIP");
    }

    @Test
    @DisplayName("createEtage with null ordre should default to 0")
    void createEtage_nullOrdre_defaultsToZero() {
        when(etageRepository.existsByCode("VIP")).thenReturn(false);
        when(etageRepository.save(any(EtageEntity.class))).thenAnswer(i -> i.getArgument(0));

        EtageEntity created = etageService.createEtage("VIP", "Espace VIP", null);

        assertThat(created.getOrdre()).isZero();
    }

    @Test
    @DisplayName("createEtage should throw BusinessException when code exists")
    void createEtage_duplicateCode_throwsException() {
        when(etageRepository.existsByCode("RDC")).thenReturn(true);

        assertThatThrownBy(() -> etageService.createEtage("RDC", "Rez-de-chaussée", 1))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("existe déjà");
    }

    @Test
    @DisplayName("getEtageById should return etage when exists")
    void getEtageById_success() {
        when(etageRepository.findById(1L)).thenReturn(Optional.of(sampleEtage));

        EtageEntity result = etageService.getEtageById(1L);

        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getEtageById should throw ResourceNotFoundException when not found")
    void getEtageById_notFound_throwsException() {
        when(etageRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> etageService.getEtageById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("updateEtage should update fields successfully")
    void updateEtage_success() {
        when(etageRepository.findById(1L)).thenReturn(Optional.of(sampleEtage));
        when(etageRepository.save(any(EtageEntity.class))).thenAnswer(i -> i.getArgument(0));

        EtageEntity updated = etageService.updateEtage(1L, "RDC", "Rez-de-chaussée Modifié", 2);

        assertThat(updated.getNom()).isEqualTo("Rez-de-chaussée Modifié");
        assertThat(updated.getOrdre()).isEqualTo(2);
    }

    @Test
    @DisplayName("updateEtage should cascade code updates to associated zones")
    void updateEtage_codeChange_cascadesToZones() {
        ZoneEntity zone = new ZoneEntity();
        zone.setEtage("RDC");

        when(etageRepository.findById(1L)).thenReturn(Optional.of(sampleEtage));
        when(etageRepository.existsByCode("MAIN_FLOOR")).thenReturn(false);
        when(zoneRepository.findByEtage("RDC")).thenReturn(List.of(zone));
        when(etageRepository.save(any(EtageEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(zoneRepository.save(any(ZoneEntity.class))).thenAnswer(i -> i.getArgument(0));

        etageService.updateEtage(1L, "MAIN_FLOOR", "Main Floor", 1);

        verify(zoneRepository).findByEtage("RDC");
        verify(zoneRepository).save(zone);
    }

    @Test
    @DisplayName("updateEtage should throw exception when new code collides")
    void updateEtage_duplicateCode_throwsException() {
        when(etageRepository.findById(1L)).thenReturn(Optional.of(sampleEtage));
        when(etageRepository.existsByCode("EXISTING")).thenReturn(true);

        assertThatThrownBy(() -> etageService.updateEtage(1L, "EXISTING", "New Name", 1))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("existe déjà");
    }

    @Test
    @DisplayName("updateEtage should not update ordre when null")
    void updateEtage_nullOrdre_keepsExistingOrdre() {
        when(etageRepository.findById(1L)).thenReturn(Optional.of(sampleEtage));
        when(etageRepository.save(any(EtageEntity.class))).thenAnswer(i -> i.getArgument(0));

        EtageEntity updated = etageService.updateEtage(1L, "RDC", "Rez-de-chaussée Modifié", null);

        assertThat(updated.getOrdre()).isEqualTo(1);
    }

    @Test
    @DisplayName("updateEtage should throw ResourceNotFoundException when id not found")
    void updateEtage_notFound_throwsException() {
        when(etageRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> etageService.updateEtage(99L, "RDC", "Test", 1))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("deleteEtage should throw ResourceNotFoundException when id not found")
    void deleteEtage_notFound_throwsException() {
        when(etageRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> etageService.deleteEtage(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("deleteEtage should throw BusinessException if floor is assigned to zones")
    void deleteEtage_assignedToZones_throwsException() {
        when(etageRepository.findById(1L)).thenReturn(Optional.of(sampleEtage));
        when(zoneRepository.existsByEtage("RDC")).thenReturn(true);

        assertThatThrownBy(() -> etageService.deleteEtage(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("associées");

        verify(etageRepository, never()).delete(any());
    }

    @Test
    @DisplayName("deleteEtage should delete floor when no zone is assigned")
    void deleteEtage_success() {
        when(etageRepository.findById(1L)).thenReturn(Optional.of(sampleEtage));
        when(zoneRepository.existsByEtage("RDC")).thenReturn(false);

        etageService.deleteEtage(1L);

        verify(etageRepository).delete(sampleEtage);
    }
}
