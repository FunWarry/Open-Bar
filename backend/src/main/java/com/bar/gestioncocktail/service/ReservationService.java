package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.ReservationAvailabilityDTO;
import com.bar.gestioncocktail.dto.ReservationCreateRequest;
import com.bar.gestioncocktail.dto.ReservationDTO;
import com.bar.gestioncocktail.dto.ReservationUpdateRequest;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.Reservation;
import com.bar.gestioncocktail.model.ReservationStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.ReservationRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

/**
 * Service managing table reservations, advance booking schedules, table availability,
 * floor plan conflict detection, and guest arrival seating.
 */
@Service
public class ReservationService {

    private static final String RESERVATION_NOT_FOUND_MSG = "Reservation not found with id: ";
    private static final String TABLE_NOT_FOUND_MSG = "Table not found with id: ";
    private static final String TABLE_PREFIX = "Table ";
    private static final String RESOURCE_TYPE = "Reservation";

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;
    private final EstablishmentConfigService establishmentConfigService;
    private final NotificationService notificationService;
    private final TimeService timeService;
    private final AuditLogService auditLogService;
    private final TableService tableService;
    private final com.bar.gestioncocktail.repository.UserRepository userRepository;

    @Autowired
    public ReservationService(ReservationRepository reservationRepository,
                              TableRepository tableRepository,
                              EstablishmentConfigService establishmentConfigService,
                              NotificationService notificationService,
                              TimeService timeService,
                              AuditLogService auditLogService,
                              TableService tableService,
                              com.bar.gestioncocktail.repository.UserRepository userRepository) {
        this.reservationRepository = reservationRepository;
        this.tableRepository = tableRepository;
        this.establishmentConfigService = establishmentConfigService;
        this.notificationService = notificationService;
        this.timeService = timeService;
        this.auditLogService = auditLogService;
        this.tableService = tableService;
        this.userRepository = userRepository;
    }

    /**
     * Retrieves all reservations scheduled for a specific date.
     *
     * @param date Target reservation date (defaults to today if null)
     * @return List of matching reservation DTOs
     */
    @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByDate(LocalDate date) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);
        LocalDate targetDate = date != null ? date : getTodayDate();
        return reservationRepository.findByDateReservationOrderByHeureReservationAsc(targetDate).stream()
                .map(ReservationDTO::from)
                .toList();
    }

    /**
     * Retrieves reservations within an optional date range, filtered by status or search text.
     *
     * @param from   Start date (inclusive, defaults to today if null)
     * @param to     End date (inclusive, defaults to from if null)
     * @param statut Optional status filter
     * @param search Optional customer name or phone query
     * @return List of matching reservation DTOs
     */
    @Transactional(readOnly = true)
    public List<ReservationDTO> getReservations(LocalDate from, LocalDate to, ReservationStatut statut, String search) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);

        if (search != null && !search.isBlank()) {
            return reservationRepository.searchByCustomerInfo(search.trim()).stream()
                    .filter(r -> statut == null || r.getStatut() == statut)
                    .map(ReservationDTO::from)
                    .toList();
        }

        LocalDate startDate = from != null ? from : getTodayDate();
        LocalDate endDate = to != null ? to : startDate;

        List<Reservation> list = reservationRepository.findByDateReservationBetweenOrderByDateReservationAscHeureReservationAsc(startDate, endDate);
        return list.stream()
                .filter(r -> statut == null || r.getStatut() == statut)
                .map(ReservationDTO::from)
                .toList();
    }

    /**
     * Retrieves a single reservation by its identifier.
     *
     * @param id Reservation ID
     * @return The reservation DTO
     * @throws ResourceNotFoundException if reservation does not exist
     */
    @Transactional(readOnly = true)
    public ReservationDTO getReservationById(Long id) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);
        return reservationRepository.findById(id)
                .map(ReservationDTO::from)
                .orElseThrow(() -> new ResourceNotFoundException(RESERVATION_NOT_FOUND_MSG + id));
    }

    /**
     * Checks whether a given table is available for the requested time slot and party size.
     *
     * @param tableId              Target table identifier
     * @param date                 Reservation date
     * @param heure                Start time
     * @param dureeMinutes         Turn duration in minutes
     * @param nombrePersonnes      Party size
     * @param excludeReservationId Optional reservation ID to exclude (when editing)
     * @return {@link ReservationAvailabilityDTO} detailing availability and conflicts
     */
    @Transactional(readOnly = true)
    public ReservationAvailabilityDTO checkTableAvailability(Long tableId,
                                                             LocalDate date,
                                                             LocalTime heure,
                                                             int dureeMinutes,
                                                             Integer nombrePersonnes,
                                                             Long excludeReservationId) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);

        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + tableId));

        return computeTableAvailability(table, date, heure, dureeMinutes, nombrePersonnes, excludeReservationId);
    }

    private ReservationAvailabilityDTO computeTableAvailability(TableEntity table,
                                                               LocalDate date,
                                                               LocalTime heure,
                                                               int dureeMinutes,
                                                               Integer nombrePersonnes,
                                                               Long excludeReservationId) {
        boolean capacitySufficient = nombrePersonnes == null || table.getCapacite() >= nombrePersonnes;
        LocalTime reqStart = heure;
        LocalTime reqEnd = heure.plusMinutes(dureeMinutes > 0 ? dureeMinutes : 90);

        List<Reservation> tableBookings = reservationRepository.findByTableIdAndDateReservation(table.getId(), date);
        List<ReservationDTO> conflictingBookings = tableBookings.stream()
                .filter(existing -> excludeReservationId == null || !existing.getId().equals(excludeReservationId))
                .filter(existing -> existing.getStatut() != ReservationStatut.CANCELLED && existing.getStatut() != ReservationStatut.NO_SHOW)
                .filter(existing -> hasTimeOverlap(reqStart, reqEnd, existing.getHeureReservation(), existing.getDureeMinutes()))
                .map(ReservationDTO::from)
                .toList();

        boolean available = conflictingBookings.isEmpty();
        String message;
        if (!available) {
            message = TABLE_PREFIX + table.getNumero() + " has an overlapping reservation during this time slot.";
        } else if (!capacitySufficient) {
            message = TABLE_PREFIX + table.getNumero() + " capacity (" + table.getCapacite() + " pers) is less than party size (" + nombrePersonnes + " pers).";
        } else {
            message = TABLE_PREFIX + table.getNumero() + " is available.";
        }

        return new ReservationAvailabilityDTO(available, capacitySufficient, conflictingBookings, message);
    }

    private boolean hasTimeOverlap(LocalTime reqStart, LocalTime reqEnd, LocalTime existStart, Integer existDurationMinutes) {
        int duration = existDurationMinutes != null ? existDurationMinutes : 90;
        LocalTime existEnd = existStart.plusMinutes(duration);
        return existStart.isBefore(reqEnd) && reqStart.isBefore(existEnd);
    }

    /**
     * Creates and records a new reservation, validating table availability if assigned.
     *
     * @param request Booking creation request
     * @return Created reservation DTO
     */
    @Transactional
    public ReservationDTO createReservation(ReservationCreateRequest request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);

        TableEntity table = null;
        if (request.tableId() != null) {
            table = tableRepository.findById(request.tableId())
                    .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + request.tableId()));

            int duration = request.dureeMinutes() != null ? request.dureeMinutes() : 90;
            ReservationAvailabilityDTO availability = computeTableAvailability(
                    table, request.dateReservation(), request.heureReservation(),
                    duration, request.nombrePersonnes(), null);

            if (!availability.available()) {
                throw new BusinessException(TABLE_PREFIX + table.getNumero() + " is already booked for this time slot");
            }
        }

        Reservation reservation = new Reservation(
                request.nomClient().trim(),
                request.telephone() != null ? request.telephone().trim() : null,
                request.email() != null ? request.email().trim() : null,
                request.dateReservation(),
                request.heureReservation(),
                request.dureeMinutes() != null ? request.dureeMinutes() : 90,
                request.nombrePersonnes()
        );
        reservation.setNotes(request.notes() != null ? request.notes().trim() : null);
        reservation.setStatut(request.statut() != null ? request.statut() : ReservationStatut.CONFIRMED);
        reservation.setTable(table);

        Reservation saved = reservationRepository.save(reservation);
        ReservationDTO dto = ReservationDTO.from(saved);

        if (notificationService != null) {
            notificationService.notifierReservationMiseAJour(dto);
        }

        if (auditLogService != null) {
            auditLogService.logAction(null, "CREATE", RESOURCE_TYPE, saved.getId(),
                    "Created reservation for " + saved.getNomClient() + " (" + saved.getNombrePersonnes() + " pers)", null);
        }

        return dto;
    }

    /**
     * Updates an existing reservation details.
     *
     * @param id      Reservation ID
     * @param request Update payload
     * @return Updated reservation DTO
     */
    @Transactional
    public ReservationDTO updateReservation(Long id, ReservationUpdateRequest request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);

        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESERVATION_NOT_FOUND_MSG + id));

        TableEntity table = null;
        if (request.tableId() != null) {
            table = tableRepository.findById(request.tableId())
                    .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + request.tableId()));

            int duration = request.dureeMinutes() != null ? request.dureeMinutes() : 90;
            ReservationAvailabilityDTO availability = computeTableAvailability(
                    table, request.dateReservation(), request.heureReservation(),
                    duration, request.nombrePersonnes(), id);

            if (!availability.available()) {
                throw new BusinessException(TABLE_PREFIX + table.getNumero() + " is already booked for this time slot");
            }
        }

        reservation.setNomClient(request.nomClient().trim());
        reservation.setTelephone(request.telephone() != null ? request.telephone().trim() : null);
        reservation.setEmail(request.email() != null ? request.email().trim() : null);
        reservation.setDateReservation(request.dateReservation());
        reservation.setHeureReservation(request.heureReservation());
        reservation.setDureeMinutes(request.dureeMinutes() != null ? request.dureeMinutes() : 90);
        reservation.setNombrePersonnes(request.nombrePersonnes());
        reservation.setNotes(request.notes() != null ? request.notes().trim() : null);
        reservation.setStatut(request.statut() != null ? request.statut() : reservation.getStatut());
        reservation.setTable(table);

        Reservation saved = reservationRepository.save(reservation);
        ReservationDTO dto = ReservationDTO.from(saved);

        if (notificationService != null) {
            notificationService.notifierReservationMiseAJour(dto);
        }

        if (auditLogService != null) {
            auditLogService.logAction(null, "UPDATE", RESOURCE_TYPE, saved.getId(),
                    "Updated reservation for " + saved.getNomClient(), null);
        }

        return dto;
    }

    /**
     * Updates only the lifecycle status of an existing reservation.
     *
     * @param id     Reservation ID
     * @param statut New lifecycle status
     * @return Updated reservation DTO
     */
    @Transactional
    public ReservationDTO updateStatut(Long id, ReservationStatut statut) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);

        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESERVATION_NOT_FOUND_MSG + id));

        reservation.setStatut(statut);
        Reservation saved = reservationRepository.save(reservation);
        ReservationDTO dto = ReservationDTO.from(saved);

        if (notificationService != null) {
            notificationService.notifierReservationMiseAJour(dto);
        }

        return dto;
    }

    /**
     * Seats guests for a reservation, transitioning status to SEATED and occupying the physical table.
     *
     * @param id        Reservation ID
     * @param serveurId Optional waiter user ID seating the party
     * @return Updated reservation DTO
     */
    @Transactional
    public ReservationDTO seatReservation(Long id, Long serveurId) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);

        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESERVATION_NOT_FOUND_MSG + id));

        if (reservation.getTable() == null) {
            throw new BusinessException("Cannot seat reservation without an assigned table. Please assign a table first.");
        }

        TableEntity table = reservation.getTable();
        if (!table.isOccupee()) {
            tableService.occuperTable(table.getId(), serveurId);
        }

        reservation.setStatut(ReservationStatut.SEATED);
        Reservation saved = reservationRepository.save(reservation);
        ReservationDTO dto = ReservationDTO.from(saved);

        if (notificationService != null) {
            notificationService.notifierReservationMiseAJour(dto);
        }

        if (auditLogService != null) {
            com.bar.gestioncocktail.model.User user = serveurId != null
                    ? userRepository.findById(serveurId).orElse(null)
                    : null;
            auditLogService.logAction(user, "SEAT", RESOURCE_TYPE, saved.getId(),
                    "Seated party " + saved.getNomClient() + " at table #" + table.getNumero(), null);
        }

        return dto;
    }

    /**
     * Deletes a reservation from the system.
     *
     * @param id Reservation ID
     */
    @Transactional
    public void deleteReservation(Long id) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);

        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESERVATION_NOT_FOUND_MSG + id));

        reservationRepository.delete(reservation);

        ReservationDTO dto = ReservationDTO.from(reservation);
        if (notificationService != null) {
            notificationService.notifierReservationMiseAJour(dto);
        }

        if (auditLogService != null) {
            auditLogService.logAction(null, "DELETE", RESOURCE_TYPE, id,
                    "Deleted reservation for " + reservation.getNomClient(), null);
        }
    }

    /**
     * Checks if a table has an upcoming reservation within the specified look-ahead window.
     *
     * @param tableId     Target table ID
     * @param nextMinutes Look-ahead window in minutes (defaults to 60)
     * @return Optional containing the upcoming reservation DTO if any
     */
    @Transactional(readOnly = true)
    public Optional<ReservationDTO> getUpcomingReservationForTable(Long tableId, int nextMinutes) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);

        int window = nextMinutes > 0 ? nextMinutes : 60;
        LocalDateTime now = timeService != null ? timeService.now() : LocalDateTime.now(ZoneId.systemDefault());
        LocalDateTime windowEnd = now.plusMinutes(window);

        LocalDate today = now.toLocalDate();
        List<Reservation> todayBookings = reservationRepository.findByTableIdAndDateReservation(tableId, today);

        return todayBookings.stream()
                .filter(r -> r.getStatut() == ReservationStatut.CONFIRMED || r.getStatut() == ReservationStatut.PENDING)
                .filter(r -> {
                    LocalDateTime bookingTime = LocalDateTime.of(r.getDateReservation(), r.getHeureReservation());
                    // Upcoming within next window minutes (and up to 15 min past due before being marked no-show)
                    return bookingTime.isAfter(now.minusMinutes(15)) && bookingTime.isBefore(windowEnd);
                })
                .findFirst()
                .map(ReservationDTO::from);
    }

    /**
     * Retrieves all upcoming reservations across tables within the specified look-ahead window.
     *
     * @param nextMinutes Look-ahead window in minutes (defaults to 60)
     * @return List of upcoming reservation DTOs
     */
    @Transactional(readOnly = true)
    public List<ReservationDTO> getUpcomingReservations(int nextMinutes) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);

        int window = nextMinutes > 0 ? nextMinutes : 60;
        LocalDateTime now = timeService != null ? timeService.now() : LocalDateTime.now(ZoneId.systemDefault());
        LocalDateTime windowEnd = now.plusMinutes(window);

        LocalDate today = now.toLocalDate();
        List<Reservation> todayBookings = reservationRepository.findByDateReservationOrderByHeureReservationAsc(today);

        return todayBookings.stream()
                .filter(r -> r.getTable() != null)
                .filter(r -> r.getStatut() == ReservationStatut.CONFIRMED || r.getStatut() == ReservationStatut.PENDING)
                .filter(r -> {
                    LocalDateTime bookingTime = LocalDateTime.of(r.getDateReservation(), r.getHeureReservation());
                    return bookingTime.isAfter(now.minusMinutes(15)) && bookingTime.isBefore(windowEnd);
                })
                .map(ReservationDTO::from)
                .toList();
    }

    /**
     * Suggests previous customer names and phones for autocomplete based on a search term.
     *
     * @param query Search query
     * @return List of matching reservation profiles
     */
    @Transactional(readOnly = true)
    public List<ReservationDTO> getCustomerSuggestions(String query) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.TABLE_RESERVATIONS);
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        return reservationRepository.findSuggestionsByName(query.trim()).stream()
                .map(ReservationDTO::from)
                .limit(10)
                .toList();
    }

    private LocalDate getTodayDate() {
        return timeService != null ? timeService.now().toLocalDate() : LocalDate.now(ZoneId.systemDefault());
    }
}
