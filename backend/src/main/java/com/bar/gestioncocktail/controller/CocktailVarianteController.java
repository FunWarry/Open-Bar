package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailVarianteRequestDTO;
import com.bar.gestioncocktail.dto.CocktailVarianteResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.service.CocktailVarianteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * REST controller for managing cocktail variants (e.g. Alcohol-free, XL, Premium).
 */
@RestController
@RequestMapping("/api/cocktail-variantes")
@Tag(name = "Cocktail Variants", description = "Cocktail customization options and variant management")
public class CocktailVarianteController {
    private final CocktailVarianteService cocktailVarianteService;

    /**
     * Constructs the controller with variant service dependency.
     *
     * @param cocktailVarianteService Service managing cocktail variants
     */
    public CocktailVarianteController(CocktailVarianteService cocktailVarianteService) {
        this.cocktailVarianteService = cocktailVarianteService;
    }

    /**
     * Creates a new variant for a cocktail.
     *
     * @param request The variant data to create
     * @return DTO of the created variant
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Create a cocktail variant (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Variant created")
    public ResponseEntity<CocktailVarianteResponseDTO> createCocktailVariante(@RequestBody CocktailVarianteRequestDTO request) {
        return ResponseEntity.ok(CocktailVarianteResponseDTO.from(
            cocktailVarianteService.createCocktailVariante(request.toEntity())));
    }

    /**
     * Updates an existing cocktail variant.
     *
     * @param id      Identifier of the variant
     * @param request Updated variant data
     * @return DTO of the updated variant
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Update a variant (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Variant updated")
    public ResponseEntity<CocktailVarianteResponseDTO> updateCocktailVariante(
        @Parameter(description = "Variant ID") @PathVariable Long id,
        @RequestBody CocktailVarianteRequestDTO request) {
        CocktailVariante variante = request.toEntity();
        variante.setId(id);
        return ResponseEntity.ok(CocktailVarianteResponseDTO.from(
            cocktailVarianteService.updateCocktailVariante(variante)));
    }

    /**
     * Deletes a cocktail variant.
     *
     * @param id Identifier of the variant
     * @return HTTP 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Delete a variant (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Variant deleted")
    public ResponseEntity<Void> deleteCocktailVariante(@Parameter(description = "Variant ID") @PathVariable Long id) {
        cocktailVarianteService.deleteCocktailVariante(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Retrieves a variant by its ID.
     *
     * @param id Identifier of the variant
     * @return DTO of the variant
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get variant by ID")
    @ApiResponse(responseCode = "200", description = "Variant found")
    @ApiResponse(responseCode = "404", description = "Variant not found")
    public ResponseEntity<CocktailVarianteResponseDTO> getCocktailVarianteById(@Parameter(description = "Variant ID") @PathVariable Long id) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(CocktailVarianteResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Lists all variants associated with a cocktail.
     *
     * @param cocktailId Identifier of the cocktail
     * @return List of cocktail variants
     */
    @GetMapping("/cocktail/{cocktailId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List variants for a cocktail")
    @ApiResponse(responseCode = "200", description = "Variants retrieved")
    public ResponseEntity<List<CocktailVarianteResponseDTO>> getVariantesByCocktail(
        @Parameter(description = "Cocktail ID") @PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailVarianteService.getVariantesByCocktail(cocktail).stream()
            .map(CocktailVarianteResponseDTO::from).toList());
    }

    /**
     * Lists available variants for a given cocktail.
     *
     * @param cocktailId Identifier of the cocktail
     * @return List of available variants
     */
    @GetMapping("/cocktail/{cocktailId}/disponibles")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List available variants for a cocktail")
    @ApiResponse(responseCode = "200", description = "Available variants retrieved")
    public ResponseEntity<List<CocktailVarianteResponseDTO>> getVariantesDisponiblesByCocktail(
        @Parameter(description = "Cocktail ID") @PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailVarianteService.getVariantesDisponiblesByCocktail(cocktail).stream()
            .map(CocktailVarianteResponseDTO::from).toList());
    }

    /**
     * Searches variants by name.
     *
     * @param nom Search term
     * @return List of matching variants
     */
    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search variants by name")
    @ApiResponse(responseCode = "200", description = "Search results retrieved")
    public ResponseEntity<List<CocktailVarianteResponseDTO>> searchVariantes(@RequestParam String nom) {
        return ResponseEntity.ok(cocktailVarianteService.searchVariantes(nom).stream()
            .map(CocktailVarianteResponseDTO::from).toList());
    }

    /**
     * Toggles availability of a variant.
     *
     * @param id Identifier of the variant
     * @return Updated variant DTO
     */
    @PutMapping("/{id}/disponibilite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN') or hasRole('MANAGER')")
    @Operation(summary = "Toggle variant availability (BARMAN/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Availability toggled")
    @ApiResponse(responseCode = "404", description = "Variant not found")
    public ResponseEntity<CocktailVarianteResponseDTO> toggleDisponibilite(@PathVariable Long id) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(variante -> {
                cocktailVarianteService.toggleDisponibilite(variante);
                return ResponseEntity.ok(CocktailVarianteResponseDTO.from(variante));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Updates extra price surcharge for a variant.
     *
     * @param id Identifier of the variant
     * @param prixSupplement New extra surcharge price
     * @return Updated variant DTO
     */
    @PutMapping("/{id}/prix-supplement")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Update variant surcharge price (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Surcharge price updated")
    @ApiResponse(responseCode = "404", description = "Variant not found")
    public ResponseEntity<CocktailVarianteResponseDTO> updatePrixSupplement(
        @PathVariable Long id,
        @RequestParam BigDecimal prixSupplement) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(variante -> {
                cocktailVarianteService.updatePrixSupplement(variante, prixSupplement);
                return ResponseEntity.ok(CocktailVarianteResponseDTO.from(variante));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
