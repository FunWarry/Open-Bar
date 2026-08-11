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
    private User newUser;
    private EmployeeShift sampleShift;

    @BeforeEach
    void setUp() {
        sampleUser = new User();
        sampleUser.setId(1L);
        sampleUser.setUsername("serveur1");

        newUser = new User();
        newUser.setId(2L);
        newUser.setUsername("barman1");

        sampleShift = new EmployeeShift();
        sampleShift.setId(10L);
        sampleShift.setUser(sampleUser);
        sampleShift.setDateShift(LocalDate.of(2026, 8, 10));
        sampleShift.setTypeShift(TypeShift.MATIN);
        sampleShift.setTypePoste(TypePoste.SERVEUR);
        sampleShift.setHeureDebut("08:00");
        sampleShift.setHeureFin("16:00");
        sampleShift.setHeuresEffectuees(new BigDecimal("8.0"));
        sampleShift.setNotes("Service du matin");
    }

    @Test
    void getAllShifts_ShouldReturnList() {
        when(shiftRepository.findAll()).thenReturn(List.of(sampleShift));

        List<EmployeeShift> result = shiftService.getAllShifts();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getHeureDebut()).isEqualTo("08:00");
    }

    @Test
    void getShiftsByUserId_ShouldReturnUserShifts() {
        when(shiftRepository.findByUserId(1L)).thenReturn(List.of(sampleShift));

        List<EmployeeShift> result = shiftService.getShiftsByUserId(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUser().getId()).isEqualTo(1L);
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
    void getShiftsForWeekOfDate_ShouldCalculateMondayAndSunday() {
        LocalDate wednesday = LocalDate.of(2026, 8, 12);
        LocalDate monday = LocalDate.of(2026, 8, 10);
        LocalDate sunday = LocalDate.of(2026, 8, 16);
        when(shiftRepository.findByDateShiftBetween(monday, sunday)).thenReturn(List.of(sampleShift));

        List<EmployeeShift> result = shiftService.getShiftsForWeekOfDate(wednesday);

        assertThat(result).hasSize(1);
        verify(shiftRepository).findByDateShiftBetween(monday, sunday);
    }

    @Test
    void getShiftsForWeekOfDate_WithNullDate_ShouldDefaultToCurrentWeek() {
        when(shiftRepository.findByDateShiftBetween(any(LocalDate.class), any(LocalDate.class))).thenReturn(List.of(sampleShift));

        List<EmployeeShift> result = shiftService.getShiftsForWeekOfDate(null);

        assertThat(result).hasSize(1);
        verify(shiftRepository).findByDateShiftBetween(any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    void getShiftById_Success() {
        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));

        EmployeeShift result = shiftService.getShiftById(10L);

        assertThat(result.getId()).isEqualTo(10L);
    }

    @Test
    void getShiftById_NotFound_ThrowsException() {
        when(shiftRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> shiftService.getShiftById(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createShift_Success() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.SOIR, TypePoste.BARMAN,
            "17:00", "01:00", "20:00", 30, "17:05", "01:10", BigDecimal.ZERO, BigDecimal.valueOf(7.5), new BigDecimal("8.0"), "Service bar"
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
            "17:00", "01:00", "20:00", 30, "17:05", "01:10", BigDecimal.valueOf(0.5), BigDecimal.valueOf(7.5), new BigDecimal("8.0"), "Note"
        );

        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> shiftService.createShift(request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateShift_Success_AllFields() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            2L, LocalDate.of(2026, 8, 11), TypeShift.SOIR, TypePoste.BARMAN,
            "18:00", "02:00", "21:00", 30, "18:00", "02:00", BigDecimal.ZERO, BigDecimal.valueOf(7.5), new BigDecimal("8.0"), "Soirée spéciale"
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));
        when(userRepository.findById(2L)).thenReturn(Optional.of(newUser));
        when(shiftRepository.save(any(EmployeeShift.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeShift updated = shiftService.updateShift(10L, request);

        assertThat(updated.getUser().getId()).isEqualTo(2L);
        assertThat(updated.getDateShift()).isEqualTo(LocalDate.of(2026, 8, 11));
        assertThat(updated.getTypeShift()).isEqualTo(TypeShift.SOIR);
        assertThat(updated.getTypePoste()).isEqualTo(TypePoste.BARMAN);
        assertThat(updated.getHeureDebut()).isEqualTo("18:00");
        assertThat(updated.getHeureFin()).isEqualTo("02:00");
        assertThat(updated.getNotes()).isEqualTo("Soirée spéciale");
    }

    @Test
    void updateShift_UserNotFound_ThrowsException() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            99L, null, null, null, null, null, null, null, null, null, null, null, null, null
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> shiftService.updateShift(10L, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateShift_WithAllNullFields_DoesNotChangeExistingValues() {
        // Covers all false-branches on the null-checks (lines 118-124)
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            null, null, null, null, null, null, null, null, null, null, null, null, null, null
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));
        when(shiftRepository.save(any(EmployeeShift.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeShift updated = shiftService.updateShift(10L, request);

        // Values should remain unchanged
        assertThat(updated.getDateShift()).isEqualTo(LocalDate.of(2026, 8, 10));
        assertThat(updated.getTypeShift()).isEqualTo(TypeShift.MATIN);
        assertThat(updated.getTypePoste()).isEqualTo(TypePoste.SERVEUR);
        assertThat(updated.getHeureDebut()).isEqualTo("08:00");
        assertThat(updated.getHeureFin()).isEqualTo("16:00");
        assertThat(updated.getNotes()).isEqualTo("Service du matin");
    }

    @Test
    void updateShift_WithSameUserId_DoesNotRefetchUser() {
        // userId == shift.user.id → branch false on userId change check
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 12), TypeShift.COUPURE, TypePoste.CAISSE,
            "12:00", "20:00", "15:00", 60, null, null, BigDecimal.ZERO, BigDecimal.valueOf(7.0), new BigDecimal("8.0"), "Coupure"
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));
        when(shiftRepository.save(any(EmployeeShift.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeShift updated = shiftService.updateShift(10L, request);

        // userRepository should NOT be called since userId is the same
        verify(userRepository, never()).findById(1L);
        assertThat(updated.getTypeShift()).isEqualTo(TypeShift.COUPURE);
    }

    @Test
    void updateShift_WithNewUserId_UpdatesUserSuccessfully() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            2L, LocalDate.of(2026, 8, 12), TypeShift.SOIR, TypePoste.BARMAN,
            "16:00", "00:00", null, 30, null, null, null, null, null, "Transfer to new user"
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));
        when(userRepository.findById(2L)).thenReturn(Optional.of(newUser));
        when(shiftRepository.save(any(EmployeeShift.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeShift updated = shiftService.updateShift(10L, request);

        assertThat(updated.getUser()).isEqualTo(newUser);
        verify(userRepository).findById(2L);
    }

    @Test
    void createShift_WhenHeuresPrevuesNull_CalculatesFromTimesAndHandlesOvernight() {
        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.NUIT, TypePoste.BARMAN,
            "22:00", "06:00", "02:00", 60, null, null, null, null, null, "Overnight"
        );

        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(shiftRepository.save(any(EmployeeShift.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeShift created = shiftService.createShift(request);

        // 22:00 to 06:00 (8h) - 60 min break = 7.00h
        assertThat(created.getHeuresPrevues()).isEqualTo(new BigDecimal("7.00"));
        assertThat(created.getHeuresEffectuees()).isEqualTo(new BigDecimal("7.00"));
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    private void setSecurityContext(String username, String role) {
        org.springframework.security.core.Authentication auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
            username, "password", List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role))
        );
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void updateShift_ByEmployee_CanUpdateOwnClockingHours() {
        setSecurityContext("serveur1", "SERVEUR");

        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.MATIN, TypePoste.SERVEUR,
            "08:00", "16:00", null, null, "08:05", "16:15", BigDecimal.valueOf(0.25), BigDecimal.valueOf(8.0), BigDecimal.valueOf(8.25), "Arrivé 5m après"
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));
        when(shiftRepository.save(any(EmployeeShift.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeShift updated = shiftService.updateShift(10L, request);

        assertThat(updated.getHeureDebutReelle()).isEqualTo("08:05");
        assertThat(updated.getHeureFinReelle()).isEqualTo("16:15");
        assertThat(updated.getHeuresSup()).isEqualTo(BigDecimal.valueOf(0.25));
        assertThat(updated.getNotes()).isEqualTo("Arrivé 5m après");
    }

    @Test
    void updateShift_ByEmployee_WhenModifyingOtherEmployeeShift_ThrowsAccessDeniedException() {
        setSecurityContext("barman1", "BARMAN"); // barman1 tries to update serveur1's shift

        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.MATIN, TypePoste.SERVEUR,
            "08:00", "16:00", null, null, "08:00", "16:00", BigDecimal.ZERO, BigDecimal.valueOf(8.0), BigDecimal.valueOf(8.0), "Fraud"
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));

        assertThatThrownBy(() -> shiftService.updateShift(10L, request))
            .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
            .hasMessageContaining("Vous n'êtes pas autorisé à modifier les créneaux d'un autre employé");
    }

    @Test
    void updateShift_ByEmployee_WhenReassigningUser_ThrowsAccessDeniedException() {
        setSecurityContext("serveur1", "SERVEUR");

        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            2L, LocalDate.of(2026, 8, 10), TypeShift.MATIN, TypePoste.SERVEUR,
            "08:00", "16:00", null, null, "08:00", "16:00", BigDecimal.ZERO, BigDecimal.valueOf(8.0), BigDecimal.valueOf(8.0), "Reassign"
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));

        assertThatThrownBy(() -> shiftService.updateShift(10L, request))
            .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
            .hasMessageContaining("Vous ne pouvez pas réassigner un créneau à un autre employé");
    }

    @Test
    void updateShift_ByEmployee_WhenModifyingPlannedDate_ThrowsAccessDeniedException() {
        setSecurityContext("serveur1", "SERVEUR");

        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 15), TypeShift.MATIN, TypePoste.SERVEUR,
            "08:00", "16:00", null, null, null, null, null, null, null, null
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));

        assertThatThrownBy(() -> shiftService.updateShift(10L, request))
            .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
            .hasMessageContaining("Seul un manager peut modifier la date planifiée");
    }

    @Test
    void updateShift_ByEmployee_WhenModifyingPlannedHours_ThrowsAccessDeniedException() {
        setSecurityContext("serveur1", "SERVEUR");

        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.MATIN, TypePoste.SERVEUR,
            "10:00", "18:00", null, null, null, null, null, null, null, null
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));

        assertThatThrownBy(() -> shiftService.updateShift(10L, request))
            .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
            .hasMessageContaining("Seul un manager peut modifier l'heure de début planifiée");
    }

    @Test
    void updateShift_ByEmployee_WhenModifyingTypeShift_ThrowsAccessDeniedException() {
        setSecurityContext("serveur1", "SERVEUR");

        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.SOIR, TypePoste.SERVEUR,
            "08:00", "16:00", null, null, null, null, null, null, null, null
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));

        assertThatThrownBy(() -> shiftService.updateShift(10L, request))
            .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
            .hasMessageContaining("Seul un manager peut modifier le type de créneau planifié");
    }

    @Test
    void updateShift_ByEmployee_WhenModifyingTypePoste_ThrowsAccessDeniedException() {
        setSecurityContext("serveur1", "SERVEUR");

        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.MATIN, TypePoste.BARMAN,
            "08:00", "16:00", null, null, null, null, null, null, null, null
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));

        assertThatThrownBy(() -> shiftService.updateShift(10L, request))
            .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
            .hasMessageContaining("Seul un manager peut modifier le poste assigné");
    }

    @Test
    void updateShift_ByEmployee_WhenModifyingHeureFin_ThrowsAccessDeniedException() {
        setSecurityContext("serveur1", "SERVEUR");

        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 10), TypeShift.MATIN, TypePoste.SERVEUR,
            "08:00", "18:00", null, null, null, null, null, null, null, null
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));

        assertThatThrownBy(() -> shiftService.updateShift(10L, request))
            .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
            .hasMessageContaining("Seul un manager peut modifier l'heure de fin planifiée");
    }

    @Test
    void updateShift_ByAdmin_CanUpdateAllFields() {
        setSecurityContext("admin1", "ADMIN");

        EmployeeShiftRequestDTO request = new EmployeeShiftRequestDTO(
            1L, LocalDate.of(2026, 8, 11), TypeShift.SOIR, TypePoste.BARMAN,
            "18:00", "02:00", null, null, null, null, null, null, null, null
        );

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));
        when(shiftRepository.save(any(EmployeeShift.class))).thenAnswer(i -> i.getArgument(0));

        EmployeeShift updated = shiftService.updateShift(10L, request);

        assertThat(updated.getDateShift()).isEqualTo(LocalDate.of(2026, 8, 11));
        assertThat(updated.getTypeShift()).isEqualTo(TypeShift.SOIR);
    }

    @Test
    void deleteShift_Success() {
        when(shiftRepository.findById(10L)).thenReturn(Optional.of(sampleShift));

        shiftService.deleteShift(10L);

        verify(shiftRepository).delete(sampleShift);
    }
}

