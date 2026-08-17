package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.GlasswareRequestDTO;
import com.bar.gestioncocktail.dto.GlasswareResponseDTO;
import com.bar.gestioncocktail.service.GlasswareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing the bar's glassware catalog and custom glass types.
 */
@RestController
@RequestMapping("/api/glassware")
@Tag(name = "Glassware", description = "Operations for managing glassware catalog, capacities, and illustrations")
public class GlasswareController {

    private final GlasswareService glasswareService;

    /**
     * Constructor injection.
     *
     * @param glasswareService Business service for glassware
     */
    public GlasswareController(GlasswareService glasswareService) {
        this.glasswareService = glasswareService;
    }

    /**
     * Retrieves all available glassware items.
     *
     * @return List of glassware response DTOs
     */
    @GetMapping
    @Operation(summary = "Get all glassware", description = "Returns the list of all available glassware items ordered by name")
    @ApiResponse(responseCode = "200", description = "List of glassware retrieved successfully")
    public ResponseEntity<List<GlasswareResponseDTO>> getAll() {
        return ResponseEntity.ok(glasswareService.getAll());
    }

    /**
     * Retrieves a single glassware item by its unique ID.
     *
     * @param id Glassware ID
     * @return Glassware response DTO
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get glassware by ID", description = "Retrieves details of a specific glassware item")
    @ApiResponse(responseCode = "200", description = "Glassware retrieved successfully")
    @ApiResponse(responseCode = "404", description = "Glassware not found")
    public ResponseEntity<GlasswareResponseDTO> getById(
        @Parameter(description = "Glassware ID", required = true) @PathVariable Long id
    ) {
        return ResponseEntity.ok(glasswareService.getById(id));
    }

    /**
     * Creates a new glassware item.
     *
     * @param request Glassware creation request DTO
     * @return Created glassware response DTO
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Create glassware", description = "Adds a new glassware type to the catalog")
    @ApiResponse(responseCode = "201", description = "Glassware created successfully")
    @ApiResponse(responseCode = "400", description = "Validation error or name already exists")
    @ApiResponse(responseCode = "403", description = "Forbidden")
    public ResponseEntity<GlasswareResponseDTO> create(
        @Valid @RequestBody GlasswareRequestDTO request
    ) {
        GlasswareResponseDTO created = glasswareService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing glassware item.
     *
     * @param id Glassware ID
     * @param request Glassware update request DTO
     * @return Updated glassware response DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update glassware", description = "Updates an existing glassware item in the catalog")
    @ApiResponse(responseCode = "200", description = "Glassware updated successfully")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @ApiResponse(responseCode = "404", description = "Glassware not found")
    @ApiResponse(responseCode = "403", description = "Forbidden")
    public ResponseEntity<GlasswareResponseDTO> update(
        @Parameter(description = "Glassware ID", required = true) @PathVariable Long id,
        @Valid @RequestBody GlasswareRequestDTO request
    ) {
        return ResponseEntity.ok(glasswareService.update(id, request));
    }

    /**
     * Uploads a custom illustration photo for a glassware item.
     *
     * @param id   Identifier of the target glassware
     * @param file Multipart photo file
     * @return Updated glassware DTO with new photo URL
     */
    @PostMapping(value = "/{id}/image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Upload custom glassware photo (BARMAN/MANAGER/ADMIN)", description = "Stores uploaded illustration and updates glassware photo URL.")
    @ApiResponse(responseCode = "200", description = "Photo uploaded and glassware updated")
    @ApiResponse(responseCode = "400", description = "Invalid file or format")
    @ApiResponse(responseCode = "404", description = "Glassware not found")
    public ResponseEntity<GlasswareResponseDTO> uploadGlasswarePhoto(
        @Parameter(description = "Glassware ID") @PathVariable Long id,
        @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        GlasswareResponseDTO updated = glasswareService.updateGlasswareImage(id, file);
        return ResponseEntity.ok(updated);
    }

    /**
     * Deletes a glassware item.
     *
     * @param id Glassware ID
     * @return 204 No Content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Delete glassware", description = "Deletes a glassware item from the catalog")
    @ApiResponse(responseCode = "204", description = "Glassware deleted successfully")
    @ApiResponse(responseCode = "404", description = "Glassware not found")
    @ApiResponse(responseCode = "403", description = "Forbidden")
    public ResponseEntity<Void> delete(
        @Parameter(description = "Glassware ID", required = true) @PathVariable Long id
    ) {
        glasswareService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
