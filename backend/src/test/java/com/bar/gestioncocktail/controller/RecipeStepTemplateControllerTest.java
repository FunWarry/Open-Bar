package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.RecipeStepTemplateRequestDTO;
import com.bar.gestioncocktail.dto.RecipeStepTemplateResponseDTO;
import com.bar.gestioncocktail.model.RecipeStepActionType;
import com.bar.gestioncocktail.service.RecipeStepTemplateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Controller unit tests for {@link RecipeStepTemplateController}.
 */
@ExtendWith(MockitoExtension.class)
class RecipeStepTemplateControllerTest {

    @Mock
    private RecipeStepTemplateService templateService;

    @InjectMocks
    private RecipeStepTemplateController templateController;

    private RecipeStepTemplateResponseDTO templateDto;
    private final LocalDateTime fixedNow = LocalDateTime.of(2026, Month.AUGUST, 16, 12, 0, 0);

    @BeforeEach
    void setUp() {
        templateDto = new RecipeStepTemplateResponseDTO(
            1L, "Shaker", RecipeStepActionType.SHAKE, 15, "wine-outline", "Description", false, fixedNow, fixedNow
        );
    }

    @Test
    @DisplayName("getAllTemplates - returns all templates")
    void getAllTemplates_returns200() {
        when(templateService.getAllTemplates()).thenReturn(List.of(templateDto));

        ResponseEntity<List<RecipeStepTemplateResponseDTO>> response = templateController.getAllTemplates(null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull().hasSize(1);
        assertThat(response.getBody().get(0).name()).isEqualTo("Shaker");
    }

    @Test
    @DisplayName("getAllTemplates with actionType - returns filtered templates")
    void getAllTemplates_withActionType_returnsFiltered() {
        when(templateService.getTemplatesByActionType(RecipeStepActionType.SHAKE)).thenReturn(List.of(templateDto));

        ResponseEntity<List<RecipeStepTemplateResponseDTO>> response = templateController.getAllTemplates(RecipeStepActionType.SHAKE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull().hasSize(1);
        assertThat(response.getBody().get(0).actionType()).isEqualTo(RecipeStepActionType.SHAKE);
    }

    @Test
    @DisplayName("getTemplateById - returns template by ID")
    void getTemplateById_returns200() {
        when(templateService.getTemplateById(1L)).thenReturn(templateDto);

        ResponseEntity<RecipeStepTemplateResponseDTO> response = templateController.getTemplateById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(1L);
        assertThat(response.getBody().name()).isEqualTo("Shaker");
    }

    @Test
    @DisplayName("createTemplate - creates new template")
    void createTemplate_valid_returns200() {
        RecipeStepTemplateRequestDTO request = new RecipeStepTemplateRequestDTO(
            "Piler", RecipeStepActionType.MUDDLE, 15, "hammer-outline", "Desc", false
        );
        RecipeStepTemplateResponseDTO created = new RecipeStepTemplateResponseDTO(
            2L, "Piler", RecipeStepActionType.MUDDLE, 15, "hammer-outline", "Desc", false, fixedNow, fixedNow
        );
        when(templateService.createTemplate(any(RecipeStepTemplateRequestDTO.class))).thenReturn(created);

        ResponseEntity<RecipeStepTemplateResponseDTO> response = templateController.createTemplate(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(2L);
        assertThat(response.getBody().name()).isEqualTo("Piler");
    }

    @Test
    @DisplayName("updateTemplate - updates template")
    void updateTemplate_valid_returns200() {
        RecipeStepTemplateRequestDTO request = new RecipeStepTemplateRequestDTO(
            "Piler Maj", RecipeStepActionType.MUDDLE, 20, "hammer-outline", "Desc", false
        );
        RecipeStepTemplateResponseDTO updated = new RecipeStepTemplateResponseDTO(
            1L, "Piler Maj", RecipeStepActionType.MUDDLE, 20, "hammer-outline", "Desc", false, fixedNow, fixedNow
        );
        when(templateService.updateTemplate(eq(1L), any(RecipeStepTemplateRequestDTO.class))).thenReturn(updated);

        ResponseEntity<RecipeStepTemplateResponseDTO> response = templateController.updateTemplate(1L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().name()).isEqualTo("Piler Maj");
    }

    @Test
    @DisplayName("deleteTemplate - deletes template")
    void deleteTemplate_returns204() {
        ResponseEntity<Void> response = templateController.deleteTemplate(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(templateService).deleteTemplate(1L);
    }
}
