package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EmployeeShiftRequestDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EmployeeShift;
import com.bar.gestioncocktail.model.TypePoste;
import com.bar.gestioncocktail.model.TypeShift;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.EmployeeShiftRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeShiftServiceTest {

    @Mock
    private EmployeeShiftRepository shiftRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private EmployeeShiftService shiftService;

    private User sampleUser;
    private EmployeeShift sampleShift;

    @BeforeEach
    void setUp() {
        sampleUser = new User();
        sampleUser.setId(1L);
        sampleUser.setUsername("serveur1");

        sampleShift = new EmployeeShift();
        sampleShift.setId(10L);
        sampleShift.setUser(sampleUser);
        sampleShift.setDateShift(LocalDate.of(2026, 8, 10));
        sampleShift.setTypeShift(TypeShift.MATIN);
        sampleShift.setTypePoste(TypePoste.SERVEUR);
        sampleShift.setHeureDebut("08:00");
        sampleShift.setHeureFin("16:00");
        sampleShift.setHeuresEffectuees(new BigDecimal("8.0"));
    }

    @Test
    void getAllShifts_ShouldReturnList() {
        when(shiftRepository.findAll()).thenReturn(List.of(sampleShift));

        List<EmployeeShift> result = shiftService.getAllShifts();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getHeureDebut()).isEqualTo("08:00");
    }

    @Test
    void getShiftsForWeek_ShouldReturnFilteredShifts() {
        LocalDate start = LocalDate.of(2026, 8, 10);
        LocalDate end = LocalDate.of(2026, 8, 16);
        when(shiftRepository.findByDateShiftBetween(start, end)).thenReturn(List.of(sampleShift));

        List<EmployeeShift> result = shiftService.getShiftsForWeek(start, end);

        assertThat(result).hasSize(1);
    }

    @Test
    void createShift_Success() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.SOIR, TypePoste.BARMAN,
            "17:00", "01:00", new BigDecimal("8.0"), "Service bar"
        );

        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(shiftRepository.save(any(EmployeeShift.class))).thenAnswer(invocation -> {
            EmployeeShift s = invocation.getArgument(0);
            s.setId(20L);
            return s;
        });

        EmployeeShift created = shiftService.createShift(request);

        assertThat(created).isNotNull();
        assertThat(created.getTypePoste()).isEqualTo(TypePoste.BARMAN);
        verify(shiftRepository).save(any(EmployeeShift.class));
    }

    @Test
    void createShift_UserNotFound_ThrowsException() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            99L, LocalDate.of(2026, 8, 10), TypeShift.SOIR, TypePoste.BARMAN,
            "17:00", "01:00", new BigDecimal("8.0"), null
        );

        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> shiftService.createShift(request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deleteShift_Success() {
        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));

        shiftService.deleteShift(10L);

        verify(shiftRepository).delete(sampleShift);
    }
}
