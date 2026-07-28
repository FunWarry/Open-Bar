package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PlanSalleDTO;
import com.bar.gestioncocktail.dto.TablePositionDTO;
import com.bar.gestioncocktail.dto.TableResponseDTO;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import com.bar.gestioncocktail.service.TableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST pour la gestion des tables du bar, du plan de salle interactif (Konva.js)
 * et du transfert de commandes entre tables.
 */
@RestController
@RequestMapping("/api/tables")
@Tag(name = "Tables & Plan de salle", description = "Gestion des tables, occupation, disposition 2D (Konva.js) et transfert d'addition")
public class TableController {

    private final TableService tableService;

    /**
     * Constructeur avec injection du service de gestion des tables.
     *
     * @param tableService Le service gérant la logique des tables
     */
    public TableController(TableService tableService) {
        this.tableService = tableService;
    }

    /**
     * Liste l'ensemble des tables de l'établissement.
     *
     * @return Liste des tables au format DTO
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister toutes les tables")
    @ApiResponse(responseCode = "200", description = "Tables récupérées")
    public List<TableResponseDTO> getAllTables() {
        return tableService.getAllTables().stream().map(TableResponseDTO::from).toList();
    }

    /**
     * Obtenir les informations d'une table par son identifiant.
     *
     * @param id Identifiant de la table
     * @return DTO de la table
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtenir une table par son ID")
    @ApiResponse(responseCode = "200", description = "Table trouvée")
    @ApiResponse(responseCode = "404", description = "Table introuvable")
    public ResponseEntity<TableResponseDTO> getTableById(@Parameter(description = "ID de la table") @PathVariable Long id) {
        return tableService.getTableById(id)
            .map(TableResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Liste les tables d'une zone géographique spécifique (ex: INTERIEUR, TERRASSE, ETAGE).
     *
     * @param zone La zone ciblée
     * @return Liste des tables de la zone
     */
    @GetMapping("/zone/{zone}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les tables par zone (INTERIEUR, TERRASSE, ETAGE)")
    @ApiResponse(responseCode = "200", description = "Tables récupérées")
    public List<TableResponseDTO> getTablesByZone(@Parameter(description = "Zone géographique") @PathVariable TableZone zone) {
        return tableService.getTablesByZone(zone).stream().map(TableResponseDTO::from).toList();
    }

    /**
     * Liste les tables filtrées par leur statut d'occupation (occupée ou libre).
     *
     * @param occupee True pour les tables occupées, false pour les libres
     * @return Liste des tables
     */
    @GetMapping("/occupee/{occupee}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les tables par état d'occupation")
    @ApiResponse(responseCode = "200", description = "Tables récupérées")
    public List<TableResponseDTO> getTablesByOccupee(@Parameter(description = "État d'occupation") @PathVariable boolean occupee) {
        return tableService.getTablesByOccupee(occupee).stream().map(TableResponseDTO::from).toList();
    }

    /**
     * Liste les tables attribuées à un serveur spécifique.
     *
     * @param serveurId Identifiant du serveur
     * @return Liste des tables du serveur
     */
    @GetMapping("/serveur/{serveurId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les tables attribuées à un serveur")
    @ApiResponse(responseCode = "200", description = "Tables du serveur récupérées")
    public List<TableResponseDTO> getTablesByServeurId(@Parameter(description = "ID du serveur") @PathVariable Long serveurId) {
        return tableService.getTablesByServeurId(serveurId).stream().map(TableResponseDTO::from).toList();
    }

    /**
     * Crée une nouvelle table.
     *
     * @param table L'entité table à ajouter
     * @return DTO de la table créée
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Créer une nouvelle table (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Table créée")
    public TableResponseDTO createTable(@Valid @RequestBody TableEntity table) {
        return TableResponseDTO.from(tableService.createTable(table));
    }

    /**
     * Met à jour une table existante.
     *
     * @param id Identifiant de la table
     * @param tableDetails Nouvelles données
     * @return DTO de la table mise à jour
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Mettre à jour une table (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Table mise à jour")
    public ResponseEntity<TableResponseDTO> updateTable(
        @Parameter(description = "ID de la table") @PathVariable Long id,
        @Valid @RequestBody TableEntity tableDetails) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.updateTable(id, tableDetails)));
    }

    /**
     * Supprime une table.
     *
     * @param id Identifiant de la table
     * @return Statut 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Supprimer une table (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Table supprimée")
    public ResponseEntity<Void> deleteTable(@Parameter(description = "ID de la table") @PathVariable Long id) {
        tableService.deleteTable(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Marque une table comme occupée et lui assigne un serveur.
     *
     * @param id Identifiant de la table
     * @param serveurId Identifiant du serveur référent
     * @return Table mise à jour
     */
    @PostMapping("/{id}/occuper")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Passer la table en état occupée (SERVEUR/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Table marquée occupée")
    public ResponseEntity<TableResponseDTO> occuperTable(
        @PathVariable Long id,
        @RequestParam Long serveurId) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.occuperTable(id, serveurId)));
    }

    /**
     * Libère une table (déclenche la réinitialisation de son état).
     *
     * @param id Identifiant de la table
     * @return Table libérée
     */
    @PostMapping("/{id}/liberer")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Libérer une table (SERVEUR/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Table libérée")
    public ResponseEntity<TableResponseDTO> libererTable(@PathVariable Long id) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.libererTable(id)));
    }

    /**
     * Récupère le plan de salle 2D complet avec coordonnées (X, Y) et formes géométriques pour Konva.js.
     *
     * @return Liste des tables enrichies des données de positionnement canvas
     */
    @GetMapping("/plan")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtenir le plan de salle interactif avec positions Konva.js")
    @ApiResponse(responseCode = "200", description = "Plan de salle récupéré avec coordonnées")
    public List<PlanSalleDTO> getPlanSalle() {
        return tableService.getAllTablesAvecPositions()
            .stream().map(PlanSalleDTO::from).toList();
    }

    /**
     * Met à jour la position 2D (X, Y, rotation, forme) d'une table sur le plan de salle.
     *
     * @param id Identifiant de la table
     * @param x Coordonnée X
     * @param y Coordonnée Y
     * @param rotation Angle de rotation
     * @param forme Forme (Ronde, Carrée, Rectangulaire)
     * @return Table mise à jour
     */
    @PutMapping("/{id}/position")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Mettre à jour les coordonnées 2D d'une table (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Coordonnées enregistrées")
    public ResponseEntity<TableResponseDTO> updatePosition(
        @PathVariable Long id,
        @RequestParam Double x,
        @RequestParam Double y,
        @RequestParam(required = false) Double rotation,
        @RequestParam(required = false) String forme) {
        return ResponseEntity.ok(TableResponseDTO.from(
            tableService.updatePosition(id, x, y, rotation, forme)));
    }

    /**
     * Sauvegarde en lot (batch) la disposition et les positions de plusieurs tables du plan de salle.
     *
     * @param positions Liste des DTOs de positionnement
     * @return Statut 200 OK
     */
    @PutMapping("/plan/positions")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Sauvegarder en lot les positions du plan de salle (drag & drop batch)")
    @ApiResponse(responseCode = "200", description = "Positions enregistrées")
    public ResponseEntity<Void> updatePositionsBatch(@RequestBody List<TablePositionDTO> positions) {
        tableService.updatePositionsBatch(positions);
        return ResponseEntity.ok().build();
    }

    /**
     * Transfère les commandes en cours d'une table source vers une table cible.
     *
     * @param sourceId Table d'origine
     * @param targetId Table de destination
     * @return Table de destination mise à jour
     */
    @PostMapping("/{sourceId}/transfer/{targetId}")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Transférer les commandes d'une table vers une autre (SERVEUR/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Transfert effectué")
    public ResponseEntity<TableResponseDTO> transfererCommandes(
        @Parameter(description = "ID table d'origine") @PathVariable Long sourceId,
        @Parameter(description = "ID table de destination") @PathVariable Long targetId) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.transfererCommandes(sourceId, targetId)));
    }
}
