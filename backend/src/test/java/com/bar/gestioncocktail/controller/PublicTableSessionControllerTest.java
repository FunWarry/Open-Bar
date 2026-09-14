package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.TableJoinApprovalRequestDTO;
import com.bar.gestioncocktail.dto.TableJoinRequestDTO;
import com.bar.gestioncocktail.dto.TableSessionResponseDTO;
import com.bar.gestioncocktail.dto.TableSessionValidateRequestDTO;
import com.bar.gestioncocktail.model.TableSessionStatus;
import com.bar.gestioncocktail.service.TableSessionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicTableSessionControllerTest {

    @Mock
    private TableSessionService tableSessionService;

    @InjectMocks
    private PublicTableSessionController controller;

    @Test
    @DisplayName("getSession: returns 200 with session status DTO")
    void getSession_returnsDto() {
        TableSessionResponseDTO expected = new TableSessionResponseDTO(
                1L, 5L, "tok-123", TableSessionStatus.ACTIVE,
                LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now().plusHours(2),
                true, "Session valid"
        );

        when(tableSessionService.validateSession(5L, "tok-123", null, null)).thenReturn(expected);

        ResponseEntity<TableSessionResponseDTO> response = controller.getSession(5L, "tok-123");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().valid()).isTrue();
        assertThat(response.getBody().sessionToken()).isEqualTo("tok-123");
    }

    @Test
    @DisplayName("validateSession: post endpoint delegates to service")
    void validateSession_post_returnsDto() {
        TableSessionResponseDTO expected = new TableSessionResponseDTO(
                1L, 5L, "tok-post", TableSessionStatus.ACTIVE,
                LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now().plusHours(2),
                true, "Session valid"
        );

        when(tableSessionService.validateSession(5L, "tok-post")).thenReturn(expected);

        TableSessionValidateRequestDTO request = new TableSessionValidateRequestDTO("tok-post");
        ResponseEntity<TableSessionResponseDTO> response = controller.validateSession(5L, request);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().sessionToken()).isEqualTo("tok-post");
    }

    @Test
    @DisplayName("refreshSession: returns fresh active session DTO")
    void refreshSession_returnsDto() {
        TableSessionResponseDTO expected = new TableSessionResponseDTO(
                2L, 5L, "tok-fresh", TableSessionStatus.ACTIVE,
                LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now().plusHours(2),
                true, "Session refreshed"
        );

        when(tableSessionService.refreshSession(5L)).thenReturn(expected);

        ResponseEntity<TableSessionResponseDTO> response = controller.refreshSession(5L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().sessionToken()).isEqualTo("tok-fresh");
        verify(tableSessionService).refreshSession(5L);
    }

    @Test
    @DisplayName("getSessionQrCode: returns 200 with PNG bytes and image/png content type")
    void getSessionQrCode_png_returnsImageBytes() {
        byte[] qrBytes = new byte[]{10, 20, 30};
        when(tableSessionService.generateSessionQrCode(5L, "tok-123", "PNG", 300, "http://localhost:4200"))
                .thenReturn(qrBytes);

        ResponseEntity<byte[]> response = controller.getSessionQrCode(5L, "tok-123", "PNG", 300, "http://localhost:4200");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getHeaders().getContentType()).hasToString("image/png");
        assertThat(response.getBody()).isEqualTo(qrBytes);
    }

    @Test
    @DisplayName("getSessionQrCode: returns 200 with SVG bytes and image/svg+xml content type")
    void getSessionQrCode_svg_returnsSvgContentType() {
        byte[] svgBytes = "<svg></svg>".getBytes();
        when(tableSessionService.generateSessionQrCode(5L, null, "SVG", 250, null))
                .thenReturn(svgBytes);

        ResponseEntity<byte[]> response = controller.getSessionQrCode(5L, null, "SVG", 250, null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getHeaders().getContentType()).hasToString("image/svg+xml");
        assertThat(response.getBody()).isEqualTo(svgBytes);
    }

    @Test
    @DisplayName("submitJoinRequest: returns 200 with created join request DTO")
    void submitJoinRequest_returnsCreatedRequest() {
        TableJoinRequestDTO requestDto = new TableJoinRequestDTO(
                null, 5L, "guest-applicant", "Sam", "PENDING", null, null
        );
        TableJoinRequestDTO responseDto = new TableJoinRequestDTO(
                12L, 5L, "guest-applicant", "Sam", "PENDING", null, null
        );
        when(tableSessionService.createJoinRequest(5L, requestDto)).thenReturn(responseDto);

        ResponseEntity<TableJoinRequestDTO> response = controller.submitJoinRequest(5L, requestDto);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(12L);
        assertThat(response.getBody().applicantName()).isEqualTo("Sam");
        verify(tableSessionService).createJoinRequest(5L, requestDto);
    }

    @Test
    @DisplayName("respondToJoinRequest: returns 200 with updated join request DTO")
    void respondToJoinRequest_returnsUpdatedRequest() {
        TableJoinApprovalRequestDTO approvalDto = new TableJoinApprovalRequestDTO("guest-owner", true);
        TableJoinRequestDTO responseDto = new TableJoinRequestDTO(
                12L, 5L, "guest-applicant", "Sam", "APPROVED", "tok-approved", null
        );
        when(tableSessionService.respondToJoinRequest(5L, 12L, approvalDto)).thenReturn(responseDto);

        ResponseEntity<TableJoinRequestDTO> response = controller.respondToJoinRequest(5L, 12L, approvalDto);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo("APPROVED");
        assertThat(response.getBody().sessionToken()).isEqualTo("tok-approved");
        verify(tableSessionService).respondToJoinRequest(5L, 12L, approvalDto);
    }

    @Test
    @DisplayName("getJoinRequestStatus: returns 200 with applicant request status")
    void getJoinRequestStatus_returnsStatus() {
        TableJoinRequestDTO responseDto = new TableJoinRequestDTO(
                12L, 5L, "guest-applicant", "Sam", "APPROVED", "tok-approved", null
        );
        when(tableSessionService.getJoinRequestStatus(5L, "guest-applicant")).thenReturn(responseDto);

        ResponseEntity<TableJoinRequestDTO> response = controller.getJoinRequestStatus(5L, "guest-applicant");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().sessionToken()).isEqualTo("tok-approved");
        verify(tableSessionService).getJoinRequestStatus(5L, "guest-applicant");
    }

    @Test
    @DisplayName("getPendingJoinRequests: returns 200 with pending requests for owner")
    void getPendingJoinRequests_returnsList() {
        TableJoinRequestDTO item = new TableJoinRequestDTO(
                12L, 5L, "guest-applicant", "Sam", "PENDING", null, null
        );
        when(tableSessionService.getPendingJoinRequests(5L, "guest-owner")).thenReturn(List.of(item));

        ResponseEntity<List<TableJoinRequestDTO>> response = controller.getPendingJoinRequests(5L, "guest-owner");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().getFirst().applicantName()).isEqualTo("Sam");
        verify(tableSessionService).getPendingJoinRequests(5L, "guest-owner");
    }
}
