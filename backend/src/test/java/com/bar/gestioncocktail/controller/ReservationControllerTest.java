package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.ReservationAvailabilityDTO;
import com.bar.gestioncocktail.dto.ReservationCreateRequest;
import com.bar.gestioncocktail.dto.ReservationDTO;
import com.bar.gestioncocktail.dto.ReservationUpdateRequest;
import com.bar.gestioncocktail.model.ReservationStatut;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.ReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Month;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for ReservationController verifying REST endpoint operations and security user resolution.
 */
@ExtendWith(MockitoExtension.class)
class ReservationControllerTest {

    @Mock
    private ReservationService reservationService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ReservationController reservationController;

    private ReservationDTO mockReservationDTO;
    private final LocalDate targetDate = LocalDate.of(2026, Month.AUGUST, 15);

    @BeforeEach
    void setUp() {
        mockReservationDTO = new ReservationDTO(
                1L,
                "Jean Dupont",
                "+33612345678",
                "jean@example.com",
                targetDate,
                LocalTime.of(19, 30),
                90,
                2,
                "Window seat",
                ReservationStatut.CONFIRMED,
                10L,
                1,
                2,
                "Salle",
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("getReservations - single date without other filters returns date reservations")
    void getReservationsSingleDateSuccess() {
        when(reservationService.getReservationsByDate(targetDate)).thenReturn(List.of(mockReservationDTO));

        ResponseEntity<List<ReservationDTO>> response = reservationController.getReservations(
                targetDate, null, null, null, null
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly(mockReservationDTO);
        verify(reservationService).getReservationsByDate(targetDate);
    }

    @Test
    @DisplayName("getReservations - date range and status filters delegates to full search")
    void getReservationsRangeAndFilterSuccess() {
        LocalDate from = targetDate;
        LocalDate to = targetDate.plusDays(7);
        when(reservationService.getReservations(from, to, ReservationStatut.CONFIRMED, "Jean"))
                .thenReturn(List.of(mockReservationDTO));

        ResponseEntity<List<ReservationDTO>> response = reservationController.getReservations(
                null, from, to, ReservationStatut.CONFIRMED, "Jean"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly(mockReservationDTO);
        verify(reservationService).getReservations(from, to, ReservationStatut.CONFIRMED, "Jean");
    }

    @Test
    @DisplayName("getReservationById - retrieves reservation by ID")
    void getReservationByIdSuccess() {
        when(reservationService.getReservationById(1L)).thenReturn(mockReservationDTO);

        ResponseEntity<ReservationDTO> response = reservationController.getReservationById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(mockReservationDTO);
        verify(reservationService).getReservationById(1L);
    }

    @Test
    @DisplayName("checkAvailability - evaluates table booking availability")
    void checkAvailabilitySuccess() {
        ReservationAvailabilityDTO availabilityDTO = new ReservationAvailabilityDTO(
                true, true, Collections.emptyList(), "Table is available"
        );
        when(reservationService.checkTableAvailability(10L, targetDate, LocalTime.of(19, 30), 90, 2, null))
                .thenReturn(availabilityDTO);

        ResponseEntity<ReservationAvailabilityDTO> response = reservationController.checkAvailability(
                10L, targetDate, LocalTime.of(19, 30), 90, 2, null
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(availabilityDTO);
        verify(reservationService).checkTableAvailability(10L, targetDate, LocalTime.of(19, 30), 90, 2, null);
    }

    @Test
    @DisplayName("getUpcoming - retrieves all upcoming reservations in next window")
    void getUpcomingSuccess() {
        when(reservationService.getUpcomingReservations(60)).thenReturn(List.of(mockReservationDTO));

        ResponseEntity<List<ReservationDTO>> response = reservationController.getUpcoming(60);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly(mockReservationDTO);
        verify(reservationService).getUpcomingReservations(60);
    }

    @Test
    @DisplayName("getUpcomingForTable - returns upcoming reservation when found")
    void getUpcomingForTableFound() {
        when(reservationService.getUpcomingReservationForTable(10L, 60))
                .thenReturn(Optional.of(mockReservationDTO));

        ResponseEntity<ReservationDTO> response = reservationController.getUpcomingForTable(10L, 60);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(mockReservationDTO);
    }

    @Test
    @DisplayName("getUpcomingForTable - returns 204 No Content when none found")
    void getUpcomingForTableNotFound() {
        when(reservationService.getUpcomingReservationForTable(10L, 60))
                .thenReturn(Optional.empty());

        ResponseEntity<ReservationDTO> response = reservationController.getUpcomingForTable(10L, 60);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(response.getBody()).isNull();
    }

    @Test
    @DisplayName("getSuggestions - returns repeat customer profiles")
    void getSuggestionsSuccess() {
        when(reservationService.getCustomerSuggestions("Jean")).thenReturn(List.of(mockReservationDTO));

        ResponseEntity<List<ReservationDTO>> response = reservationController.getSuggestions("Jean");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly(mockReservationDTO);
        verify(reservationService).getCustomerSuggestions("Jean");
    }

    @Test
    @DisplayName("createReservation - creates and returns 201 Created")
    void createReservationSuccess() {
        ReservationCreateRequest request = new ReservationCreateRequest(
                "Jean Dupont", "+33612345678", "jean@example.com",
                targetDate, LocalTime.of(19, 30), 90, 2, null,
                ReservationStatut.CONFIRMED, 10L
        );
        when(reservationService.createReservation(any(ReservationCreateRequest.class))).thenReturn(mockReservationDTO);

        ResponseEntity<ReservationDTO> response = reservationController.createReservation(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isEqualTo(mockReservationDTO);
        verify(reservationService).createReservation(request);
    }

    @Test
    @DisplayName("updateReservation - updates reservation and returns 200 OK")
    void updateReservationSuccess() {
        ReservationUpdateRequest updateRequest = new ReservationUpdateRequest(
                "Jean Dupont", "+33612345678", "jean@example.com",
                targetDate, LocalTime.of(20, 0), 90, 2, "Updated notes",
                ReservationStatut.CONFIRMED, 10L
        );
        when(reservationService.updateReservation(eq(1L), any(ReservationUpdateRequest.class)))
                .thenReturn(mockReservationDTO);

        ResponseEntity<ReservationDTO> response = reservationController.updateReservation(1L, updateRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(mockReservationDTO);
        verify(reservationService).updateReservation(1L, updateRequest);
    }

    @Test
    @DisplayName("updateStatut - patches reservation status")
    void updateStatutSuccess() {
        when(reservationService.updateStatut(1L, ReservationStatut.SEATED)).thenReturn(mockReservationDTO);

        ResponseEntity<ReservationDTO> response = reservationController.updateStatut(1L, ReservationStatut.SEATED);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(mockReservationDTO);
        verify(reservationService).updateStatut(1L, ReservationStatut.SEATED);
    }

    @Test
    @DisplayName("seatReservation - resolves user ID from auth and seats guests")
    void seatReservationWithAuthSuccess() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("serveur1");

        User user = new User();
        user.setId(42L);
        user.setUsername("serveur1");
        when(userRepository.findByUsername("serveur1")).thenReturn(Optional.of(user));
        when(reservationService.seatReservation(1L, 42L)).thenReturn(mockReservationDTO);

        ResponseEntity<ReservationDTO> response = reservationController.seatReservation(1L, auth);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(mockReservationDTO);
        verify(reservationService).seatReservation(1L, 42L);
    }

    @Test
    @DisplayName("seatReservation - handles missing authentication context gracefully")
    void seatReservationWithoutAuthSuccess() {
        when(reservationService.seatReservation(1L, null)).thenReturn(mockReservationDTO);

        ResponseEntity<ReservationDTO> response = reservationController.seatReservation(1L, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(mockReservationDTO);
        verify(reservationService).seatReservation(1L, null);
    }

    @Test
    @DisplayName("deleteReservation - deletes reservation and returns 204 No Content")
    void deleteReservationSuccess() {
        ResponseEntity<Void> response = reservationController.deleteReservation(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(reservationService).deleteReservation(1L);
    }
}
