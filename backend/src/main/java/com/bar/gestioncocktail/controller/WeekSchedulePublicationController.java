package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EmployeeShiftResponseDTO;
import com.bar.gestioncocktail.dto.ShiftAuditLogDTO;
import com.bar.gestioncocktail.dto.WeekSchedulePublicationDTO;
import com.bar.gestioncocktail.service.ShiftAuditService;
import com.bar.gestioncocktail.service.WeekSchedulePublicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * REST controller exposing endpoints for publishing weekly schedules, retrieving immutable audit logs,
 * and performing time-travel replay at an instant T.
 */
@RestController
@RequestMapping("/api/schedule")
@Tag(name = "Schedule Management", description = "Endpoints for publishing planning, querying audit history, and historical replay")
public class WeekSchedulePublicationController {

    private final WeekSchedulePublicationService service;
    private final ShiftAuditService shiftAuditService;

    /**
     * Constructs the controller with the publication service and shift audit service.
     *
     * @param service Week schedule publication service
     * @param shiftAuditService Shift audit service
     */
    public WeekSchedulePublicationController(
            WeekSchedulePublicationService service,
            ShiftAuditService shiftAuditService) {
        this.service = service;
        this.shiftAuditService = shiftAuditService;
    }

    /**
     * Publishes (or republishes) the weekly planning for the given week.
     * Broadcasts a STOMP notification to all connected users on /topic/schedule/published.
     *
     * @param weekStart ISO date (yyyy-MM-dd) of the Monday of the target week
     * @param principal Authenticated user performing the publication
     * @return The publication record DTO
     */
    @PostMapping("/publish")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(
            summary = "Publish weekly schedule",
            description = "Marks a week's planning as published and broadcasts a STOMP notification on /topic/schedule/published"
    )
    @ApiResponse(responseCode = "200", description = "Planning published successfully")
    @ApiResponse(responseCode = "403", description = "Insufficient role — requires MANAGER or ADMIN")
    public ResponseEntity<WeekSchedulePublicationDTO> publish(
            @Parameter(description = "Monday date of the target week (yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            Principal principal) {

        WeekSchedulePublicationDTO dto = service.publishWeek(weekStart, principal.getName());
        return ResponseEntity.ok(dto);
    }

    /**
     * Returns the publication record for the given week, if it has been published.
     *
     * @param weekStart ISO date (yyyy-MM-dd) of the Monday of the target week
     * @return 200 with the DTO if published, 204 No Content if not yet published
     */
    @GetMapping("/publication")
    @Operation(
            summary = "Get week publication status",
            description = "Returns the publication record for a given week, or 204 if not yet published"
    )
    @ApiResponse(responseCode = "200", description = "Publication record found")
    @ApiResponse(responseCode = "204", description = "Week has not been published yet")
    public ResponseEntity<WeekSchedulePublicationDTO> getPublication(
            @Parameter(description = "Monday date of the target week (yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {

        return service.getPublication(weekStart)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * Retrieves the audit log of all shift modifications for a given week, optionally filtered by user ID.
     *
     * @param week Date in target week (yyyy-MM-dd)
     * @param userId Optional employee user identifier
     * @return List of immutable audit log entries for the week
     */
    @GetMapping("/audit-log")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(
            summary = "Get weekly schedule audit log",
            description = "Retrieves immutable audit entries for all shift changes within a target week"
    )
    @ApiResponse(responseCode = "200", description = "Weekly audit log retrieved successfully")
    public ResponseEntity<List<ShiftAuditLogDTO>> getAuditLog(
            @Parameter(description = "Date in target week (yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week,
            @Parameter(description = "Optional employee ID filter")
            @RequestParam(required = false) Long userId) {

        return ResponseEntity.ok(shiftAuditService.getAuditLogForWeek(week, userId));
    }

    /**
     * Reconstructs the weekly schedule state at a specific historical point in time (replay).
     *
     * @param week Date in target week (yyyy-MM-dd)
     * @param at Historical ISO timestamp (yyyy-MM-dd'T'HH:mm:ss)
     * @return List of reconstructed shift DTOs at instant T
     */
    @GetMapping("/at")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'SERVEUR', 'BARMAN')")
    @Operation(
            summary = "Reconstruct schedule at instant T",
            description = "Replays and reconstructs the weekly schedule as it existed at a specific historical timestamp"
    )
    @ApiResponse(responseCode = "200", description = "Historical schedule reconstructed successfully")
    public ResponseEntity<List<EmployeeShiftResponseDTO>> getScheduleAt(
            @Parameter(description = "Date in target week (yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week,
            @Parameter(description = "Historical cut-off timestamp (ISO-8601)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime at) {

        return ResponseEntity.ok(shiftAuditService.reconstructScheduleAt(week, at));
    }
}
