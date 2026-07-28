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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Controller REST pour la gestion des variantes de cocktails (ex: Sans alcool, XL, Premium).
 */
@RestController
@RequestMapping("/api/cocktail-variantes")
@Tag(name = "Variantes Cocktails", description = "Gestion des déclinaisons et options de cocktails")
public class CocktailVarianteController {
    private final CocktailVarianteService cocktailVarianteService;

    /**
     * Constructeur avec injection du service de variante.
     *
     * @param cocktailVarianteService Service gérant les variantes de cocktails
     */
    @Autowired
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
     * Supprime une variante de cocktail.
     *
     * @param id Identifiant de la variante
     * @return Statut 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Supprimer une variante (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Variante supprimée")
    public ResponseEntity<Void> deleteCocktailVariante(@Parameter(description = "ID de la variante") @PathVariable Long id) {
        cocktailVarianteService.deleteCocktailVariante(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Récupère une variante par son ID.
     *
     * @param id Identifiant de la variante
     * @return DTO de la variante
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtenir une variante par son ID")
    @ApiResponse(responseCode = "200", description = "Variante trouvée")
    @ApiResponse(responseCode = "404", description = "Variante non trouvée")
    public ResponseEntity<CocktailVarianteResponseDTO> getCocktailVarianteById(@Parameter(description = "ID de la variante") @PathVariable Long id) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(CocktailVarianteResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Liste toutes les variantes associées à un cocktail.
     *
     * @param cocktailId Identifiant du cocktail
     * @return Liste des variantes du cocktail
     */
    @GetMapping("/cocktail/{cocktailId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les variantes d'un cocktail")
    @ApiResponse(responseCode = "200", description = "Variantes récupérées")
    public ResponseEntity<List<CocktailVarianteResponseDTO>> getVariantesByCocktail(
        @Parameter(description = "ID du cocktail") @PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailVarianteService.getVariantesByCocktail(cocktail).stream()
            .map(CocktailVarianteResponseDTO::from).toList());
    }

    /**
     * Liste les variantes disponibles pour un cocktail donné.
     *
     * @param cocktailId Identifiant du cocktail
     * @return Liste des variantes disponibles
     */
    @GetMapping("/cocktail/{cocktailId}/disponibles")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les variantes disponibles d'un cocktail")
    @ApiResponse(responseCode = "200", description = "Variantes disponibles récupérées")
    public ResponseEntity<List<CocktailVarianteResponseDTO>> getVariantesDisponiblesByCocktail(
        @Parameter(description = "ID du cocktail") @PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailVarianteService.getVariantesDisponiblesByCocktail(cocktail).stream()
            .map(CocktailVarianteResponseDTO::from).toList());
    }

    /**
     * Recherche des variantes par nom.
     *
     * @param nom Terme de recherche
     * @return Liste des variantes trouvées
     */
    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Rechercher des variantes par nom")
    @ApiResponse(responseCode = "200", description = "Résultats de recherche")
    public ResponseEntity<List<CocktailVarianteResponseDTO>> searchVariantes(@RequestParam String nom) {
        return ResponseEntity.ok(cocktailVarianteService.searchVariantes(nom).stream()
            .map(CocktailVarianteResponseDTO::from).toList());
    }

    /**
     * Bascule la disponibilité d'une variante.
     *
     * @param id Identifiant de la variante
     * @return DTO de la variante modifiée
     */
    @PutMapping("/{id}/disponibilite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN') or hasRole('MANAGER')")
    @Operation(summary = "Basculer la disponibilité d'une variante (BARMAN/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Disponibilité basculée")
    @ApiResponse(responseCode = "404", description = "Variante non trouvée")
    public ResponseEntity<CocktailVarianteResponseDTO> toggleDisponibilite(@PathVariable Long id) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(variante -> {
                cocktailVarianteService.toggleDisponibilite(variante);
                return ResponseEntity.ok(CocktailVarianteResponseDTO.from(variante));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Met à jour le supplément tarifaire d'une variante.
     *
     * @param id Identifiant de la variante
     * @param prixSupplement Nouveau prix du supplément
     * @return DTO de la variante modifiée
     */
    @PutMapping("/{id}/prix-supplement")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Mettre à jour le prix du supplément d'une variante (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Prix du supplément mis à jour")
    @ApiResponse(responseCode = "404", description = "Variante non trouvée")
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
