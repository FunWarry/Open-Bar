package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.ReservationRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Month;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ReservationService}.
 */
@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TableService tableService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private AuditLogService auditLogService;

    @Spy
    private TimeService timeService = new TimeService(null);

    @InjectMocks
    private ReservationService reservationService;

    private TableEntity table1;
    private Reservation reservation1;
    private final LocalDate testDate = LocalDate.of(2026, Month.AUGUST, 15);
    private final LocalTime testTime = LocalTime.of(19, 30);

    @BeforeEach
    void setUp() {
        table1 = new TableEntity();
        table1.setId(10L);
        table1.setNumero(1);
        table1.setCapacite(4);
        table1.setOccupee(false);

        reservation1 = new Reservation(
                "Dupont", "+33612345678", "dupont@mail.fr",
                testDate, testTime, 90, 4
        );
        reservation1.setNotes("Window table");
        reservation1.setStatut(ReservationStatut.CONFIRMED);
        reservation1.setTable(table1);
        reservation1.setId(100L);
    }

    @Test
    @DisplayName("createReservation: successfully creates reservation without assigned table")
    void createReservation_unassignedTable_success() {
        ReservationCreateRequest request = new ReservationCreateRequest(
                "Martin", "+33687654321", null,
                testDate, testTime, 90, 2, null, ReservationStatut.CONFIRMED, null
        );

        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            r.setId(101L);
            return r;
        });

        ReservationDTO result = reservationService.createReservation(request);

        assertThat(result).isNotNull();
        assertThat(result.nomClient()).isEqualTo("Martin");
        assertThat(result.tableId()).isNull();
        verify(reservationRepository).save(any(Reservation.class));
        verify(notificationService).notifierReservationMiseAJour(any());
    }

    @Test
    @DisplayName("createReservation: successfully creates reservation with assigned table when available")
    void createReservation_assignedTable_success() {
        ReservationCreateRequest request = new ReservationCreateRequest(
                "Dupont", "+33612345678", "dupont@mail.fr",
                testDate, testTime, 90, 4, "Window table", ReservationStatut.CONFIRMED, 10L
        );

        when(tableRepository.findById(10L)).thenReturn(Optional.of(table1));
        when(reservationRepository.findByTableIdAndDateReservation(10L, testDate)).thenReturn(List.of());
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            r.setId(100L);
            return r;
        });

        ReservationDTO result = reservationService.createReservation(request);

        assertThat(result).isNotNull();
        assertThat(result.tableId()).isEqualTo(10L);
        assertThat(result.tableNumero()).isEqualTo(1);
        verify(tableRepository).findById(10L);
        verify(reservationRepository).save(any(Reservation.class));
    }

    @Test
    @DisplayName("createReservation: throws ResourceNotFoundException when table does not exist")
    void createReservation_tableNotFound_throwsException() {
        ReservationCreateRequest request = new ReservationCreateRequest(
                "Dupont", "+33612345678", null,
                testDate, testTime, 90, 4, null, ReservationStatut.CONFIRMED, 999L
        );

        when(tableRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reservationService.createReservation(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Table not found with id: 999");
    }

    @Test
    @DisplayName("createReservation: throws BusinessException when table is already booked during time slot")
    void createReservation_conflict_throwsException() {
        ReservationCreateRequest request = new ReservationCreateRequest(
                "Durand", "+33699887766", null,
                testDate, LocalTime.of(20, 0), 90, 2, null, ReservationStatut.CONFIRMED, 10L
        );

        when(tableRepository.findById(10L)).thenReturn(Optional.of(table1));
        // Overlapping reservation exists from 19:30 to 21:00
        when(reservationRepository.findByTableIdAndDateReservation(10L, testDate)).thenReturn(List.of(reservation1));

        assertThatThrownBy(() -> reservationService.createReservation(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("is already booked for this time slot");
    }

    @Test
    @DisplayName("checkTableAvailability: detects conflicting overlap when time windows intersect")
    void checkTableAvailability_detectsOverlap() {
        when(tableRepository.findById(10L)).thenReturn(Optional.of(table1));
        when(reservationRepository.findByTableIdAndDateReservation(10L, testDate)).thenReturn(List.of(reservation1));

        // Existing is 19:30 - 21:00. Requested is 20:15 - 21:45
        ReservationAvailabilityDTO result = reservationService.checkTableAvailability(
                10L, testDate, LocalTime.of(20, 15), 90, 4, null);

        assertThat(result.available()).isFalse();
        assertThat(result.conflictingBookings()).hasSize(1);
    }

    @Test
    @DisplayName("checkTableAvailability: warns when party size exceeds table capacity")
    void checkTableAvailability_capacityWarning() {
        when(tableRepository.findById(10L)).thenReturn(Optional.of(table1));
        when(reservationRepository.findByTableIdAndDateReservation(10L, testDate)).thenReturn(List.of());

        // Table capacity is 4, party size is 8
        ReservationAvailabilityDTO result = reservationService.checkTableAvailability(
                10L, testDate, testTime, 90, 8, null);

        assertThat(result.available()).isTrue();
        assertThat(result.capacitySufficient()).isFalse();
        assertThat(result.message()).contains("capacity (4 pers) is less than party size (8 pers)");
    }

    @Test
    @DisplayName("updateReservation: successfully updates details and table assignment")
    void updateReservation_success() {
        ReservationUpdateRequest updateRequest = new ReservationUpdateRequest(
                "Dupont Updated", "+33612345678", "updated@mail.fr",
                testDate, LocalTime.of(20, 0), 90, 4, "Updated notes", ReservationStatut.CONFIRMED, 10L
        );

        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation1));
        when(tableRepository.findById(10L)).thenReturn(Optional.of(table1));
        when(reservationRepository.findByTableIdAndDateReservation(10L, testDate)).thenReturn(List.of(reservation1));
        when(reservationRepository.save(any(Reservation.class))).thenReturn(reservation1);

        ReservationDTO result = reservationService.updateReservation(100L, updateRequest);

        assertThat(result).isNotNull();
        assertThat(reservation1.getNomClient()).isEqualTo("Dupont Updated");
        verify(notificationService).notifierReservationMiseAJour(any());
    }

    @Test
    @DisplayName("updateStatut: successfully updates reservation status")
    void updateStatut_success() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation1));
        when(reservationRepository.save(any(Reservation.class))).thenReturn(reservation1);

        ReservationDTO result = reservationService.updateStatut(100L, ReservationStatut.CANCELLED);

        assertThat(result).isNotNull();
        assertThat(reservation1.getStatut()).isEqualTo(ReservationStatut.CANCELLED);
        verify(notificationService).notifierReservationMiseAJour(any());
    }

    @Test
    @DisplayName("seatReservation: marks reservation SEATED and table occupied")
    void seatReservation_success() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation1));
        when(reservationRepository.save(any(Reservation.class))).thenReturn(reservation1);

        ReservationDTO result = reservationService.seatReservation(100L, null);

        assertThat(result).isNotNull();
        assertThat(reservation1.getStatut()).isEqualTo(ReservationStatut.SEATED);
        verify(tableService).occuperTable(eq(10L), any());
        verify(notificationService).notifierReservationMiseAJour(any());
    }

    @Test
    @DisplayName("seatReservation: throws BusinessException when reservation has no assigned table")
    void seatReservation_noTable_throwsException() {
        reservation1.setTable(null);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation1));

        assertThatThrownBy(() -> reservationService.seatReservation(100L, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot seat reservation without an assigned table");
    }

    @Test
    @DisplayName("deleteReservation: deletes reservation and triggers audit log")
    void deleteReservation_success() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation1));

        reservationService.deleteReservation(100L);

        verify(reservationRepository).delete(reservation1);
        verify(notificationService).notifierReservationMiseAJour(any());
    }

    @Test
    @DisplayName("getCustomerSuggestions: returns matching customer profiles")
    void getCustomerSuggestions_returnsMatches() {
        when(reservationRepository.findSuggestionsByName("Dup")).thenReturn(List.of(reservation1));

        List<ReservationDTO> results = reservationService.getCustomerSuggestions("Dup");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).nomClient()).isEqualTo("Dupont");
    }

    @Test
    @DisplayName("getCustomerSuggestions: returns empty list for short or null query")
    void getCustomerSuggestions_shortQuery_returnsEmpty() {
        assertThat(reservationService.getCustomerSuggestions(null)).isEmpty();
        assertThat(reservationService.getCustomerSuggestions(" ")).isEmpty();
        assertThat(reservationService.getCustomerSuggestions("a")).isEmpty();
    }

    @Test
    @DisplayName("getReservationsByDate: returns reservations for specified date or defaults to today")
    void getReservationsByDate_returnsList() {
        when(reservationRepository.findByDateReservationOrderByHeureReservationAsc(testDate))
                .thenReturn(List.of(reservation1));

        List<ReservationDTO> results = reservationService.getReservationsByDate(testDate);
        assertThat(results).hasSize(1);
        assertThat(results.get(0).nomClient()).isEqualTo("Dupont");

        List<ReservationDTO> defaultDateResults = reservationService.getReservationsByDate(null);
        assertThat(defaultDateResults).isNotNull();
    }

    @Test
    @DisplayName("getReservations: filters by customer search query")
    void getReservations_withSearch_returnsFiltered() {
        when(reservationRepository.searchByCustomerInfo("Dupont"))
                .thenReturn(List.of(reservation1));

        List<ReservationDTO> results = reservationService.getReservations(null, null, ReservationStatut.CONFIRMED, "Dupont");
        assertThat(results).hasSize(1);

        List<ReservationDTO> filteredOut = reservationService.getReservations(null, null, ReservationStatut.CANCELLED, "Dupont");
        assertThat(filteredOut).isEmpty();
    }

    @Test
    @DisplayName("getReservations: filters by date range and status without search")
    void getReservations_withDateRange_returnsFiltered() {
        when(reservationRepository.findByDateReservationBetweenOrderByDateReservationAscHeureReservationAsc(testDate, testDate))
                .thenReturn(List.of(reservation1));

        List<ReservationDTO> results = reservationService.getReservations(testDate, testDate, null, null);
        assertThat(results).hasSize(1);
    }

    @Test
    @DisplayName("getReservationById: returns DTO or throws ResourceNotFoundException")
    void getReservationById_scenarios() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation1));
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThat(reservationService.getReservationById(100L)).isNotNull();

        assertThatThrownBy(() -> reservationService.getReservationById(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("createReservation: successfully creates reservation without assigned table")
    void createReservation_withoutTable_success() {
        ReservationCreateRequest request = new ReservationCreateRequest(
                "Martin", "+33611223344", "martin@test.fr",
                testDate, testTime, 60, 2, "Window seat", ReservationStatut.CONFIRMED, null
        );

        Reservation savedReservation = new Reservation("Martin", "+33611223344", "martin@test.fr", testDate, testTime, 60, 2);
        savedReservation.setId(101L);
        when(reservationRepository.save(any(Reservation.class))).thenReturn(savedReservation);

        ReservationDTO result = reservationService.createReservation(request);
        assertThat(result).isNotNull();
        assertThat(result.nomClient()).isEqualTo("Martin");
        verify(notificationService).notifierReservationMiseAJour(any());
    }

    @Test
    @DisplayName("updateReservation: throws ResourceNotFoundException when reservation or table not found")
    void updateReservation_notFoundScenarios() {
        ReservationUpdateRequest request = new ReservationUpdateRequest(
                "Unknown", null, null, testDate, testTime, 90, 2, null, ReservationStatut.CONFIRMED, 999L
        );

        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> reservationService.updateReservation(999L, request))
                .isInstanceOf(ResourceNotFoundException.class);

        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation1));
        when(tableRepository.findById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> reservationService.updateReservation(100L, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("updateStatut: throws ResourceNotFoundException when reservation missing")
    void updateStatut_notFound_throwsException() {
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> reservationService.updateStatut(999L, ReservationStatut.SEATED))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("seatReservation: handles occupied table and serveur user logging")
    void seatReservation_tableAlreadyOccupied_andWithServeur() {
        table1.setOccupee(true);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation1));
        when(reservationRepository.save(any(Reservation.class))).thenReturn(reservation1);
        when(userRepository.findById(5L)).thenReturn(Optional.empty());

        ReservationDTO result = reservationService.seatReservation(100L, 5L);
        assertThat(result).isNotNull();
        verify(tableService, never()).occuperTable(any(), any());
    }

    @Test
    @DisplayName("deleteReservation: throws ResourceNotFoundException when missing")
    void deleteReservation_notFound_throwsException() {
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> reservationService.deleteReservation(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getUpcomingReservationForTable & getUpcomingReservations: return upcoming bookings")
    void upcomingReservations_scenarios() {
        when(reservationRepository.findByTableIdAndDateReservation(eq(10L), any(LocalDate.class)))
                .thenReturn(List.of(reservation1));
        when(reservationRepository.findByDateReservationOrderByHeureReservationAsc(any(LocalDate.class)))
                .thenReturn(List.of(reservation1));

        Optional<ReservationDTO> upcoming = reservationService.getUpcomingReservationForTable(10L, 120);
        assertThat(upcoming).isNotNull();

        List<ReservationDTO> allUpcoming = reservationService.getUpcomingReservations(120);
        assertThat(allUpcoming).isNotNull();
    }
}
