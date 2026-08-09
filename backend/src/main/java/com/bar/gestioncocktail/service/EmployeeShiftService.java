package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EmployeeShiftRequestDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EmployeeShift;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.EmployeeShiftRepository;
import com.bar.gestioncocktail.repository.UserRepository;
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

    /**
     * Constructs the shift service with required repositories.
     *
     * @param shiftRepository Repository for shift persistence
     * @param userRepository Repository for user lookup
     */
    public EmployeeShiftService(EmployeeShiftRepository shiftRepository, UserRepository userRepository) {
        this.shiftRepository = shiftRepository;
        this.userRepository = userRepository;
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
            .orElseThrow(() -> new ResourceNotFoundException("Shift non trouvé avec l'id: " + id));
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
            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'id: " + request.userId()));

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

        return shiftRepository.save(shift);
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

        if (request.userId() != null && !request.userId().equals(shift.getUser().getId())) {
            User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'id: " + request.userId()));
            shift.setUser(user);
        }

        applyScheduleUpdates(shift, request);
        applyClockingUpdates(shift, request);

        return shiftRepository.save(shift);
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
        shiftRepository.delete(shift);
    }
}
