package com.bar.gestioncocktail.controller;

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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Controller REST gérant la carte des cocktails.
 * <p>
 * Offre les fonctionnalités CRUD pour les cocktails, la gestion de disponibilité,
 * de la saisonnalité et la recherche par catégorie ou nom.
 */
@RestController
@RequestMapping("/api/cocktails")
@CrossOrigin(origins = "*")
@SuppressWarnings({"java:S4684", "java:S5122"})
@Tag(name = "Cocktails", description = "Gestion du catalogue de cocktails, prix, disponibilité et saisonnalité")
public class CocktailController {
    private final CocktailService cocktailService;

    /**
     * Constructeur avec injection du service cocktail.
     *
     * @param cocktailService Le service gérant la logique métier des cocktails
     */
    @Autowired
    public CocktailController(CocktailService cocktailService) {
        this.cocktailService = cocktailService;
    }

    /**
     * Crée un nouveau cocktail dans le système.
     *
     * @param cocktail Entité cocktail à créer
     * @return DTO du cocktail créé
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Créer un cocktail (BARMAN/ADMIN)", description = "Ajoute un nouveau cocktail à la carte.")
    @ApiResponse(responseCode = "200", description = "Cocktail créé avec succès")
    @ApiResponse(responseCode = "403", description = "Accès refusé")
    public ResponseEntity<CocktailResponseDTO> createCocktail(@Valid @RequestBody Cocktail cocktail) {
        return ResponseEntity.ok(CocktailResponseDTO.from(cocktailService.createCocktail(cocktail)));
    }

    /**
     * Met à jour les informations d'un cocktail existant.
     *
     * @param id Identifiant du cocktail à modifier
     * @param cocktail Nouvelles données du cocktail
     * @return DTO du cocktail mis à jour
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Mettre à jour un cocktail (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Cocktail mis à jour")
    @ApiResponse(responseCode = "404", description = "Cocktail non trouvé")
    public ResponseEntity<CocktailResponseDTO> updateCocktail(
        @Parameter(description = "ID du cocktail") @PathVariable Long id,
        @Valid @RequestBody Cocktail cocktail) {
        cocktail.setId(id);
        return ResponseEntity.ok(CocktailResponseDTO.from(cocktailService.updateCocktail(cocktail)));
    }

    /**
     * Supprime un cocktail du système.
     *
     * @param id Identifiant du cocktail à supprimer
     * @return Statut 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un cocktail (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Cocktail supprimé")
    @ApiResponse(responseCode = "404", description = "Cocktail non trouvé")
    public ResponseEntity<Void> deleteCocktail(@Parameter(description = "ID du cocktail") @PathVariable Long id) {
        cocktailService.deleteCocktail(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Récupère un cocktail par son identifiant.
     *
     * @param id Identifiant du cocktail
     * @return DTO du cocktail trouvé
     */
    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un cocktail par son ID")
    @ApiResponse(responseCode = "200", description = "Cocktail trouvé")
    @ApiResponse(responseCode = "404", description = "Cocktail non trouvé")
    public ResponseEntity<CocktailResponseDTO> getCocktailById(@Parameter(description = "ID du cocktail") @PathVariable Long id) {
        return cocktailService.getCocktailById(id)
            .map(CocktailResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Liste les cocktails filtrés par catégorie (ex: ALCOOLISE, SANS_ALCOOL, SHOT).
     *
     * @param categorie Catégorie ciblée
     * @return Liste des cocktails de la catégorie
     */
    @GetMapping("/categorie/{categorie}")
    @Operation(summary = "Lister les cocktails par catégorie")
    @ApiResponse(responseCode = "200", description = "Liste récupérée")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsByCategorie(
        @Parameter(description = "Catégorie de cocktail") @PathVariable CocktailCategorie categorie) {
        return ResponseEntity.ok(cocktailService.getCocktailsByCategorie(categorie).stream()
            .map(CocktailResponseDTO::from).toList());
    }

    /**
     * Liste l'ensemble des cocktails actuellement disponibles au service.
     *
     * @return Liste des cocktails disponibles
     */
    @GetMapping("/disponibles")
    @Operation(summary = "Lister les cocktails disponibles", description = "Retourne la liste des cocktails dont la disponibilité est à true.")
    @ApiResponse(responseCode = "200", description = "Liste récupérée")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsDisponibles() {
        return ResponseEntity.ok(cocktailService.getCocktailsDisponibles().stream()
            .map(CocktailResponseDTO::from).toList());
    }

    /**
     * Liste les cocktails définis comme saisonniers.
     *
     * @return Liste des cocktails saisonniers
     */
    @GetMapping("/saisonniers")
    @Operation(summary = "Lister les cocktails saisonniers")
    @ApiResponse(responseCode = "200", description = "Liste récupérée")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsSaisonniers() {
        return ResponseEntity.ok(cocktailService.getCocktailsSaisonniers().stream()
            .map(CocktailResponseDTO::from).toList());
    }

    /**
     * Liste les cocktails saisonniers actuellement en cours de saison.
     *
     * @return Liste des cocktails en saison
     */
    @GetMapping("/saisonniers/actuels")
    @Operation(summary = "Lister les cocktails actuellement de saison")
    @ApiResponse(responseCode = "200", description = "Liste récupérée")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsSaisonniersActuels() {
        return ResponseEntity.ok(cocktailService.getCocktailsSaisonniersActuels().stream()
            .map(CocktailResponseDTO::from).toList());
    }

    /**
     * Recherche des cocktails par leur nom (recherche partielle).
     *
     * @param nom Mot-clé de recherche
     * @return Liste des cocktails correspondants
     */
    @GetMapping("/search")
    @Operation(summary = "Rechercher des cocktails par nom")
    @ApiResponse(responseCode = "200", description = "Liste des résultats")
    public ResponseEntity<List<CocktailResponseDTO>> searchCocktails(
        @Parameter(description = "Terme de recherche dans le nom") @RequestParam String nom) {
        return ResponseEntity.ok(cocktailService.searchCocktails(nom).stream()
            .map(CocktailResponseDTO::from).toList());
    }

    /**
     * Bascule l'état de disponibilité d'un cocktail (disponible / indisponible).
     *
     * @param id Identifiant du cocktail
     * @return DTO mis à jour
     */
    @PutMapping("/{id}/disponibilite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN') or hasRole('MANAGER')")
    @Operation(summary = "Basculer la disponibilité d'un cocktail (BARMAN/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Disponibilité basculée")
    @ApiResponse(responseCode = "404", description = "Cocktail non trouvé")
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
     * Définit la plage de dates de saisonnalité d'un cocktail.
     *
     * @param id Identifiant du cocktail
     * @param dateDebut Date de début de saison
     * @param dateFin Date de fin de saison
     * @return DTO du cocktail mis à jour
     */
    @PutMapping("/{id}/saisonnalite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Définir la plage de saisonnalité (date début / fin)")
    @ApiResponse(responseCode = "200", description = "Saisonnalité enregistrée")
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
     * Met à jour les mois de début et de fin de saisonnalité d'un cocktail.
     *
     * @param id Identifiant du cocktail
     * @param request DTO contenant les mois de début (1-12) et de fin (1-12)
     * @return DTO du cocktail mis à jour
     */
    @PatchMapping("/{id}/saisonnalite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(summary = "Mettre à jour les mois de saisonnalité (1-12)")
    @ApiResponse(responseCode = "200", description = "Saisonnalité par mois mise à jour")
    public ResponseEntity<CocktailResponseDTO> updateSaisonnalite(
        @PathVariable Long id,
        @RequestBody SaisonnaliteRequest request) {
        return ResponseEntity.ok(CocktailResponseDTO.from(
            cocktailService.updateSaisonnalite(id, request.moisDebut(), request.moisFin())));
    }
}
