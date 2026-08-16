package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.ZoneRequestDTO;
import com.bar.gestioncocktail.dto.ZoneResponseDTO;
import com.bar.gestioncocktail.model.ZoneEntity;
import com.bar.gestioncocktail.service.ZoneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing bar zones and their floor level categorizations.
 */
@RestController
@RequestMapping("/api/zones")
@Tag(name = "Zones", description = "Endpoints for managing zones and associated floors")
public class ZoneController {
    private final ZoneService zoneService;

    /**
     * Constructs the controller with zone service dependency.
     *
     * @param zoneService Zone service
     */
    public ZoneController(ZoneService zoneService) {
        this.zoneService = zoneService;
    }

    /**
     * Retrieves all configured zones with floor levels.
     *
     * @return List of zone DTOs
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all zones with their floor levels")
    @ApiResponse(responseCode = "200", description = "Zones retrieved successfully")
    public ResponseEntity<List<ZoneResponseDTO>> getAllZones() {
        return ResponseEntity.ok(zoneService.getAllZones().stream().map(ZoneResponseDTO::from).toList());
    }

    /**
     * Retrieves a zone by its identifier.
     *
     * @param id Zone identifier
     * @return Zone DTO
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get zone by ID")
    @ApiResponse(responseCode = "200", description = "Zone retrieved")
    public ResponseEntity<ZoneResponseDTO> getZoneById(@PathVariable Long id) {
        return ResponseEntity.ok(ZoneResponseDTO.from(zoneService.getZoneById(id)));
    }

    /**
     * Creates a new zone.
     *
     * @param request Zone creation request DTO
     * @return Created zone DTO
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create a new zone")
    @ApiResponse(responseCode = "200", description = "Zone created")
    public ResponseEntity<ZoneResponseDTO> createZone(@Valid @RequestBody ZoneRequestDTO request) {
        ZoneEntity created = zoneService.createZone(request.toEntity());
        return ResponseEntity.ok(ZoneResponseDTO.from(created));
    }

    /**
     * Updates an existing zone.
     *
     * @param id Zone identifier
     * @param request Updated zone data
     * @return Updated zone DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update a zone (name, floor)")
    @ApiResponse(responseCode = "200", description = "Zone updated")
    public ResponseEntity<ZoneResponseDTO> updateZone(@PathVariable Long id, @Valid @RequestBody ZoneRequestDTO request) {
        ZoneEntity updated = zoneService.updateZone(id, request.toEntity());
        return ResponseEntity.ok(ZoneResponseDTO.from(updated));
    }

    /**
     * Deletes a zone.
     *
     * @param id Zone identifier
     * @return HTTP 204 No Content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Delete a zone")
    @ApiResponse(responseCode = "204", description = "Zone deleted")
    public ResponseEntity<Void> deleteZone(@PathVariable Long id) {
        zoneService.deleteZone(id);
        return ResponseEntity.noContent().build();
    }
}
