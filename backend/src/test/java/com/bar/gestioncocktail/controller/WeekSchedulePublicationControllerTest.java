package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.WeekSchedulePublicationDTO;
import com.bar.gestioncocktail.service.WeekSchedulePublicationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeekSchedulePublicationControllerTest {

    @Mock
    private WeekSchedulePublicationService service;

    @Mock
    private Principal principal;

    @InjectMocks
    private WeekSchedulePublicationController controller;

    private final LocalDate monday = LocalDate.of(2026, 8, 17);

    @Test
    @DisplayName("POST /publish returns 200 with saved publication DTO")
    void publish_returnsOkWithDto() {
        when(principal.getName()).thenReturn("manager1");
        WeekSchedulePublicationDTO dto = new WeekSchedulePublicationDTO(1L, monday, LocalDateTime.now(), "manager1", "[]");
        when(service.publishWeek(monday, "manager1")).thenReturn(dto);

        ResponseEntity<WeekSchedulePublicationDTO> response = controller.publish(monday, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().publishedBy()).isEqualTo("manager1");
        verify(service).publishWeek(monday, "manager1");
    }

    @Test
    @DisplayName("GET /publication returns 200 when published")
    void getPublication_returns200WhenPublished() {
        WeekSchedulePublicationDTO dto = new WeekSchedulePublicationDTO(1L, monday, LocalDateTime.now(), "manager1", "[]");
        when(service.getPublication(monday)).thenReturn(Optional.of(dto));

        ResponseEntity<WeekSchedulePublicationDTO> response = controller.getPublication(monday);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(dto);
    }

    @Test
    @DisplayName("GET /publication returns 204 No Content when not published")
    void getPublication_returns204WhenNotPublished() {
        when(service.getPublication(monday)).thenReturn(Optional.empty());

        ResponseEntity<WeekSchedulePublicationDTO> response = controller.getPublication(monday);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(response.getBody()).isNull();
    }
}
