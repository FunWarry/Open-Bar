package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.RecipeStepTemplateRequestDTO;
import com.bar.gestioncocktail.dto.RecipeStepTemplateResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.RecipeStepActionType;
import com.bar.gestioncocktail.model.RecipeStepTemplate;
import com.bar.gestioncocktail.repository.RecipeStepTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit test suite for {@link RecipeStepTemplateService}.
 */
@ExtendWith(MockitoExtension.class)
class RecipeStepTemplateServiceTest {

    @Mock
    private RecipeStepTemplateRepository templateRepository;

    @Mock
    private TimeService timeService;

    @InjectMocks
    private RecipeStepTemplateService templateService;

    private RecipeStepTemplate template;
    private final LocalDateTime fixedNow = LocalDateTime.of(2026, Month.AUGUST, 16, 12, 0, 0);

    @BeforeEach
    void setUp() {
        template = new RecipeStepTemplate();
        template.setId(1L);
        template.setName("Shaker énergiquement");
        template.setActionType(RecipeStepActionType.SHAKE);
        template.setDefaultDurationSeconds(15);
        template.setIcon("wine-outline");
        template.setDescription("Shaker vigoureusement avec glace");
        template.setPredefined(false);
        template.setCreatedAt(fixedNow);
        template.setUpdatedAt(fixedNow);
    }

    @Test
    @DisplayName("getAllTemplates - returns all templates mapped to DTOs")
    void getAllTemplates_returnsAllTemplates() {
        when(templateRepository.findAllByOrderByNameAsc()).thenReturn(List.of(template));

        List<RecipeStepTemplateResponseDTO> result = templateService.getAllTemplates();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Shaker énergiquement");
        assertThat(result.get(0).actionType()).isEqualTo(RecipeStepActionType.SHAKE);
        verify(templateRepository).findAllByOrderByNameAsc();
    }

    @Test
    @DisplayName("getTemplatesByActionType - filters by action type")
    void getTemplatesByActionType_filtersCorrectly() {
        when(templateRepository.findByActionType(RecipeStepActionType.SHAKE)).thenReturn(List.of(template));

        List<RecipeStepTemplateResponseDTO> result = templateService.getTemplatesByActionType(RecipeStepActionType.SHAKE);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).actionType()).isEqualTo(RecipeStepActionType.SHAKE);
        verify(templateRepository).findByActionType(RecipeStepActionType.SHAKE);
    }

    @Test
    @DisplayName("getTemplateById - returns template when found")
    void getTemplateById_found_returnsDTO() {
        when(templateRepository.findById(1L)).thenReturn(Optional.of(template));

        RecipeStepTemplateResponseDTO result = templateService.getTemplateById(1L);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.name()).isEqualTo("Shaker énergiquement");
    }

    @Test
    @DisplayName("getTemplateById - throws ResourceNotFoundException when missing")
    void getTemplateById_notFound_throwsException() {
        when(templateRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> templateService.getTemplateById(99L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("99");
    }

    @Test
    @DisplayName("createTemplate - saves and returns new template")
    void createTemplate_savesAndReturns() {
        when(timeService.now()).thenReturn(fixedNow);
        when(templateRepository.save(any(RecipeStepTemplate.class))).thenAnswer(invocation -> {
            RecipeStepTemplate t = invocation.getArgument(0);
            t.setId(10L);
            return t;
        });

        RecipeStepTemplateRequestDTO request = new RecipeStepTemplateRequestDTO(
            "Piler",
            RecipeStepActionType.MUDDLE,
            15,
            "hammer-outline",
            "Piler délicatement",
            false
        );

        RecipeStepTemplateResponseDTO result = templateService.createTemplate(request);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.name()).isEqualTo("Piler");
        assertThat(result.actionType()).isEqualTo(RecipeStepActionType.MUDDLE);
        verify(templateRepository).save(any(RecipeStepTemplate.class));
    }

    @Test
    @DisplayName("updateTemplate - updates existing template")
    void updateTemplate_found_updatesAndReturns() {
        when(templateRepository.findById(1L)).thenReturn(Optional.of(template));
        when(timeService.now()).thenReturn(fixedNow);
        when(templateRepository.save(any(RecipeStepTemplate.class))).thenReturn(template);

        RecipeStepTemplateRequestDTO request = new RecipeStepTemplateRequestDTO(
            "Shaker très fort",
            RecipeStepActionType.SHAKE,
            20,
            "wine-outline",
            "Nouvelle description",
            false
        );

        RecipeStepTemplateResponseDTO result = templateService.updateTemplate(1L, request);

        assertThat(result).isNotNull();
        assertThat(template.getName()).isEqualTo("Shaker très fort");
        assertThat(template.getDefaultDurationSeconds()).isEqualTo(20);
        verify(templateRepository).save(template);
    }

    @Test
    @DisplayName("updateTemplate - throws ResourceNotFoundException when not found")
    void updateTemplate_notFound_throwsException() {
        when(templateRepository.findById(99L)).thenReturn(Optional.empty());

        RecipeStepTemplateRequestDTO request = new RecipeStepTemplateRequestDTO(
            "Test", RecipeStepActionType.OTHER, 10, null, null, false
        );

        assertThatThrownBy(() -> templateService.updateTemplate(99L, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("deleteTemplate - deletes non-predefined template")
    void deleteTemplate_customTemplate_deletesSuccessfully() {
        when(templateRepository.findById(1L)).thenReturn(Optional.of(template));

        templateService.deleteTemplate(1L);

        verify(templateRepository).delete(template);
    }

    @Test
    @DisplayName("deleteTemplate - throws BusinessException when template is predefined")
    void deleteTemplate_predefined_throwsBusinessException() {
        template.setPredefined(true);
        when(templateRepository.findById(1L)).thenReturn(Optional.of(template));

        assertThatThrownBy(() -> templateService.deleteTemplate(1L))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("predefined");

        verify(templateRepository, never()).delete(any());
    }

    @Test
    @DisplayName("deleteTemplate - throws ResourceNotFoundException when missing")
    void deleteTemplate_notFound_throwsException() {
        when(templateRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> templateService.deleteTemplate(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
