package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EmployeeShiftRequestDTO;
import com.bar.gestioncocktail.dto.EmployeeShiftResponseDTO;
import com.bar.gestioncocktail.model.EmployeeShift;
import com.bar.gestioncocktail.model.TypePoste;
import com.bar.gestioncocktail.model.TypeShift;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.service.EmployeeShiftService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeShiftControllerTest {

    @Mock
    private EmployeeShiftService shiftService;

    @InjectMocks
    private EmployeeShiftController shiftController;

    private EmployeeShift sampleShift;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);
        user.setUsername("manager1");

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
    void getAllShifts_ShouldReturnList() {
        when(shiftService.getAllShifts()).thenReturn(List.of(sampleShift));

        ResponseEntity<List<EmployeeShiftResponseDTO>> response = shiftController.getAllShifts();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).typePoste()).isEqualTo(TypePoste.MANAGER);
    }

    @Test
    void getShiftsForWeek_ShouldReturnList() {
        LocalDate start = LocalDate.of(2026, 8, 10);
        LocalDate end = LocalDate.of(2026, 8, 16);
        when(shiftService.getShiftsForWeek(start, end)).thenReturn(List.of(sampleShift));

        ResponseEntity<List<EmployeeShiftResponseDTO>> response = shiftController.getShiftsForWeek(start, end);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().get(0).heureDebut()).isEqualTo("08:00");
    }

    @Test
    void createShift_ShouldReturnDto() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.MATIN, TypePoste.MANAGER,
            "08:00", "16:00", new BigDecimal("8.0"), "Note"
        );

        when(shiftService.createShift(any(EmployeeShiftRequestDTO.class))).thenReturn(sampleShift);

        ResponseEntity<EmployeeShiftResponseDTO> response = shiftController.createShift(request);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().id()).isEqualTo(1L);
        verify(shiftService).createShift(request);
    }
}
