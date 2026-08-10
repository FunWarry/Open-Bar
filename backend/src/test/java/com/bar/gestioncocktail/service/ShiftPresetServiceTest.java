package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.ShiftPresetDTO;
import com.bar.gestioncocktail.model.ShiftPreset;
import com.bar.gestioncocktail.model.TypeShift;
import com.bar.gestioncocktail.repository.ShiftPresetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShiftPresetServiceTest {

    @Mock
    private ShiftPresetRepository presetRepository;

    @InjectMocks
    private ShiftPresetService presetService;

    private ShiftPreset samplePreset;

    @BeforeEach
    void setUp() {
        samplePreset = new ShiftPreset(TypeShift.MATIN, "Service Matin", "08:00", "16:00", 30);
        samplePreset.setId(1L);
    }

    @Test
    void getAllPresets_WhenNotEmpty_ShouldReturnList() {
        when(presetRepository.count()).thenReturn(1L);
        when(presetRepository.findAll()).thenReturn(List.of(samplePreset));

        List<ShiftPresetDTO> result = presetService.getAllPresets();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).typeShift()).isEqualTo(TypeShift.MATIN);
        assertThat(result.get(0).heureDebut()).isEqualTo("08:00");
    }

    @Test
    void getAllPresets_WhenEmpty_ShouldPopulateDefaults() {
        when(presetRepository.count()).thenReturn(0L);
        when(presetRepository.findAll()).thenReturn(List.of(samplePreset));

        List<ShiftPresetDTO> result = presetService.getAllPresets();

        assertThat(result).hasSize(1);
        verify(presetRepository, atLeastOnce()).save(any(ShiftPreset.class));
    }

    @Test
    void getPresetByType_WhenNotFound_ShouldReturnNull() {
        when(presetRepository.findByTypeShift(TypeShift.NUIT)).thenReturn(Optional.empty());

        ShiftPresetDTO dto = presetService.getPresetByType(TypeShift.NUIT);

        assertThat(dto).isNull();
    }

    @Test
    void updatePreset_WhenPresetNotFound_ShouldCreateAndSave() {
        ShiftPresetDTO input = new ShiftPresetDTO(null, TypeShift.NUIT, "Nuit", "22:00", "06:00", 30);
        when(presetRepository.findByTypeShift(TypeShift.NUIT)).thenReturn(Optional.empty());
        when(presetRepository.save(any(ShiftPreset.class))).thenAnswer(i -> i.getArgument(0));

        ShiftPresetDTO updated = presetService.updatePreset(TypeShift.NUIT, input);

        assertThat(updated.nom()).isEqualTo("Nuit");
        assertThat(updated.typeShift()).isEqualTo(TypeShift.NUIT);
        verify(presetRepository).save(any(ShiftPreset.class));
    }

    @Test
    void initDefaultPresets_ShouldSaveDefaults() {
        when(presetRepository.findByTypeShift(any())).thenReturn(Optional.empty());

        presetService.initDefaultPresets();

        verify(presetRepository, times(5)).save(any(ShiftPreset.class));
    }
}

