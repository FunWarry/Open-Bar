package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EmployeeShiftRequestDTO;
import com.bar.gestioncocktail.dto.EmployeeShiftResponseDTO;
import com.bar.gestioncocktail.dto.ShiftAuditLogDTO;
import com.bar.gestioncocktail.model.EmployeeShift;
import com.bar.gestioncocktail.model.ShiftAuditAction;
import com.bar.gestioncocktail.model.TypePoste;
import com.bar.gestioncocktail.model.TypeShift;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.service.EmployeeShiftService;
import com.bar.gestioncocktail.service.ShiftAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeShiftControllerTest {

    @Mock
    private EmployeeShiftService shiftService;

    @Mock
    private ShiftAuditService shiftAuditService;

    @InjectMocks
    private EmployeeShiftController shiftController;

    private EmployeeShift sampleShift;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);
        user.setUsername("manager1");
        user.setNom("Dupont");
        user.setPrenom("Jean");

        sampleShift = new EmployeeShift();
        sampleShift.setId(1L);
        sampleShift.setUser(user);
        sampleShift.setDateShift(LocalDate.of(2026, 8, 10));
        sampleShift.setTypeShift(TypeShift.MATIN);
        sampleShift.setTypePoste(TypePoste.MANAGER);
        sampleShift.setHeureDebut("08:00");
        sampleShift.setHeureFin("16:00");
        sampleShift.setHeuresEffectuees(new BigDecimal("8.0"));
    }

    @Test
    void getShiftById_ShouldReturnShift() {
        when(shiftService.getShiftById(1L)).thenReturn(sampleShift);

        ResponseEntity<EmployeeShiftResponseDTO> response = shiftController.getShiftById(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().id()).isEqualTo(1L);
    }

    @Test
    void getShiftsForWeek_WithDebutAndFin_ShouldReturnList() {
        LocalDate start = LocalDate.of(2026, 8, 10);
        LocalDate end = LocalDate.of(2026, 8, 16);
        when(shiftService.getShiftsForWeek(start, end)).thenReturn(List.of(sampleShift));

        ResponseEntity<List<EmployeeShiftResponseDTO>> response = shiftController.getShiftsForWeek(null, start, end);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().get(0).heureDebut()).isEqualTo("08:00");
    }

    @Test
    void getShiftsForWeek_WithDate_ShouldCallWeekOfDate() {
        LocalDate target = LocalDate.of(2026, 8, 12);
        when(shiftService.getShiftsForWeekOfDate(target)).thenReturn(List.of(sampleShift));

        ResponseEntity<List<EmployeeShiftResponseDTO>> response = shiftController.getShiftsForWeek(target, null, null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().get(0).heureDebut()).isEqualTo("08:00");
    }

    @Test
    void getShiftsForRange_ShouldReturnList() {
        LocalDate from = LocalDate.of(2026, 8, 10);
        LocalDate to = LocalDate.of(2026, 8, 16);
        when(shiftService.getShiftsForWeek(from, to)).thenReturn(List.of(sampleShift));

        ResponseEntity<List<EmployeeShiftResponseDTO>> response = shiftController.getShiftsForRange(from, to);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void getShiftsByUserId_ShouldReturnList() {
        when(shiftService.getShiftsByUserId(1L)).thenReturn(List.of(sampleShift));

        ResponseEntity<List<EmployeeShiftResponseDTO>> response = shiftController.getShiftsByUserId(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void createShift_ShouldReturnCreatedDto() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.MATIN, TypePoste.MANAGER,
            "08:00", "16:00", "12:00", 30, null, null, BigDecimal.ZERO, BigDecimal.valueOf(7.5), new BigDecimal("8.0"), "Test"
        );

        when(shiftService.createShift(any(EmployeeShiftRequestDTO.class))).thenReturn(sampleShift);

        ResponseEntity<EmployeeShiftResponseDTO> response = shiftController.createShift(request);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().id()).isEqualTo(1L);
        verify(shiftService).createShift(request);
    }

    @Test
    void updateShift_ShouldReturnUpdatedDto() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.SOIR, TypePoste.MANAGER,
            "17:00", "01:00", "20:00", 30, null, null, BigDecimal.ZERO, BigDecimal.valueOf(7.5), new BigDecimal("8.0"), "Modifié"
        );

        when(shiftService.updateShift(eq(1L), any(EmployeeShiftRequestDTO.class))).thenReturn(sampleShift);

        ResponseEntity<EmployeeShiftResponseDTO> response = shiftController.updateShift(1L, request);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(shiftService).updateShift(1L, request);
    }

    @Test
    void patchShift_ShouldReturnUpdatedDto() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            null, null, null, null,
            null, null, null, null, "08:15", "16:20", BigDecimal.valueOf(0.33), null, BigDecimal.valueOf(8.0), "Pointage partiel"
        );

        when(shiftService.updateShift(eq(1L), any(EmployeeShiftRequestDTO.class))).thenReturn(sampleShift);

        ResponseEntity<EmployeeShiftResponseDTO> response = shiftController.patchShift(1L, request);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(shiftService).updateShift(1L, request);
    }

    @Test
    void deleteShift_ShouldReturnOk() {
        ResponseEntity<Void> response = shiftController.deleteShift(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(shiftService).deleteShift(1L);
    }

    @Test
    void getShiftHistory_ShouldReturnHistoryList() {
        ShiftAuditLogDTO dto = new ShiftAuditLogDTO(
                10L, 1L, 1L, "manager1", "Dupont", "Jean",
                LocalDate.of(2026, 8, 10), ShiftAuditAction.CREATED,
                "manager1", LocalDateTime.now(), null, "{}"
        );
        when(shiftAuditService.getHistoryForShift(1L)).thenReturn(List.of(dto));

        ResponseEntity<List<ShiftAuditLogDTO>> response = shiftController.getShiftHistory(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).shiftId()).isEqualTo(1L);
        verify(shiftAuditService).getHistoryForShift(1L);
    }
}
