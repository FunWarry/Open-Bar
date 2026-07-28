package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailIngredientResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.service.CocktailIngredientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Controller REST pour la gestion de la composition des cocktails (liaison cocktail ↔ ingrédient et proportions).
 */
@RestController
@RequestMapping("/api/cocktail-ingredients")
@Tag(name = "Cocktail Ingrédients", description = "Gestion des recettes et compositions (liaisons cocktails et ingrédients)")
public class CocktailIngredientController {
    private final CocktailIngredientService cocktailIngredientService;

    /**
     * Constructeur avec injection du service de recette cocktail-ingrédient.
     *
     * @param cocktailIngredientService Service gérant les liaisons entre cocktails et ingrédients
     */
    @Autowired
    public CocktailIngredientController(CocktailIngredientService cocktailIngredientService) {
        this.cocktailIngredientService = cocktailIngredientService;
    }

    /**
     * Associe un nouvel ingrédient à un cocktail avec sa quantité requise.
     *
     * @param cocktailIngredient L'association cocktail-ingrédient à créer
     * @return DTO de la liaison créée
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Ajouter un ingrédient à une recette (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Liaison créée")
    public ResponseEntity<CocktailIngredientResponseDTO> createCocktailIngredient(@RequestBody CocktailIngredient cocktailIngredient) {
        return ResponseEntity.ok(CocktailIngredientResponseDTO.from(
            cocktailIngredientService.createCocktailIngredient(cocktailIngredient)));
    }

    /**
     * Supprime une liaison cocktail-ingrédient par son identifiant.
     *
     * @param id Identifiant de la liaison
     * @return Statut 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Supprimer un ingrédient d'une recette par ID (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Liaison supprimée")
    public ResponseEntity<Void> deleteCocktailIngredient(@Parameter(description = "ID de la liaison") @PathVariable Long id) {
        cocktailIngredientService.deleteCocktailIngredient(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Récupère la liste des ingrédients composant un cocktail.
     *
     * @param cocktailId Identifiant du cocktail
     * @return Liste des ingrédients de la recette
     */
    @GetMapping("/cocktail/{cocktailId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtenir les ingrédients d'un cocktail")
    @ApiResponse(responseCode = "200", description = "Ingrédients de la recette récupérés")
    public ResponseEntity<List<CocktailIngredientResponseDTO>> getIngredientsByCocktail(
        @Parameter(description = "ID du cocktail") @PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailIngredientService.getIngredientsByCocktail(cocktail).stream()
            .map(CocktailIngredientResponseDTO::from).toList());
    }

    /**
     * Récupère la liste des cocktails utilisant un ingrédient spécifique.
     *
     * @param ingredientId Identifiant de l'ingrédient
     * @return Liste des cocktails recettes associées
     */
    @GetMapping("/ingredient/{ingredientId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtenir les cocktails utilisant un ingrédient")
    @ApiResponse(responseCode = "200", description = "Cocktails associés récupérés")
    public ResponseEntity<List<CocktailIngredientResponseDTO>> getCocktailsByIngredient(
        @Parameter(description = "ID de l'ingrédient") @PathVariable Long ingredientId) {
        Ingredient ingredient = new Ingredient();
        ingredient.setId(ingredientId);
        return ResponseEntity.ok(cocktailIngredientService.getCocktailsByIngredient(ingredient).stream()
            .map(CocktailIngredientResponseDTO::from).toList());
    }

    /**
     * Met à jour la dose/quantité d'un ingrédient dans un cocktail.
     *
     * @param id Identifiant de la liaison
     * @param quantite Nouvelle quantité
     * @return DTO de la liaison mise à jour
     */
    @PutMapping("/{id}/quantite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Mettre à jour la dose d'un ingrédient (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Quantité mise à jour")
    @ApiResponse(responseCode = "404", description = "Liaison non trouvée")
    public ResponseEntity<CocktailIngredientResponseDTO> updateQuantite(
        @Parameter(description = "ID de la liaison") @PathVariable Long id,
        @Parameter(description = "Nouvelle dose") @RequestParam BigDecimal quantite) {
        return cocktailIngredientService.getCocktailIngredientById(id)
            .map(cocktailIngredient -> {
                cocktailIngredientService.updateQuantite(cocktailIngredient, quantite);
                return ResponseEntity.ok(CocktailIngredientResponseDTO.from(cocktailIngredient));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Supprime le lien entre un cocktail et un ingrédient désignés par leurs IDs respectifs.
     *
     * @param cocktailId Identifiant du cocktail
     * @param ingredientId Identifiant de l'ingrédient
     * @return Statut 200 OK
     */
    @DeleteMapping("/cocktail/{cocktailId}/ingredient/{ingredientId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Supprimer un ingrédient d'une recette par IDs (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Liaison supprimée")
    public ResponseEntity<Void> deleteCocktailIngredient(
        @Parameter(description = "ID du cocktail") @PathVariable Long cocktailId,
        @Parameter(description = "ID de l'ingrédient") @PathVariable Long ingredientId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        Ingredient ingredient = new Ingredient();
        ingredient.setId(ingredientId);
        cocktailIngredientService.deleteCocktailIngredient(cocktail, ingredient);
        return ResponseEntity.ok().build();
    }
}
