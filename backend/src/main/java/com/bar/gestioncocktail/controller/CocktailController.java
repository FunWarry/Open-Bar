package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailRequestDTO;
import com.bar.gestioncocktail.dto.CocktailResponseDTO;
import com.bar.gestioncocktail.dto.SaisonnaliteRequest;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.service.CocktailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;

/**
 * REST controller managing cocktail catalog and drink menu.
 * <p>
 * Provides CRUD operations for cocktails, availability toggling,
 * seasonality management, and filtering by category or name.
 */
@RestController
@RequestMapping("/api/cocktails")
@Transactional(readOnly = true)
@Tag(name = "Cocktails", description = "Cocktail catalog management, pricing, availability, and seasonality")
public class CocktailController {
    private final CocktailService cocktailService;

    /**
     * Constructs the controller with the cocktail service dependency.
     *
     * @param cocktailService service managing cocktail business logic
     */
    public CocktailController(CocktailService cocktailService) {
        this.cocktailService = cocktailService;
    }

    /**
     * Retrieves all cocktails in the menu.
     *
     * @return List of all cocktail DTOs
     */
    @GetMapping
    @Operation(summary = "Get all cocktails", description = "Retrieves the complete list of cocktails.")
    @ApiResponse(responseCode = "200", description = "Cocktail list retrieved")
    public ResponseEntity<List<CocktailResponseDTO>> getAllCocktails() {
        return ResponseEntity.ok(cocktailService.getAllCocktails().stream()
            .map(CocktailResponseDTO::from)
            .toList());
    }

    /**
     * Creates a new cocktail in the system.
     *
     * @param request Cocktail data to create
     * @return DTO of the created cocktail
     */
    @PostMapping
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Create a cocktail (BARMAN/ADMIN)", description = "Adds a new cocktail with recipe steps to the menu.")
    @ApiResponse(responseCode = "200", description = "Cocktail created successfully")
    @ApiResponse(responseCode = "403", description = "Access denied")
    public ResponseEntity<CocktailResponseDTO> createCocktail(@Valid @RequestBody CocktailRequestDTO request) {
        return ResponseEntity.ok(cocktailService.createCocktailFromRequest(request));
    }

    /**
     * Updates an existing cocktail.
     *
     * @param id      Identifier of the cocktail to update
     * @param request Updated cocktail data
     * @return DTO of the updated cocktail
     */
    @PutMapping("/{id}")
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Update a cocktail (BARMAN/ADMIN)", description = "Updates cocktail metadata and recipe steps.")
    @ApiResponse(responseCode = "200", description = "Cocktail updated")
    @ApiResponse(responseCode = "404", description = "Cocktail not found")
    public ResponseEntity<CocktailResponseDTO> updateCocktail(
        @Parameter(description = "Cocktail ID") @PathVariable Long id,
        @Valid @RequestBody CocktailRequestDTO request) {
        return ResponseEntity.ok(cocktailService.updateCocktailFromRequest(id, request));
    }

    /**
     * Deletes a cocktail from the system.
     *
     * @param id Identifier of the cocktail to delete
     * @return HTTP 200 OK
     */
    @DeleteMapping("/{id}")
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a cocktail (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Cocktail deleted")
    @ApiResponse(responseCode = "404", description = "Cocktail not found")
    public ResponseEntity<Void> deleteCocktail(@Parameter(description = "Cocktail ID") @PathVariable Long id) {
        cocktailService.deleteCocktail(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Retrieves a cocktail by its identifier.
     *
     * @param id Identifier of the cocktail
     * @return DTO of found cocktail
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get cocktail by ID")
    @ApiResponse(responseCode = "200", description = "Cocktail found")
    @ApiResponse(responseCode = "404", description = "Cocktail not found")
    public ResponseEntity<CocktailResponseDTO> getCocktailById(@Parameter(description = "Cocktail ID") @PathVariable Long id) {
        return cocktailService.getCocktailById(id)
            .map(CocktailResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Lists cocktails filtered by category (e.g. ALCOOLISE, SANS_ALCOOL, SHOT).
     *
     * @param categorie Target category
     * @return List of cocktails in category
     */
    @GetMapping("/categorie/{categorie}")
    @Operation(summary = "List cocktails by category")
    @ApiResponse(responseCode = "200", description = "Cocktail list retrieved")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsByCategorie(
        @Parameter(description = "Cocktail category") @PathVariable CocktailCategorie categorie) {
        return ResponseEntity.ok(cocktailService.getCocktailsByCategorie(categorie).stream()
            .map(CocktailResponseDTO::from).toList());
    }

    /**
     * Lists all cocktails currently available for service.
     *
     * @return List of available cocktails
     */
    @GetMapping("/disponibles")
    @Operation(summary = "List available cocktails", description = "Returns the list of cocktails whose availability is true.")
    @ApiResponse(responseCode = "200", description = "Available cocktails retrieved")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsDisponibles() {
        return ResponseEntity.ok(cocktailService.getCocktailsDisponibles().stream()
            .map(CocktailResponseDTO::from).toList());
    }

    /**
     * Lists cocktails designated as seasonal.
     *
     * @return List of seasonal cocktails
     */
    @GetMapping("/saisonniers")
    @Operation(summary = "List seasonal cocktails")
    @ApiResponse(responseCode = "200", description = "Seasonal cocktails retrieved")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsSaisonniers() {
        return ResponseEntity.ok(cocktailService.getCocktailsSaisonniers().stream()
            .map(CocktailResponseDTO::from).toList());
    }

    /**
     * Lists seasonal cocktails currently in season.
     *
     * @return List of in-season cocktails
     */
    @GetMapping("/saisonniers/actuels")
    @Operation(summary = "List currently in-season cocktails")
    @ApiResponse(responseCode = "200", description = "In-season cocktails retrieved")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsSaisonniersActuels() {
        return ResponseEntity.ok(cocktailService.getCocktailsSaisonniersActuels().stream()
            .map(CocktailResponseDTO::from).toList());
    }

    /**
     * Searches cocktails by name (partial match).
     *
     * @param nom Search keyword
     * @return List of matching cocktails
     */
    @GetMapping("/search")
    @Operation(summary = "Search cocktails by name")
    @ApiResponse(responseCode = "200", description = "Search results retrieved")
    public ResponseEntity<List<CocktailResponseDTO>> searchCocktails(
        @Parameter(description = "Name search query") @RequestParam String nom) {
        return ResponseEntity.ok(cocktailService.searchCocktails(nom).stream()
            .map(CocktailResponseDTO::from).toList());
    }

    /**
     * Toggles the availability status of a cocktail (available / unavailable).
     *
     * @param id Identifier of the cocktail
     * @return Updated cocktail DTO
     */
    @PutMapping("/{id}/disponibilite")
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN') or hasRole('MANAGER')")
    @Operation(summary = "Toggle cocktail availability (BARMAN/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Availability toggled")
    @ApiResponse(responseCode = "404", description = "Cocktail not found")
    public ResponseEntity<CocktailResponseDTO> toggleDisponibilite(@PathVariable Long id) {
        return cocktailService.getCocktailById(id)
            .map(cocktail -> {
                cocktailService.toggleDisponibilite(cocktail);
                return cocktailService.getCocktailById(id)
                    .map(updated -> ResponseEntity.ok(CocktailResponseDTO.from(updated)))
                    .orElseGet(() -> ResponseEntity.notFound().build());
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Sets date-based seasonality bounds for a cocktail.
     *
     * @param id Cocktail identifier
     * @param dateDebut Season start date
     * @param dateFin Season end date
     * @return Updated cocktail DTO
     */
    @PutMapping("/{id}/saisonnalite")
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Set date-based seasonality range")
    @ApiResponse(responseCode = "200", description = "Seasonality saved")
    public ResponseEntity<CocktailResponseDTO> definirSaisonnalite(
        @PathVariable Long id,
        @RequestParam LocalDateTime dateDebut,
        @RequestParam LocalDateTime dateFin) {
        return cocktailService.getCocktailById(id)
            .map(cocktail -> {
                cocktailService.definirSaisonnalite(cocktail, dateDebut, dateFin);
                return cocktailService.getCocktailById(id)
                    .map(updated -> ResponseEntity.ok(CocktailResponseDTO.from(updated)))
                    .orElseGet(() -> ResponseEntity.notFound().build());
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Updates month-based seasonality bounds (1-12) for a cocktail.
     *
     * @param id Cocktail identifier
     * @param request DTO containing start month (1-12) and end month (1-12)
     * @return Updated cocktail DTO
     */
    @PatchMapping("/{id}/saisonnalite")
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(summary = "Update month-based seasonality (1-12)")
    @ApiResponse(responseCode = "200", description = "Month seasonality updated")
    public ResponseEntity<CocktailResponseDTO> updateSaisonnalite(
        @PathVariable Long id,
        @RequestBody SaisonnaliteRequest request) {
        return ResponseEntity.ok(CocktailResponseDTO.from(
            cocktailService.updateSaisonnalite(id, request.moisDebut(), request.moisFin())));
    }

    /**
     * Uploads a custom photo for a cocktail (BARMAN, MANAGER, or ADMIN).
     *
     * @param id   Identifier of the target cocktail
     * @param file Multipart photo file
     * @return Updated cocktail DTO with new photo URL
     */
    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN') or hasRole('MANAGER')")
    @Operation(summary = "Upload custom cocktail photo (BARMAN/MANAGER/ADMIN)", description = "Stores uploaded photo and updates cocktail photoUrl.")
    @ApiResponse(responseCode = "200", description = "Photo uploaded and cocktail updated")
    @ApiResponse(responseCode = "400", description = "Invalid file or format")
    @ApiResponse(responseCode = "404", description = "Cocktail not found")
    public ResponseEntity<CocktailResponseDTO> uploadCocktailPhoto(
        @Parameter(description = "Cocktail ID") @PathVariable Long id,
        @RequestParam("file") MultipartFile file) {
        Cocktail updated = cocktailService.updateCocktailImage(id, file);
        return ResponseEntity.ok(CocktailResponseDTO.from(updated));
    }
}
