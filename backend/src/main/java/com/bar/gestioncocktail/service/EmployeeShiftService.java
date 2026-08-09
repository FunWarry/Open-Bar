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
        shift.setHeuresEffectuees(request.heuresEffectuees() != null ? request.heuresEffectuees() : BigDecimal.ZERO);
        shift.setNotes(request.notes());

        return shiftRepository.save(shift);
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

        if (request.dateShift() != null) shift.setDateShift(request.dateShift());
        if (request.typeShift() != null) shift.setTypeShift(request.typeShift());
        if (request.typePoste() != null) shift.setTypePoste(request.typePoste());
        if (request.heureDebut() != null) shift.setHeureDebut(request.heureDebut());
        if (request.heureFin() != null) shift.setHeureFin(request.heureFin());
        if (request.heuresEffectuees() != null) shift.setHeuresEffectuees(request.heuresEffectuees());
        if (request.notes() != null) shift.setNotes(request.notes());

        return shiftRepository.save(shift);
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
