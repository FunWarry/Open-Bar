package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.ReservationAvailabilityDTO;
import com.bar.gestioncocktail.dto.ReservationCreateRequest;
import com.bar.gestioncocktail.dto.ReservationDTO;
import com.bar.gestioncocktail.dto.ReservationUpdateRequest;
import com.bar.gestioncocktail.model.ReservationStatut;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.ReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * REST controller managing table reservations, advance booking schedules,
 * availability conflict checks, and floor plan customer seating.
 */
@RestController
@RequestMapping("/api/reservations")
@Tag(name = "Reservations", description = "Endpoints for managing table reservations and floor plan seating")
public class ReservationController {

    private final ReservationService reservationService;
    private final UserRepository userRepository;

    @Autowired
    public ReservationController(ReservationService reservationService, UserRepository userRepository) {
        this.reservationService = reservationService;
        this.userRepository = userRepository;
    }

    /**
     * Retrieves table reservations filtered by date, date range, status, or customer search.
     *
     * @param date   Target date (optional single date filter)
     * @param from   Start date of range (optional)
     * @param to     End date of range (optional)
     * @param statut Reservation status filter (optional)
     * @param search Search query by customer name or phone (optional)
     * @return List of matching reservation DTOs
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "List reservations", description = "Retrieves reservations with optional date, range, status, or search filters.")
    @ApiResponse(responseCode = "200", description = "Reservations retrieved successfully")
    public ResponseEntity<List<ReservationDTO>> getReservations(
            @Parameter(description = "Specific reservation date (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Parameter(description = "Start date of range (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date of range (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Status filter (PENDING, CONFIRMED, SEATED, CANCELLED, NO_SHOW)")
            @RequestParam(required = false) ReservationStatut statut,
            @Parameter(description = "Search query for customer name or phone")
            @RequestParam(required = false) String search) {

        if (date != null && from == null && to == null && search == null && statut == null) {
            return ResponseEntity.ok(reservationService.getReservationsByDate(date));
        }

        LocalDate startDate = from != null ? from : date;
        LocalDate endDate = to != null ? to : startDate;

        return ResponseEntity.ok(reservationService.getReservations(startDate, endDate, statut, search));
    }

    /**
     * Retrieves a single reservation by its identifier.
     *
     * @param id Reservation ID
     * @return Reservation DTO
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Get reservation by ID", description = "Retrieves full details for a specific reservation.")
    @ApiResponse(responseCode = "200", description = "Reservation found")
    @ApiResponse(responseCode = "404", description = "Reservation not found")
    public ResponseEntity<ReservationDTO> getReservationById(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.getReservationById(id));
    }

    /**
     * Checks table availability and seating capacity for a requested date, time, and duration.
     *
     * @param tableId         Target table identifier
     * @param date            Reservation date
     * @param heure           Start time
     * @param dureeMinutes    Turn duration in minutes (defaults to 90)
     * @param nombrePersonnes Party size (optional)
     * @param excludeId       Optional reservation ID to ignore during conflict evaluation
     * @return Availability evaluation DTO
     */
    @GetMapping("/check-availability")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Check table availability", description = "Evaluates whether a table is free from overlapping bookings.")
    public ResponseEntity<ReservationAvailabilityDTO> checkAvailability(
            @RequestParam Long tableId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime heure,
            @RequestParam(defaultValue = "90") int dureeMinutes,
            @RequestParam(required = false) Integer nombrePersonnes,
            @RequestParam(required = false) Long excludeId) {

        return ResponseEntity.ok(reservationService.checkTableAvailability(
                tableId, date, heure, dureeMinutes, nombrePersonnes, excludeId));
    }

    /**
     * Retrieves all upcoming reservations across tables within the next look-ahead window.
     *
     * @param nextMinutes Look-ahead window in minutes (defaults to 60)
     * @return List of upcoming reservation DTOs
     */
    @GetMapping("/upcoming")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Get all upcoming reservations", description = "Finds all reservations within the next N minutes.")
    public ResponseEntity<List<ReservationDTO>> getUpcoming(
            @RequestParam(defaultValue = "60") int nextMinutes) {
        return ResponseEntity.ok(reservationService.getUpcomingReservations(nextMinutes));
    }

    /**
     * Retrieves an upcoming reservation for a specific table within the next look-ahead window.
     *
     * @param tableId     Target table ID
     * @param nextMinutes Look-ahead window in minutes (defaults to 60)
     * @return Upcoming reservation DTO or 204 No Content
     */
    @GetMapping("/upcoming/{tableId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Get upcoming reservation for table", description = "Finds if a table has an imminent booking within the next N minutes.")
    public ResponseEntity<ReservationDTO> getUpcomingForTable(
            @PathVariable Long tableId,
            @RequestParam(defaultValue = "60") int nextMinutes) {

        return reservationService.getUpcomingReservationForTable(tableId, nextMinutes)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * Searches past reservations to suggest previous customer contact profiles for auto-completion.
     *
     * @param query Search query text
     * @return List of matching customer profiles
     */
    @GetMapping("/suggestions")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Suggest repeat customer profiles", description = "Returns customer name and phone suggestions for quick reservation entry.")
    public ResponseEntity<List<ReservationDTO>> getSuggestions(@RequestParam String query) {
        return ResponseEntity.ok(reservationService.getCustomerSuggestions(query));
    }

    /**
     * Creates a new advance table reservation.
     *
     * @param request Booking creation payload
     * @return Created reservation DTO
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Create reservation", description = "Records a new reservation with optional table assignment and conflict validation.")
    @ApiResponse(responseCode = "201", description = "Reservation created successfully")
    @ApiResponse(responseCode = "400", description = "Validation error or table booking conflict")
    public ResponseEntity<ReservationDTO> createReservation(@Valid @RequestBody ReservationCreateRequest request) {
        ReservationDTO created = reservationService.createReservation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing table reservation.
     *
     * @param id      Reservation ID
     * @param request Update payload
     * @return Updated reservation DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Update reservation", description = "Updates customer information, schedule, party size, or assigned table.")
    public ResponseEntity<ReservationDTO> updateReservation(
            @PathVariable Long id,
            @Valid @RequestBody ReservationUpdateRequest request) {

        return ResponseEntity.ok(reservationService.updateReservation(id, request));
    }

    /**
     * Updates only the lifecycle status of an existing reservation.
     *
     * @param id     Reservation ID
     * @param statut New lifecycle status
     * @return Updated reservation DTO
     */
    @PatchMapping("/{id}/statut")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Update reservation status", description = "Transitions reservation state (CONFIRMED, SEATED, CANCELLED, NO_SHOW).")
    public ResponseEntity<ReservationDTO> updateStatut(
            @PathVariable Long id,
            @RequestParam ReservationStatut statut) {

        return ResponseEntity.ok(reservationService.updateStatut(id, statut));
    }

    /**
     * Seats guests upon arrival, transitioning the reservation to SEATED and occupying the physical table.
     *
     * @param id             Reservation ID
     * @param authentication Current user authentication context
     * @return Updated reservation DTO
     */
    @PostMapping("/{id}/seat")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Seat reservation guests", description = "Marks guests as seated and sets the physical table to occupied.")
    public ResponseEntity<ReservationDTO> seatReservation(
            @PathVariable Long id,
            Authentication authentication) {

        Long currentUserId = resolveUserId(authentication);
        return ResponseEntity.ok(reservationService.seatReservation(id, currentUserId));
    }

    /**
     * Deletes a reservation from the system.
     *
     * @param id Reservation ID
     * @return No content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Delete reservation", description = "Permanently removes a reservation (restricted to ADMIN and MANAGER).")
    public ResponseEntity<Void> deleteReservation(@PathVariable Long id) {
        reservationService.deleteReservation(id);
        return ResponseEntity.noContent().build();
    }

    private Long resolveUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        Optional<User> userOpt = userRepository.findByUsername(authentication.getName());
        return userOpt.isPresent() ? userOpt.get().getId() : null;
    }
}
