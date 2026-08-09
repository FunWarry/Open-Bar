package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EmployeeShiftRequestDTO;
import com.bar.gestioncocktail.dto.EmployeeShiftResponseDTO;
import com.bar.gestioncocktail.service.EmployeeShiftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * REST Controller for managing employee work shifts and weekly schedules.
 */
@RestController
@RequestMapping("/api/shifts")
@Tag(name = "Shifts", description = "Management of employee work shifts and weekly schedules (MANAGER, ADMIN)")
public class EmployeeShiftController {
    private final EmployeeShiftService shiftService;

    /**
     * Constructs the controller with the shift service.
     *
     * @param shiftService Shift service implementation
     */
    public EmployeeShiftController(EmployeeShiftService shiftService) {
        this.shiftService = shiftService;
    }

    /**
     * Retrieves all shifts.
     *
     * @return List of all shift DTOs
     */
    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "Get all employee shifts", description = "Retrieves all registered work shifts.")
    @ApiResponse(responseCode = "200", description = "List of shifts retrieved")
    public ResponseEntity<List<EmployeeShiftResponseDTO>> getAllShifts() {
        return ResponseEntity.ok(shiftService.getAllShifts().stream()
            .map(EmployeeShiftResponseDTO::from)
            .toList());
    }

    /**
     * Retrieves a single shift by ID.
     *
     * @param id Shift identifier
     * @return Shift DTO
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('SERVEUR') or hasRole('BARMAN')")
    @Operation(summary = "Get shift by ID", description = "Retrieves details of a specific work shift.")
    @ApiResponse(responseCode = "200", description = "Shift details retrieved")
    public ResponseEntity<EmployeeShiftResponseDTO> getShiftById(@PathVariable Long id) {
        return ResponseEntity.ok(EmployeeShiftResponseDTO.from(shiftService.getShiftById(id)));
    }

    /**
     * Retrieves shifts for a specific date range or week.
     *
     * @param date Optional date in the target week
     * @param debut Optional start date (inclusive, YYYY-MM-DD)
     * @param fin Optional end date (inclusive, YYYY-MM-DD)
     * @return List of shift DTOs in week
     */
    @GetMapping("/week")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('SERVEUR') or hasRole('BARMAN')")
    @Operation(summary = "Get weekly shifts", description = "Retrieves shifts for the week containing 'date', or between 'debut' and 'fin'.")
    @ApiResponse(responseCode = "200", description = "Weekly shifts retrieved")
    public ResponseEntity<List<EmployeeShiftResponseDTO>> getShiftsForWeek(
        @Parameter(description = "Date in target week (YYYY-MM-DD)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @Parameter(description = "Start date (YYYY-MM-DD)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate debut,
        @Parameter(description = "End date (YYYY-MM-DD)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {

        if (debut != null && fin != null) {
            return ResponseEntity.ok(shiftService.getShiftsForWeek(debut, fin).stream()
                .map(EmployeeShiftResponseDTO::from)
                .toList());
        }

        return ResponseEntity.ok(shiftService.getShiftsForWeekOfDate(date != null ? date : LocalDate.now(java.time.ZoneId.systemDefault())).stream()
            .map(EmployeeShiftResponseDTO::from)
            .toList());
    }

    /**
     * Retrieves shifts within a specified date range.
     *
     * @param from Start date (inclusive, YYYY-MM-DD)
     * @param to End date (inclusive, YYYY-MM-DD)
     * @return List of shift DTOs in range
     */
    @GetMapping("/range")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('SERVEUR') or hasRole('BARMAN')")
    @Operation(summary = "Get shifts in date range", description = "Retrieves shifts between from and to dates.")
    @ApiResponse(responseCode = "200", description = "Shifts in date range retrieved")
    public ResponseEntity<List<EmployeeShiftResponseDTO>> getShiftsForRange(
        @Parameter(description = "Start date (YYYY-MM-DD)") @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @Parameter(description = "End date (YYYY-MM-DD)") @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(shiftService.getShiftsForWeek(from, to).stream()
            .map(EmployeeShiftResponseDTO::from)
            .toList());
    }

    /**
     * Retrieves shifts for a specific user.
     *
     * @param userId User identifier
     * @return List of shift DTOs for the user
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or #userId == authentication.principal.id")
    @Operation(summary = "Get user shifts", description = "Retrieves work shifts for a given employee.")
    @ApiResponse(responseCode = "200", description = "User shifts retrieved")
    public ResponseEntity<List<EmployeeShiftResponseDTO>> getShiftsByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(shiftService.getShiftsByUserId(userId).stream()
            .map(EmployeeShiftResponseDTO::from)
            .toList());
    }

    /**
     * Creates a new employee shift.
     *
     * @param request Shift creation data
     * @return Created shift DTO
     */
    @PostMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "Create shift", description = "Saves a new work shift.")
    @ApiResponse(responseCode = "200", description = "Shift created successfully")
    public ResponseEntity<EmployeeShiftResponseDTO> createShift(@Valid @RequestBody EmployeeShiftRequestDTO request) {
        return ResponseEntity.ok(EmployeeShiftResponseDTO.from(shiftService.createShift(request)));
    }

    /**
     * Updates an existing employee shift.
     *
     * @param id Shift identifier
     * @param request Shift update data
     * @return Updated shift DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "Update shift", description = "Modifies an existing work shift.")
    @ApiResponse(responseCode = "200", description = "Shift updated successfully")
    public ResponseEntity<EmployeeShiftResponseDTO> updateShift(
        @PathVariable Long id,
        @Valid @RequestBody EmployeeShiftRequestDTO request) {
        return ResponseEntity.ok(EmployeeShiftResponseDTO.from(shiftService.updateShift(id, request)));
    }

    /**
     * Deletes an employee shift.
     *
     * @param id Shift identifier
     * @return 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "Delete shift", description = "Removes a work shift by ID.")
    @ApiResponse(responseCode = "200", description = "Shift deleted successfully")
    public ResponseEntity<Void> deleteShift(@PathVariable Long id) {
        shiftService.deleteShift(id);
        return ResponseEntity.ok().build();
    }
}
