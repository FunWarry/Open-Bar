package com.bar.gestioncocktail.controller;

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

        when(tableSessionService.validateSession(5L, "tok-123")).thenReturn(expected);

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
}
