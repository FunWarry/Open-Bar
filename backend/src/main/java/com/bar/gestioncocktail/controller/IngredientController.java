package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.IngredientRequestDTO;
import com.bar.gestioncocktail.dto.IngredientResponseDTO;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.service.IngredientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Controller REST gérant le stock des ingrédients.
 */
@RestController
@RequestMapping("/api/ingredients")
@Tag(name = "Ingrédients", description = "Gestion du stock d'ingrédients, seuils d'alerte et inventaire")
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
        Ingredient ingredient = request.toEntity();
        ingredient.setId(id);
        return ResponseEntity.ok(IngredientResponseDTO.from(ingredientService.updateIngredient(ingredient)));
    }

    /**
     * Supprime un ingrédient du système.
     *
     * @param id Identifiant de l'ingrédient
     * @return Statut 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un ingrédient (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Ingrédient supprimé")
    public ResponseEntity<Void> deleteIngredient(@Parameter(description = "ID de l'ingrédient") @PathVariable Long id) {
        ingredientService.deleteIngredient(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Obtenir un ingrédient par son identifiant.
     *
     * @param id Identifiant
     * @return DTO de l'ingrédient
     */
    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un ingrédient par son ID")
    @ApiResponse(responseCode = "200", description = "Ingrédient trouvé")
    @ApiResponse(responseCode = "404", description = "Ingrédient introuvable")
    public ResponseEntity<IngredientResponseDTO> getIngredientById(@Parameter(description = "ID de l'ingrédient") @PathVariable Long id) {
        return ingredientService.getIngredientById(id)
            .map(IngredientResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Obtenir la liste des ingrédients dont le niveau de stock est sous le seuil d'alerte.
     *
     * @return Liste des ingrédients en alerte stock
     */
    @GetMapping("/seuil-alerte")
    @Operation(summary = "Lister les ingrédients sous le seuil d'alerte stock")
    @ApiResponse(responseCode = "200", description = "Liste des ingrédients en alerte")
    public ResponseEntity<List<IngredientResponseDTO>> getIngredientsBySeuilAlerte() {
        return ResponseEntity.ok(ingredientService.getIngredientsBySeuilAlerte().stream()
            .map(IngredientResponseDTO::from).toList());
    }

    /**
     * Rechercher des ingrédients par nom.
     *
     * @param nom Mot-clé
     * @return Ingrédients correspondants
     */
    @GetMapping("/search")
    @Operation(summary = "Rechercher des ingrédients par nom")
    @ApiResponse(responseCode = "200", description = "Résultats de recherche")
    public ResponseEntity<List<IngredientResponseDTO>> searchIngredients(@RequestParam String nom) {
        return ResponseEntity.ok(ingredientService.searchIngredients(nom).stream()
            .map(IngredientResponseDTO::from).toList());
    }

    /**
     * Filtrer les ingrédients par nom de fournisseur.
     *
     * @param fournisseur Nom du fournisseur
     * @return Liste d'ingrédients
     */
    @GetMapping("/fournisseur/{fournisseur}")
    @Operation(summary = "Lister les ingrédients par fournisseur")
    @ApiResponse(responseCode = "200", description = "Liste récupérée")
    public ResponseEntity<List<IngredientResponseDTO>> getIngredientsByFournisseur(@PathVariable String fournisseur) {
        return ResponseEntity.ok(ingredientService.getIngredientsByFournisseur(fournisseur).stream()
            .map(IngredientResponseDTO::from).toList());
    }

    /**
     * Filtrer les ingrédients par unité de mesure (ex: ml, cl, g, unité).
     *
     * @param uniteMesure Nom de l'unité
     * @return Liste d'ingrédients
     */
    @GetMapping("/unite-mesure/{uniteMesure}")
    @Operation(summary = "Lister les ingrédients par unité de mesure")
    @ApiResponse(responseCode = "200", description = "Liste récupérée")
    public ResponseEntity<List<IngredientResponseDTO>> getIngredientsByUniteMesure(@PathVariable String uniteMesure) {
        return ResponseEntity.ok(ingredientService.getIngredientsByUniteMesure(uniteMesure).stream()
            .map(IngredientResponseDTO::from).toList());
    }

    /**
     * Met à jour la quantité en stock d'un ingrédient.
     *
     * @param id Identifiant de l'ingrédient
     * @param quantite Nouvelle valeur du stock
     * @return Ingrédient mis à jour
     */
    @PutMapping("/{id}/stock")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(summary = "Mettre à jour la quantité en stock (MANAGER/BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Stock mis à jour")
    public ResponseEntity<IngredientResponseDTO> updateStock(
        @PathVariable Long id,
        @RequestParam BigDecimal quantite) {
        return ingredientService.getIngredientById(id)
            .map(ingredient -> {
                ingredientService.updateStock(ingredient, quantite);
                return ResponseEntity.ok(IngredientResponseDTO.from(ingredient));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Définit le seuil d'alerte de stock d'un ingrédient.
     *
     * @param id Identifiant de l'ingrédient
     * @param seuil Nouvelle valeur du seuil d'alerte
     * @return Ingrédient mis à jour
     */
    @PutMapping("/{id}/seuil-alerte")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(summary = "Définir le seuil d'alerte de stock (MANAGER/BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Seuil d'alerte mis à jour")
    public ResponseEntity<IngredientResponseDTO> definirSeuilAlerte(
        @PathVariable Long id,
        @RequestParam BigDecimal seuil) {
        return ingredientService.getIngredientById(id)
            .map(ingredient -> {
                ingredientService.definirSeuilAlerte(ingredient, seuil);
                return ResponseEntity.ok(IngredientResponseDTO.from(ingredient));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
