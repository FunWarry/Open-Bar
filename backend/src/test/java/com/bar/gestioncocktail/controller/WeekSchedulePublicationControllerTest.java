package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EmployeeShiftResponseDTO;
import com.bar.gestioncocktail.dto.ShiftAuditLogDTO;
import com.bar.gestioncocktail.dto.WeekSchedulePublicationDTO;
import com.bar.gestioncocktail.model.EmployeeShift;
import com.bar.gestioncocktail.model.ShiftAuditAction;
import com.bar.gestioncocktail.model.TypePoste;
import com.bar.gestioncocktail.model.TypeShift;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.service.ShiftAuditService;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeekSchedulePublicationControllerTest {

    @Mock
    private WeekSchedulePublicationService service;

    @Mock
    private ShiftAuditService shiftAuditService;

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

    @Test
    @DisplayName("GET /audit-log returns 200 with weekly audit logs")
    void getAuditLog_returnsOkWithLogs() {
        ShiftAuditLogDTO dto = new ShiftAuditLogDTO(
                1L, 100L, 10L, "serveur1", "Martin", "Alice",
                LocalDate.of(2026, 8, 18), ShiftAuditAction.CREATED,
                "manager1", LocalDateTime.now(), null, "{}"
        );
        when(shiftAuditService.getAuditLogForWeek(monday, null)).thenReturn(List.of(dto));

        ResponseEntity<List<ShiftAuditLogDTO>> response = controller.getAuditLog(monday, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).shiftId()).isEqualTo(100L);
        verify(shiftAuditService).getAuditLogForWeek(monday, null);
    }

    @Test
    @DisplayName("GET /at returns 200 with reconstructed shifts at instant T")
    void getScheduleAt_returnsOkWithShifts() {
        LocalDateTime at = LocalDateTime.of(2026, 8, 18, 12, 0, 0);

        User user = new User();
        user.setId(10L);
        user.setUsername("serveur1");
        user.setNom("Martin");
        user.setPrenom("Alice");

        EmployeeShift shiftEntity = new EmployeeShift();
        shiftEntity.setId(100L);
        shiftEntity.setUser(user);
        shiftEntity.setDateShift(LocalDate.of(2026, 8, 18));
        shiftEntity.setTypeShift(TypeShift.SOIR);
        shiftEntity.setTypePoste(TypePoste.SERVEUR);
        shiftEntity.setHeureDebut("17:00");
        shiftEntity.setHeureFin("01:00");

        EmployeeShiftResponseDTO shift = EmployeeShiftResponseDTO.from(shiftEntity);
        when(shiftAuditService.reconstructScheduleAt(monday, at)).thenReturn(List.of(shift));

        ResponseEntity<List<EmployeeShiftResponseDTO>> response = controller.getScheduleAt(monday, at);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).id()).isEqualTo(100L);
        verify(shiftAuditService).reconstructScheduleAt(monday, at);
    }
}
