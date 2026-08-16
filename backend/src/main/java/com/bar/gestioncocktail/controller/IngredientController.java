package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.IngredientRequestDTO;
import com.bar.gestioncocktail.dto.IngredientResponseDTO;
import com.bar.gestioncocktail.service.IngredientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.bar.gestioncocktail.exception.BusinessException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * REST controller managing ingredient stock and inventory.
 */
@RestController
@RequestMapping("/api/ingredients")
@Tag(name = "Ingredients", description = "Ingredient stock management, alert thresholds, and inventory")
public class IngredientController {
    private final IngredientService ingredientService;

    /**
     * Constructs the controller with the ingredient service dependency.
     *
     * @param ingredientService service managing ingredient business logic
     */
    public IngredientController(IngredientService ingredientService) {
        this.ingredientService = ingredientService;
    }

    /**
     * Retrieves the complete list of all ingredients.
     *
     * @return list of all ingredient DTOs
     */
    @GetMapping
    @Operation(summary = "List all ingredients (ADMIN/MANAGER/BARMAN)")
    @ApiResponse(responseCode = "200", description = "Ingredient list retrieved")
    public ResponseEntity<List<IngredientResponseDTO>> getAllIngredients() {
        return ResponseEntity.ok(
            ingredientService.getAllIngredients().stream()
                .map(IngredientResponseDTO::from)
                .toList()
        );
    }

    /**
     * Creates a new ingredient.
     *
     * @param request The ingredient data to create
     * @return DTO of the created ingredient
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(summary = "Create a new ingredient (MANAGER/BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Ingredient created")
    public ResponseEntity<IngredientResponseDTO> createIngredient(@Valid @RequestBody IngredientRequestDTO request) {
        return ResponseEntity.ok(IngredientResponseDTO.from(ingredientService.createIngredient(request.toEntity())));
    }


    /**
     * Updates an ingredient's information.
     *
     * @param id      Identifier of the ingredient
     * @param request Updated ingredient data
     * @return DTO of the updated ingredient
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(summary = "Update an ingredient (MANAGER/BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Ingredient updated")
    public ResponseEntity<IngredientResponseDTO> updateIngredient(
        @Parameter(description = "Ingredient ID") @PathVariable Long id,
        @Valid @RequestBody IngredientRequestDTO request) {
        return ResponseEntity.ok(IngredientResponseDTO.from(ingredientService.updateIngredient(id, request.toEntity())));
    }

    /**
     * Deletes an ingredient from the system.
     *
     * @param id Identifier of the ingredient
     * @return HTTP 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete an ingredient (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Ingredient deleted")
    public ResponseEntity<Void> deleteIngredient(@Parameter(description = "Ingredient ID") @PathVariable Long id) {
        ingredientService.deleteIngredient(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Retrieves an ingredient by its identifier.
     *
     * @param id Identifier
     * @return Ingredient DTO
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get ingredient by ID")
    @ApiResponse(responseCode = "200", description = "Ingredient found")
    @ApiResponse(responseCode = "404", description = "Ingredient not found")
    public ResponseEntity<IngredientResponseDTO> getIngredientById(@Parameter(description = "Ingredient ID") @PathVariable Long id) {
        return ingredientService.getIngredientById(id)
            .map(IngredientResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Retrieves the list of ingredients whose stock level is below the alert threshold.
     *
     * @return List of ingredients on stock alert
     */
    @GetMapping("/seuil-alerte")
    @Operation(summary = "List ingredients below stock alert threshold")
    @ApiResponse(responseCode = "200", description = "List of alerting ingredients")
    public ResponseEntity<List<IngredientResponseDTO>> getIngredientsBySeuilAlerte() {
        return ResponseEntity.ok(ingredientService.getIngredientsBySeuilAlerte().stream()
            .map(IngredientResponseDTO::from).toList());
    }

    /**
     * Searches ingredients by name.
     *
     * @param nom Keyword
     * @return Matching ingredients
     */
    @GetMapping("/search")
    @Operation(summary = "Search ingredients by name")
    @ApiResponse(responseCode = "200", description = "Search results")
    public ResponseEntity<List<IngredientResponseDTO>> searchIngredients(@RequestParam String nom) {
        return ResponseEntity.ok(ingredientService.searchIngredients(nom).stream()
            .map(IngredientResponseDTO::from).toList());
    }

    /**
     * Filters ingredients by supplier name.
     *
     * @param fournisseur Supplier name
     * @return List of ingredients
     */
    @GetMapping("/fournisseur/{fournisseur}")
    @Operation(summary = "List ingredients by supplier")
    @ApiResponse(responseCode = "200", description = "List retrieved")
    public ResponseEntity<List<IngredientResponseDTO>> getIngredientsByFournisseur(@PathVariable String fournisseur) {
        return ResponseEntity.ok(ingredientService.getIngredientsByFournisseur(fournisseur).stream()
            .map(IngredientResponseDTO::from).toList());
    }

    /**
     * Filters ingredients by unit of measurement (e.g. ml, cl, g, unit).
     *
     * @param uniteMesure Unit of measurement name
     * @return List of ingredients
     */
    @GetMapping("/unite-mesure/{uniteMesure}")
    @Operation(summary = "List ingredients by unit of measurement")
    @ApiResponse(responseCode = "200", description = "List retrieved")
    public ResponseEntity<List<IngredientResponseDTO>> getIngredientsByUniteMesure(@PathVariable String uniteMesure) {
        return ResponseEntity.ok(ingredientService.getIngredientsByUniteMesure(uniteMesure).stream()
            .map(IngredientResponseDTO::from).toList());
    }

    /**
     * Updates the stock quantity of an ingredient.
     *
     * @param id Identifier of the ingredient
     * @param quantite New stock quantity via URL parameter
     * @param body Optional JSON request body
     * @return Updated ingredient DTO
     */
    @RequestMapping(value = "/{id}/stock", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(summary = "Update ingredient stock quantity (MANAGER/BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Stock updated")
    public ResponseEntity<IngredientResponseDTO> updateStock(
        @PathVariable Long id,
        @RequestParam(required = false) BigDecimal quantite,
        @RequestBody(required = false) Map<String, Object> body) {
        BigDecimal qty = quantite;
        if (qty == null && body != null && body.containsKey("quantite")) {
            Object val = body.get("quantite");
            if (val != null) {
                qty = new BigDecimal(val.toString());
            }
        }
        if (qty == null) {
            throw new BusinessException("Quantity is required.");
        }
        final BigDecimal finalQty = qty;
        return ingredientService.getIngredientById(id)
            .map(ingredient -> {
                ingredientService.updateStock(ingredient, finalQty);
                return ResponseEntity.ok(IngredientResponseDTO.from(ingredient));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Sets the stock alert threshold for an ingredient.
     *
     * @param id Identifier of the ingredient
     * @param seuil New threshold value via URL parameter
     * @param body Optional JSON request body
     * @return Updated ingredient DTO
     */
    @RequestMapping(value = "/{id}/seuil-alerte", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(summary = "Set stock alert threshold (MANAGER/BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Alert threshold updated")
    public ResponseEntity<IngredientResponseDTO> definirSeuilAlerte(
        @PathVariable Long id,
        @RequestParam(required = false) BigDecimal seuil,
        @RequestBody(required = false) Map<String, Object> body) {
        BigDecimal s = seuil;
        if (s == null && body != null && body.containsKey("seuil")) {
            Object val = body.get("seuil");
            if (val != null) {
                s = new BigDecimal(val.toString());
            }
        }
        if (s == null) {
            throw new BusinessException("Threshold is required.");
        }
        final BigDecimal finalSeuil = s;
        return ingredientService.getIngredientById(id)
            .map(ingredient -> {
                ingredientService.definirSeuilAlerte(ingredient, finalSeuil);
                return ResponseEntity.ok(IngredientResponseDTO.from(ingredient));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
