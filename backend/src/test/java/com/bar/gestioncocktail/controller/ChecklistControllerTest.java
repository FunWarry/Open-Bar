package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.model.ChecklistCategory;
import com.bar.gestioncocktail.model.ChecklistMediaType;
import com.bar.gestioncocktail.model.ChecklistRunStatus;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.service.ChecklistService;
import com.bar.gestioncocktail.service.FileUploadService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Unit and endpoint contract tests for {@link ChecklistController}.
 */
@ExtendWith(MockitoExtension.class)
class ChecklistControllerTest {

    @Mock
    private ChecklistService checklistService;

    @Mock
    private FileUploadService fileUploadService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private ChecklistController controller;

    private ChecklistTemplateDTO sampleTemplate;
    private ChecklistRunDTO sampleRun;

    @BeforeEach
    void setUp() {
        lenient().when(authentication.getName()).thenReturn("alice");

        sampleTemplate = new ChecklistTemplateDTO(
                1L,
                "Bar Opening SOP",
                "Morning checklist",
                ChecklistCategory.OPENING,
                20,
                "sunny-outline",
                "#f0a33b",
                true,
                0,
                List.of(new ChecklistTemplateItemDTO(
                        10L,
                        1L,
                        "Turn on ice machine",
                        "Ensure power and water line are on",
                        true,
                        1,
                        UserRole.BARMAN,
                        ChecklistMediaType.NONE,
                        null,
                        null
                )),
                LocalDateTime.of(2026, 10, 9, 8, 0),
                LocalDateTime.of(2026, 10, 9, 8, 0)
        );

        sampleRun = new ChecklistRunDTO(
                50L,
                1L,
                "Bar Opening SOP",
                ChecklistCategory.OPENING,
                ChecklistRunStatus.IN_PROGRESS,
                LocalDateTime.of(2026, 10, 9, 8, 0),
                null,
                10L,
                "alice",
                "Alice Smith",
                null,
                null,
                null,
                "Shift start",
                0,
                0,
                1,
                0,
                1,
                List.of()
        );
    }

    @Test
    @DisplayName("GET /api/checklists/templates should return all active templates")
    void shouldReturnTemplates() {
        when(checklistService.getAllTemplates(true)).thenReturn(List.of(sampleTemplate));

        ResponseEntity<List<ChecklistTemplateDTO>> response = controller.getTemplates(true);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).title()).isEqualTo("Bar Opening SOP");
    }

    @Test
    @DisplayName("GET /api/checklists/templates/{id} should return specific template")
    void shouldReturnTemplateById() {
        when(checklistService.getTemplateById(1L)).thenReturn(sampleTemplate);

        ResponseEntity<ChecklistTemplateDTO> response = controller.getTemplateById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("POST /api/checklists/templates should create new template")
    void shouldCreateTemplate() {
        CreateChecklistTemplateRequest req = new CreateChecklistTemplateRequest(
                "New Routine",
                "Description",
                ChecklistCategory.MID_SHIFT,
                15,
                "clock-outline",
                "#34c77b",
                List.of()
        );

        when(checklistService.createTemplate(req)).thenReturn(sampleTemplate);

        ResponseEntity<ChecklistTemplateDTO> response = controller.createTemplate(req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    @DisplayName("PUT /api/checklists/templates/{id} should update template")
    void shouldUpdateTemplate() {
        UpdateChecklistTemplateRequest req = new UpdateChecklistTemplateRequest(
                "Updated",
                null,
                null,
                null,
                null,
                null,
                true,
                null
        );

        when(checklistService.updateTemplate(1L, req)).thenReturn(sampleTemplate);

        ResponseEntity<ChecklistTemplateDTO> response = controller.updateTemplate(1L, req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("DELETE /api/checklists/templates/{id} should return 204 No Content")
    void shouldDeleteTemplate() {
        doNothing().when(checklistService).deleteTemplate(1L);

        ResponseEntity<Void> response = controller.deleteTemplate(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(checklistService).deleteTemplate(1L);
    }

    @Test
    @DisplayName("POST /api/checklists/runs should start a new execution run")
    void shouldStartRun() {
        StartChecklistRunRequest req = new StartChecklistRunRequest(1L, "Notes");
        when(checklistService.startRun(req, "alice")).thenReturn(sampleRun);

        ResponseEntity<ChecklistRunDTO> response = controller.startRun(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().id()).isEqualTo(50L);
    }

    @Test
    @DisplayName("GET /api/checklists/runs should return runs with filters")
    void shouldGetRuns() {
        when(checklistService.getRunsHistory(null, ChecklistCategory.OPENING, ChecklistRunStatus.IN_PROGRESS))
                .thenReturn(List.of(sampleRun));

        ResponseEntity<List<ChecklistRunDTO>> response = controller.getRuns(ChecklistCategory.OPENING, ChecklistRunStatus.IN_PROGRESS);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("GET /api/checklists/runs/active should return active runs")
    void shouldGetActiveRuns() {
        when(checklistService.getActiveRuns()).thenReturn(List.of(sampleRun));

        ResponseEntity<List<ChecklistRunDTO>> response = controller.getActiveRuns();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("GET /api/checklists/runs/history should return historical runs")
    void shouldGetRunsHistory() {
        LocalDate today = LocalDate.of(2026, 10, 9);
        when(checklistService.getRunsHistory(today, ChecklistCategory.OPENING, null))
                .thenReturn(List.of(sampleRun));

        ResponseEntity<List<ChecklistRunDTO>> response = controller.getRunsHistory(today, ChecklistCategory.OPENING, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("GET /api/checklists/runs/{id} should return run details")
    void shouldGetRunById() {
        when(checklistService.getRunById(50L)).thenReturn(sampleRun);

        ResponseEntity<ChecklistRunDTO> response = controller.getRunById(50L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(50L);
    }

    @Test
    @DisplayName("PUT /api/checklists/runs/{runId}/items/{itemId} should toggle task item")
    void shouldToggleRunItem() {
        ToggleChecklistRunItemRequest toggleReq = new ToggleChecklistRunItemRequest(true, "Done", null);
        when(checklistService.toggleRunItem(50L, 10L, toggleReq, "alice")).thenReturn(sampleRun);

        ResponseEntity<ChecklistRunDTO> response = controller.toggleRunItem(50L, 10L, toggleReq, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("POST /api/checklists/runs/{id}/complete should finalize run")
    void shouldCompleteRun() {
        CompleteChecklistRunRequest req = new CompleteChecklistRunRequest("Finished");
        when(checklistService.completeRun(50L, req, "alice")).thenReturn(sampleRun);

        ResponseEntity<ChecklistRunDTO> response = controller.completeRun(50L, req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("POST /api/checklists/runs/{id}/cancel should abort run")
    void shouldCancelRun() {
        when(checklistService.cancelRun(50L, "alice")).thenReturn(sampleRun);

        ResponseEntity<ChecklistRunDTO> response = controller.cancelRun(50L, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("GET /api/checklists/stats should return operational metrics")
    void shouldGetStats() {
        ChecklistStatsDTO stats = new ChecklistStatsDTO(3L, 5L, 12L, 85);
        when(checklistService.getStats()).thenReturn(stats);

        ResponseEntity<ChecklistStatsDTO> response = controller.getStats();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().averageCompletionPercentageToday()).isEqualTo(85);
    }

    @Test
    @DisplayName("POST /api/checklists/media/upload should store instructional media")
    void shouldUploadMedia() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "guide.png",
                "image/png",
                "fake image content".getBytes()
        );

        when(fileUploadService.storeChecklistMedia(file)).thenReturn("/uploads/checklists/guide_123.png");

        ResponseEntity<Map<String, String>> response = controller.uploadMedia(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("url", "/uploads/checklists/guide_123.png");
    }
}
