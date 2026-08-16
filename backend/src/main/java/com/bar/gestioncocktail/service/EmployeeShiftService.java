package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EmployeeShiftRequestDTO;
import com.bar.gestioncocktail.dto.EmployeeShiftResponseDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EmployeeShift;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.EmployeeShiftRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Service managing employee work shifts and weekly schedule calculations.
 */
@Service
@Transactional(readOnly = true)
public class EmployeeShiftService {
    private final EmployeeShiftRepository shiftRepository;
    private final UserRepository userRepository;
    private final ShiftAuditService shiftAuditService;

    /**
     * Constructs the shift service with required repositories and audit service.
     *
     * @param shiftRepository Repository for shift persistence
     * @param userRepository Repository for user lookup
     * @param shiftAuditService Service for recording shift audit logs
     */
    public EmployeeShiftService(EmployeeShiftRepository shiftRepository,
                                UserRepository userRepository,
                                ShiftAuditService shiftAuditService) {
        this.shiftRepository = shiftRepository;
        this.userRepository = userRepository;
        this.shiftAuditService = shiftAuditService;
    }

    /**
     * Retrieves all shifts.
     *
     * @return List of all shifts
     */
    public List<EmployeeShift> getAllShifts() {
        return shiftRepository.findAll();
    }

    /**
     * Retrieves shifts for a specific employee.
     *
     * @param userId Identifier of the user
     * @return List of employee shifts
     */
    public List<EmployeeShift> getShiftsByUserId(Long userId) {
        return shiftRepository.findByUserId(userId);
    }

    /**
     * Retrieves shifts for a given date range (weekly schedule view).
     *
     * @param debut Start date of the range (inclusive)
     * @param fin End date of the range (inclusive)
     * @return List of shifts in range
     */
    public List<EmployeeShift> getShiftsForWeek(LocalDate debut, LocalDate fin) {
        return shiftRepository.findByDateShiftBetween(debut, fin);
    }

    /**
     * Retrieves shifts for the week containing the specified date (Monday to Sunday).
     * If date is null, defaults to current date.
     *
     * @param date Date within the target week
     * @return List of shifts for that week
     */
    public List<EmployeeShift> getShiftsForWeekOfDate(LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now(java.time.ZoneId.systemDefault());
        LocalDate monday = target.with(java.time.DayOfWeek.MONDAY);
        LocalDate sunday = target.with(java.time.DayOfWeek.SUNDAY);
        return getShiftsForWeek(monday, sunday);
    }

    /**
     * Retrieves a shift by its unique identifier.
     *
     * @param id Identifier of the shift
     * @return Shift entity
     */
    public EmployeeShift getShiftById(Long id) {
        return shiftRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Shift not found with id: " + id));
    }

    /**
     * Creates a new employee shift.
     *
     * @param request Shift request data
     * @return Created shift entity
     */
    @Transactional
    public EmployeeShift createShift(EmployeeShiftRequestDTO request) {
        User user = userRepository.findById(request.userId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.userId()));

        EmployeeShift shift = new EmployeeShift();
        shift.setUser(user);
        shift.setDateShift(request.dateShift());
        shift.setTypeShift(request.typeShift());
        shift.setTypePoste(request.typePoste());
        shift.setHeureDebut(request.heureDebut());
        shift.setHeureFin(request.heureFin());
        shift.setHeurePauseDebut(request.heurePauseDebut());
        shift.setDureePauseMinutes(request.dureePauseMinutes() != null ? request.dureePauseMinutes() : 30);
        shift.setHeureDebutReelle(request.heureDebutReelle());
        shift.setHeureFinReelle(request.heureFinReelle());
        shift.setHeuresSup(request.heuresSup() != null ? request.heuresSup() : BigDecimal.ZERO);
        shift.setHeuresPrevues(request.heuresPrevues() != null ? request.heuresPrevues() : calculatePlannedHours(request.heureDebut(), request.heureFin(), request.dureePauseMinutes()));
        shift.setHeuresEffectuees(request.heuresEffectuees() != null ? request.heuresEffectuees() : shift.getHeuresPrevues());
        shift.setNotes(request.notes());

        EmployeeShift saved = shiftRepository.save(shift);
        shiftAuditService.logCreation(saved, getCurrentUsername());
        return saved;
    }

    /**
     * Calculates planned work hours based on start time, end time, and break duration.
     */
    private BigDecimal calculatePlannedHours(String start, String end, Integer breakMins) {
        if (start == null || end == null || !start.contains(":") || !end.contains(":")) {
            return BigDecimal.valueOf(8);
        }
        try {
            String[] s = start.split(":");
            String[] e = end.split(":");
            int sMin = Integer.parseInt(s[0]) * 60 + Integer.parseInt(s[1]);
            int eMin = Integer.parseInt(e[0]) * 60 + Integer.parseInt(e[1]);
            if (eMin <= sMin) {
                eMin += 24 * 60; // Shift spanning past midnight
            }
            int diff = eMin - sMin - (breakMins != null ? breakMins : 0);
            return BigDecimal.valueOf(Math.max(0, diff / 60.0)).setScale(2, java.math.RoundingMode.HALF_UP);
        } catch (Exception _) {
            return BigDecimal.valueOf(8);
        }
    }

    /**
     * Updates an existing employee shift.
     *
     * @param id Identifier of the shift to update
     * @param request Updated shift request data
     * @return Updated shift entity
     */
    @Transactional
    public EmployeeShift updateShift(Long id, EmployeeShiftRequestDTO request) {
        EmployeeShift shift = getShiftById(id);

        checkShiftUpdatePermission(shift, request);

        String previousSnapshot = shiftAuditService.toJson(EmployeeShiftResponseDTO.from(shift));

        if (request.userId() != null && !request.userId().equals(shift.getUser().getId())) {
            User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.userId()));
            shift.setUser(user);
        }

        applyScheduleUpdates(shift, request);
        applyClockingUpdates(shift, request);

        EmployeeShift saved = shiftRepository.save(shift);
        String newSnapshot = shiftAuditService.toJson(EmployeeShiftResponseDTO.from(saved));
        shiftAuditService.logUpdate(saved, previousSnapshot, newSnapshot, getCurrentUsername());

        return saved;
    }

    /**
     * Checks if the currently authenticated user is allowed to modify the given shift.
     * Rules:
     * - MANAGER or ADMIN: full modification access to all shifts (planning + actual hours).
     * - Regular employees (SERVEUR, BARMAN, etc.): can only update their own shift (shift.user.id == currentUser.id),
     *   and cannot change the planning schedule or reassign the shift user.
     *
     * @param shift Target shift entity
     * @param request Update request payload
     * @throws AccessDeniedException if the caller is not authorized
     */
    private void checkShiftUpdatePermission(EmployeeShift shift, EmployeeShiftRequestDTO request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || isManagerOrAdmin(auth)) {
            return;
        }

        validateEmployeeOwnership(shift, auth.getName(), request.userId());
        validatePlanningFieldsUnchanged(shift, request);
    }

    private boolean isManagerOrAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
            .anyMatch(a -> "ROLE_MANAGER".equals(a.getAuthority()) || "ROLE_ADMIN".equals(a.getAuthority()));
    }

    private void validateEmployeeOwnership(EmployeeShift shift, String currentUsername, Long requestedUserId) {
        User shiftUser = shift.getUser();
        if (shiftUser == null || !currentUsername.equals(shiftUser.getUsername())) {
            throw new AccessDeniedException("You are not authorized to modify shifts of another employee");
        }
        if (requestedUserId != null && !requestedUserId.equals(shiftUser.getId())) {
            throw new AccessDeniedException("You cannot reassign a shift to another employee");
        }
    }

    private void validatePlanningFieldsUnchanged(EmployeeShift shift, EmployeeShiftRequestDTO request) {
        if (request.dateShift() != null && !request.dateShift().equals(shift.getDateShift())) {
            throw new AccessDeniedException("Only a manager can modify the scheduled shift date");
        }
        if (request.typeShift() != null && request.typeShift() != shift.getTypeShift()) {
            throw new AccessDeniedException("Only a manager can modify the planned shift type");
        }
        if (request.typePoste() != null && request.typePoste() != shift.getTypePoste()) {
            throw new AccessDeniedException("Only a manager can modify the assigned job position");
        }
        if (request.heureDebut() != null && !request.heureDebut().equals(shift.getHeureDebut())) {
            throw new AccessDeniedException("Only a manager can modify the planned start time");
        }
        if (request.heureFin() != null && !request.heureFin().equals(shift.getHeureFin())) {
            throw new AccessDeniedException("Only a manager can modify the planned end time");
        }
    }

    private void applyScheduleUpdates(EmployeeShift shift, EmployeeShiftRequestDTO request) {
        if (request.dateShift() != null) shift.setDateShift(request.dateShift());
        if (request.typeShift() != null) shift.setTypeShift(request.typeShift());
        if (request.typePoste() != null) shift.setTypePoste(request.typePoste());
        if (request.heureDebut() != null) shift.setHeureDebut(request.heureDebut());
        if (request.heureFin() != null) shift.setHeureFin(request.heureFin());
        if (request.heurePauseDebut() != null) shift.setHeurePauseDebut(request.heurePauseDebut());
        if (request.dureePauseMinutes() != null) shift.setDureePauseMinutes(request.dureePauseMinutes());
        if (request.heuresPrevues() != null) {
            shift.setHeuresPrevues(request.heuresPrevues());
        } else if (request.heureDebut() != null || request.heureFin() != null) {
            shift.setHeuresPrevues(calculatePlannedHours(shift.getHeureDebut(), shift.getHeureFin(), shift.getDureePauseMinutes()));
        }
    }

    private void applyClockingUpdates(EmployeeShift shift, EmployeeShiftRequestDTO request) {
        if (request.heureDebutReelle() != null) shift.setHeureDebutReelle(request.heureDebutReelle());
        if (request.heureFinReelle() != null) shift.setHeureFinReelle(request.heureFinReelle());
        if (request.heuresSup() != null) shift.setHeuresSup(request.heuresSup());
        if (request.heuresEffectuees() != null) shift.setHeuresEffectuees(request.heuresEffectuees());
        if (request.notes() != null) shift.setNotes(request.notes());
    }

    /**
     * Deletes an employee shift.
     *
     * @param id Identifier of the shift to delete
     */
    @Transactional
    public void deleteShift(Long id) {
        EmployeeShift shift = getShiftById(id);
        String previousSnapshot = shiftAuditService.toJson(EmployeeShiftResponseDTO.from(shift));
        shiftAuditService.logDeletion(shift, previousSnapshot, getCurrentUsername());
        shiftRepository.delete(shift);
    }

    /**
     * Resolves the username of the currently authenticated principal.
     */
    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.isAuthenticated() && auth.getName() != null) ? auth.getName() : "SYSTEM";
    }
}

