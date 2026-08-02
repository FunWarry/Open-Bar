package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EtageRequestDTO;
import com.bar.gestioncocktail.dto.EtageResponseDTO;
import com.bar.gestioncocktail.model.EtageEntity;
import com.bar.gestioncocktail.service.EtageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing floor levels in the bar establishment.
 */
@RestController
@RequestMapping("/api/etages")
@Tag(name = "Étages", description = "Endpoints for managing bar floor levels and hierarchy")
public class EtageController {

    private final EtageService etageService;

    /**
     * Constructor with dependency injection.
     *
     * @param etageService the service managing floor operations
     */
    public EtageController(EtageService etageService) {
        this.etageService = etageService;
    }

    /**
     * Retrieve all configured floors ordered by position.
     *
     * @return list of floor response DTOs
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all floors ordered by display position")
    @ApiResponse(responseCode = "200", description = "Floors retrieved successfully")
    public ResponseEntity<List<EtageResponseDTO>> getAllEtages() {
        List<EtageResponseDTO> etages = etageService.getAllEtages()
                .stream()
                .map(EtageResponseDTO::from)
                .toList();
        return ResponseEntity.ok(etages);
    }

    /**
     * Get a specific floor by its ID.
     *
     * @param id primary key ID of the floor
     * @return floor response DTO
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get floor details by ID")
    @ApiResponse(responseCode = "200", description = "Floor details retrieved")
    @ApiResponse(responseCode = "404", description = "Floor not found")
    public ResponseEntity<EtageResponseDTO> getEtageById(@PathVariable Long id) {
        EtageEntity entity = etageService.getEtageById(id);
        return ResponseEntity.ok(EtageResponseDTO.from(entity));
    }

    /**
     * Create a new floor.
     *
     * @param dto payload containing floor code, name, and position order
     * @return created floor response DTO
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create a new floor")
    @ApiResponse(responseCode = "201", description = "Floor created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request or floor code already exists")
    public ResponseEntity<EtageResponseDTO> createEtage(@Valid @RequestBody EtageRequestDTO dto) {
        EtageEntity created = etageService.createEtage(dto.code(), dto.nom(), dto.ordre());
        return ResponseEntity.status(HttpStatus.CREATED).body(EtageResponseDTO.from(created));
    }

    /**
     * Update an existing floor.
     *
     * @param id ID of the floor to update
     * @param dto updated floor payload
     * @return updated floor response DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update an existing floor")
    @ApiResponse(responseCode = "200", description = "Floor updated successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request or code conflict")
    @ApiResponse(responseCode = "404", description = "Floor not found")
    public ResponseEntity<EtageResponseDTO> updateEtage(@PathVariable Long id, @Valid @RequestBody EtageRequestDTO dto) {
        EtageEntity updated = etageService.updateEtage(id, dto.code(), dto.nom(), dto.ordre());
        return ResponseEntity.ok(EtageResponseDTO.from(updated));
    }

    /**
     * Delete a floor by ID.
     *
     * @param id ID of the floor to delete
     * @return no content response
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Delete a floor")
    @ApiResponse(responseCode = "204", description = "Floor deleted successfully")
    @ApiResponse(responseCode = "400", description = "Floor cannot be deleted because zones are assigned to it")
    @ApiResponse(responseCode = "404", description = "Floor not found")
    public ResponseEntity<Void> deleteEtage(@PathVariable Long id) {
        etageService.deleteEtage(id);
        return ResponseEntity.noContent().build();
    }
}
