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

/**
 * Controller REST gérant la carte des cocktails.
 * <p>
 * Offre les fonctionnalités CRUD pour les cocktails, la gestion de disponibilité,
 * de la saisonnalité et la recherche par catégorie ou nom.
 */
@RestController
@RequestMapping("/api/cocktails")
@Tag(name = "Cocktails", description = "Gestion du catalogue de cocktails, prix, disponibilité et saisonnalité")
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
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Create a cocktail (BARMAN/ADMIN)", description = "Adds a new cocktail to the menu.")
    @ApiResponse(responseCode = "200", description = "Cocktail created successfully")
    @ApiResponse(responseCode = "403", description = "Access denied")
    public ResponseEntity<CocktailResponseDTO> createCocktail(@Valid @RequestBody CocktailRequestDTO request) {
        return ResponseEntity.ok(CocktailResponseDTO.from(cocktailService.createCocktail(request.toEntity())));
    }

    /**
     * Updates an existing cocktail.
     *
     * @param id      Identifier of the cocktail to update
     * @param request Updated cocktail data
     * @return DTO of the updated cocktail
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    @Operation(summary = "Update a cocktail (BARMAN/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Cocktail updated")
    @ApiResponse(responseCode = "404", description = "Cocktail not found")
    public ResponseEntity<CocktailResponseDTO> updateCocktail(
        @Parameter(description = "Cocktail ID") @PathVariable Long id,
        @Valid @RequestBody CocktailRequestDTO request) {
        Cocktail cocktail = request.toEntity();
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

    /**
     * Uploads a custom photo for a cocktail (BARMAN, MANAGER, or ADMIN).
     *
     * @param id   Identifier of the target cocktail
     * @param file Multipart photo file
     * @return Updated cocktail DTO with new photo URL
     */
    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
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
