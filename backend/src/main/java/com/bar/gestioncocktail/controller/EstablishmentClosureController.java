package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EstablishmentClosureDTO;
import com.bar.gestioncocktail.dto.EstablishmentClosureRequestDTO;
import com.bar.gestioncocktail.service.EstablishmentClosureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing recurring weekly closed days and holiday closures.
 */
@RestController
@RequestMapping("/api/closures")
@Tag(name = "Establishment Closures", description = "REST APIs for configuring establishment closed days and annual holidays")
public class EstablishmentClosureController {

    private final EstablishmentClosureService closureService;

    public EstablishmentClosureController(EstablishmentClosureService closureService) {
        this.closureService = closureService;
    }

    /**
     * Gets all configured establishment closures.
     *
     * @return List of EstablishmentClosureDTO
     */
    @GetMapping
    @Operation(summary = "Get all establishment closures", description = "Retrieves all weekly recurring closed days and one-off/annual holiday closures.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved closures list")
    public List<EstablishmentClosureDTO> getAllClosures() {
        return closureService.getAllClosures();
    }

    /**
     * Creates a new establishment closure rule.
     *
     * @param request EstablishmentClosureRequestDTO
     * @return Created EstablishmentClosureDTO
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Create an establishment closure rule", description = "Configures a new weekly closed day or exceptional holiday closure.")
    @ApiResponse(responseCode = "201", description = "Closure rule successfully created")
    @ApiResponse(responseCode = "400", description = "Invalid request or duplicate weekly closed day")
    @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    public EstablishmentClosureDTO createClosure(@RequestBody EstablishmentClosureRequestDTO request) {
        return closureService.createClosure(request);
    }

    /**
     * Deletes an establishment closure rule by ID.
     *
     * @param id Closure ID
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Delete an establishment closure rule", description = "Removes a weekly closed day or holiday closure rule.")
    @ApiResponse(responseCode = "204", description = "Closure rule successfully deleted")
    @ApiResponse(responseCode = "404", description = "Closure rule not found")
    @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    public void deleteClosure(@PathVariable Long id) {
        closureService.deleteClosure(id);
    }
}
