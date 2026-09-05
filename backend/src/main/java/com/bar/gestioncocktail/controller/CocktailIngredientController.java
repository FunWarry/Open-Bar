package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailIngredientRequestDTO;
import com.bar.gestioncocktail.dto.CocktailIngredientResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.service.CocktailIngredientService;
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
 * REST controller managing cocktail recipes and ingredient compositions (cocktail ↔ ingredient relationships and proportions).
 */
@RestController
@RequestMapping("/api/cocktail-ingredients")
@Tag(name = "Cocktail Ingredients", description = "Recipe and composition management (cocktail and ingredient associations)")
public class CocktailIngredientController {
    private final CocktailIngredientService cocktailIngredientService;

    /**
     * Constructs the controller with cocktail ingredient recipe service dependency.
     *
     * @param cocktailIngredientService Service managing relationships between cocktails and ingredients
     */
    public CocktailIngredientController(CocktailIngredientService cocktailIngredientService) {
        this.cocktailIngredientService = cocktailIngredientService;
    }

    /**
     * Associates a new ingredient with a cocktail at the required quantity.
     *
     * @param request The cocktail-ingredient association to create
     * @return DTO of the created link
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Add an ingredient to a recipe (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Link created")
    public ResponseEntity<CocktailIngredientResponseDTO> createCocktailIngredient(
            @RequestBody CocktailIngredientRequestDTO request) {
        return ResponseEntity.ok(CocktailIngredientResponseDTO.from(
                cocktailIngredientService.createCocktailIngredient(request.toEntity())));
    }

    /**
     * Deletes a cocktail-ingredient association by its ID.
     *
     * @param id Identifier of the association
     * @return HTTP 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Remove an ingredient from a recipe by ID (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Association deleted")
    public ResponseEntity<Void> deleteCocktailIngredient(
            @Parameter(description = "Association ID") @PathVariable Long id) {
        cocktailIngredientService.deleteCocktailIngredient(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Retrieves the list of ingredients composing a cocktail recipe.
     *
     * @param cocktailId Cocktail identifier
     * @return List of recipe ingredients
     */
    @GetMapping("/cocktail/{cocktailId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get recipe ingredients for a cocktail")
    @ApiResponse(responseCode = "200", description = "Recipe ingredients retrieved")
    public ResponseEntity<List<CocktailIngredientResponseDTO>> getIngredientsByCocktail(
            @Parameter(description = "Cocktail ID") @PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailIngredientService.getIngredientsByCocktail(cocktail).stream()
                .map(CocktailIngredientResponseDTO::from).toList());
    }

    /**
     * Retrieves the list of cocktails using a specific ingredient.
     *
     * @param ingredientId Ingredient identifier
     * @return List of associated cocktail recipes
     */
    @GetMapping("/ingredient/{ingredientId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get cocktails using an ingredient")
    @ApiResponse(responseCode = "200", description = "Associated cocktails retrieved")
    public ResponseEntity<List<CocktailIngredientResponseDTO>> getCocktailsByIngredient(
            @Parameter(description = "Ingredient ID") @PathVariable Long ingredientId) {
        Ingredient ingredient = new Ingredient();
        ingredient.setId(ingredientId);
        return ResponseEntity.ok(cocktailIngredientService.getCocktailsByIngredient(ingredient).stream()
                .map(CocktailIngredientResponseDTO::from).toList());
    }

    /**
     * Updates the quantity/dosage of an ingredient within a cocktail recipe.
     *
     * @param id       Association identifier
     * @param quantite New dosage amount
     * @return Updated association DTO
     */
    @PutMapping("/{id}/quantite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Update ingredient dose in recipe (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Quantity updated")
    @ApiResponse(responseCode = "404", description = "Association not found")
    public ResponseEntity<CocktailIngredientResponseDTO> updateQuantite(
            @Parameter(description = "Association ID") @PathVariable Long id,
            @Parameter(description = "New dosage") @RequestParam BigDecimal quantite) {
        return cocktailIngredientService.getCocktailIngredientById(id)
                .map(cocktailIngredient -> {
                    cocktailIngredientService.updateQuantite(cocktailIngredient, quantite);
                    return ResponseEntity.ok(CocktailIngredientResponseDTO.from(cocktailIngredient));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Deletes the link between a cocktail and an ingredient by their respective IDs.
     *
     * @param cocktailId   Cocktail identifier
     * @param ingredientId Ingredient identifier
     * @return HTTP 200 OK
     */
    @DeleteMapping("/cocktail/{cocktailId}/ingredient/{ingredientId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Remove an ingredient from a recipe by IDs (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Association deleted")
    public ResponseEntity<Void> deleteCocktailIngredient(
            @Parameter(description = "Cocktail ID") @PathVariable Long cocktailId,
            @Parameter(description = "Ingredient ID") @PathVariable Long ingredientId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        Ingredient ingredient = new Ingredient();
        ingredient.setId(ingredientId);
        cocktailIngredientService.deleteCocktailIngredient(cocktail, ingredient);
        return ResponseEntity.ok().build();
    }
}
