package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EtageEntity;
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
    @DisplayName("initDefaultEtages should seed database if count is 0")
    void initDefaultEtages_whenEmpty_shouldSeed() {
        when(etageRepository.count()).thenReturn(0L);

        etageService.initDefaultEtages();

        verify(etageRepository, times(5)).save(any(EtageEntity.class));
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
    @DisplayName("createEtage should throw BusinessException when code exists")
    void createEtage_duplicateCode_throwsException() {
        when(etageRepository.existsByCode("RDC")).thenReturn(true);

        assertThatThrownBy(() -> etageService.createEtage("RDC", "Rez-de-chaussée", 1))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("existe déjà");
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
