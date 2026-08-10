package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.WeekSchedulePublicationDTO;
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

/**
 * REST controller exposing endpoints for publishing and querying week schedule publications.
 */
@RestController
@RequestMapping("/api/schedule")
@Tag(name = "Schedule Publication", description = "Endpoints for publishing weekly planning and querying its publication state")
public class WeekSchedulePublicationController {

    private final WeekSchedulePublicationService service;

    public WeekSchedulePublicationController(WeekSchedulePublicationService service) {
        this.service = service;
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
}
