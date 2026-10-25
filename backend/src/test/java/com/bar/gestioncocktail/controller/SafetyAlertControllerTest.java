package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.SafetyAlertRequestDTO;
import com.bar.gestioncocktail.dto.SafetyAlertResolveRequestDTO;
import com.bar.gestioncocktail.dto.SafetyAlertResponseDTO;
import com.bar.gestioncocktail.model.SafetyAlertStatus;
import com.bar.gestioncocktail.model.SafetyAlertType;
import com.bar.gestioncocktail.service.PdfService;
import com.bar.gestioncocktail.service.SafetyAlertService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link SafetyAlertController} verifying staff supervision,
 * alert resolution, and restroom notice PDF download endpoints.
 */
@ExtendWith(MockitoExtension.class)
class SafetyAlertControllerTest {

    private static final ZoneId ZONE = ZoneId.systemDefault();

    @Mock
    private SafetyAlertService safetyAlertService;

    @Mock
    private PdfService pdfService;

    @InjectMocks
    private SafetyAlertController controller;

    @Test
    @DisplayName("getActiveAlerts - returns list of active safety alerts")
    void getActiveAlertsSuccess() {
        SafetyAlertResponseDTO alert = new SafetyAlertResponseDTO(
                1L,
                3L,
                5,
                SafetyAlertType.ANGEL_SHOT_ICE,
                SafetyAlertType.ANGEL_SHOT_ICE.getLabel(),
                SafetyAlertStatus.ACTIVE,
                null,
                null,
                LocalDateTime.now(ZONE),
                null
        );

        when(safetyAlertService.getActiveAlerts()).thenReturn(List.of(alert));

        List<SafetyAlertResponseDTO> response = controller.getActiveAlerts();

        assertThat(response).isNotNull().hasSize(1);
        assertThat(response.get(0).id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getActiveAlertsForTable - returns safety alerts for table")
    void getActiveAlertsForTableSuccess() {
        SafetyAlertResponseDTO alert = new SafetyAlertResponseDTO(
                2L,
                8L,
                12,
                SafetyAlertType.ANGEL_SHOT_NEAT,
                SafetyAlertType.ANGEL_SHOT_NEAT.getLabel(),
                SafetyAlertStatus.ACTIVE,
                null,
                null,
                LocalDateTime.now(ZONE),
                null
        );

        when(safetyAlertService.getActiveAlertsForTable(8L)).thenReturn(List.of(alert));

        List<SafetyAlertResponseDTO> response = controller.getActiveAlertsForTable(8L);

        assertThat(response).isNotNull().hasSize(1);
        assertThat(response.get(0).tableId()).isEqualTo(8L);
    }

    @Test
    @DisplayName("triggerStaffAlert - manually triggers safety alert for table and returns 201 Created")
    void triggerStaffAlertSuccess() {
        SafetyAlertRequestDTO request = new SafetyAlertRequestDTO(SafetyAlertType.ANGEL_SHOT_LIME, "Suspicious person");
        SafetyAlertResponseDTO createdDto = new SafetyAlertResponseDTO(
                10L,
                8L,
                12,
                SafetyAlertType.ANGEL_SHOT_LIME,
                SafetyAlertType.ANGEL_SHOT_LIME.getLabel(),
                SafetyAlertStatus.ACTIVE,
                "Suspicious person",
                null,
                LocalDateTime.now(ZONE),
                null
        );

        when(safetyAlertService.createAlert(8L, request)).thenReturn(createdDto);

        ResponseEntity<SafetyAlertResponseDTO> response = controller.triggerStaffAlert(8L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(10L);
        assertThat(response.getBody().type()).isEqualTo(SafetyAlertType.ANGEL_SHOT_LIME);
    }

    @Test
    @DisplayName("resolveAlert - acknowledges alert and returns updated DTO with 200 OK")
    void resolveAlertSuccess() {
        SafetyAlertResolveRequestDTO resolveRequest = new SafetyAlertResolveRequestDTO("Sam (Server)");

        SafetyAlertResponseDTO resolvedDto = new SafetyAlertResponseDTO(
                1L,
                3L,
                5,
                SafetyAlertType.ANGEL_SHOT_ICE,
                SafetyAlertType.ANGEL_SHOT_ICE.getLabel(),
                SafetyAlertStatus.RESOLVED,
                null,
                "Sam (Server)",
                LocalDateTime.now(ZONE).minusMinutes(2),
                LocalDateTime.now(ZONE)
        );

        Authentication auth = mock(Authentication.class);
        when(safetyAlertService.resolveAlert(1L, "Sam (Server)")).thenReturn(resolvedDto);

        ResponseEntity<SafetyAlertResponseDTO> response = controller.resolveAlert(1L, resolveRequest, auth);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(SafetyAlertStatus.RESOLVED);
        assertThat(response.getBody().resolvedBy()).isEqualTo("Sam (Server)");
    }

    @Test
    @DisplayName("resolveAlert - uses authenticated username when request body does not provide a name")
    void resolveAlertUsesAuthUsername() {
        SafetyAlertResponseDTO resolvedDto = new SafetyAlertResponseDTO(
                1L,
                3L,
                5,
                SafetyAlertType.ANGEL_SHOT_NEAT,
                SafetyAlertType.ANGEL_SHOT_NEAT.getLabel(),
                SafetyAlertStatus.RESOLVED,
                null,
                "alex_waiter",
                LocalDateTime.now(ZONE).minusMinutes(1),
                LocalDateTime.now(ZONE)
        );

        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("alex_waiter");
        when(safetyAlertService.resolveAlert(1L, "alex_waiter")).thenReturn(resolvedDto);

        ResponseEntity<SafetyAlertResponseDTO> response = controller.resolveAlert(1L, null, auth);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().resolvedBy()).isEqualTo("alex_waiter");
    }

    @Test
    @DisplayName("getRestroomNoticePdf - returns binary PDF stream with appropriate headers")
    void getRestroomNoticePdfSuccess() {
        byte[] mockPdfBytes = "%PDF-1.4 mock pdf content".getBytes();
        when(pdfService.generateAngelShotNoticePdf()).thenReturn(mockPdfBytes);

        ResponseEntity<byte[]> response = controller.getRestroomNoticePdf();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PDF);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .contains("inline")
                .contains("angel-shot-notice.pdf");
        assertThat(response.getBody()).isEqualTo(mockPdfBytes);
    }
}
