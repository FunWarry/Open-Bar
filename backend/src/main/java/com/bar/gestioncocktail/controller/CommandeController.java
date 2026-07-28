package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.service.CommandeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Controller REST gérant le cycle de vie des commandes.
 * <p>
 * Permet la création, la mise à jour des lignes de commande, le suivi par table ou statut,
 * le changement d'état (EN_ATTENTE, EN_PREPARATION, PRET, LIVREE, REGLEE, ANNULEE) et la gestion des priorités.
 */
@RestController
@RequestMapping("/api/commandes")
@Tag(name = "Commandes", description = "Gestion du cycle de vie des commandes bar et table")
public class CommandeController {
    private final CommandeService commandeService;

    /**
     * Constructeur avec injection du service de commande.
     *
     * @param commandeService Le service gérant la logique métier des commandes
     */
    public CommandeController(CommandeService commandeService) {
        this.commandeService = commandeService;
    }

    /**
     * Creates a new order in the system.
     *
     * @param request Order data to create
     * @return DTO of the created order
     */
    @PostMapping
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN')")
    @Operation(summary = "Create an order (SERVEUR/ADMIN)", description = "Places a new order for a table.")
    @ApiResponse(responseCode = "200", description = "Order created successfully")
    public ResponseEntity<CommandeResponseDTO> createCommande(@Valid @RequestBody CommandeRequestDTO request) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.createCommande(request.toEntity())));
    }

    /**
     * Updates an existing order.
     *
     * @param id      Identifier of the order
     * @param request Updated order data
     * @return DTO of the updated order
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN')")
    @Operation(summary = "Update an order (SERVEUR/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Order updated")
    public ResponseEntity<CommandeResponseDTO> updateCommande(
        @Parameter(description = "Order ID") @PathVariable Long id,
        @Valid @RequestBody CommandeRequestDTO request) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.updateCommande(id, request.toEntity())));
    }

    /**
     * Supprime une commande du système.
     *
     * @param id Identifiant de la commande à supprimer
     * @return Statut 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer une commande (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Commande supprimée")
    public ResponseEntity<Void> deleteCommande(@Parameter(description = "ID de la commande") @PathVariable Long id) {
        commandeService.deleteCommande(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Récupère une commande par son identifiant.
     *
     * @param id Identifiant de la commande
     * @return DTO de la commande
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtenir une commande par son ID")
    @ApiResponse(responseCode = "200", description = "Commande trouvée")
    @ApiResponse(responseCode = "404", description = "Commande non trouvée")
    public ResponseEntity<CommandeResponseDTO> getCommandeById(@Parameter(description = "ID de la commande") @PathVariable Long id) {
        return commandeService.getCommandeById(id)
            .map(CommandeResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Liste les commandes associées à une table.
     *
     * @param tableId Identifiant de la table
     * @return Liste des commandes de la table
     */
    @GetMapping("/table/{tableId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les commandes d'une table")
    @ApiResponse(responseCode = "200", description = "Commandes de la table récupérées")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByTable(@Parameter(description = "ID de la table") @PathVariable Long tableId) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(commandeService.getCommandesByTable(table).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    /**
     * Liste les commandes enregistrées par un serveur.
     *
     * @param serveurId Identifiant du serveur
     * @return Liste des commandes du serveur
     */
    @GetMapping("/serveur/{serveurId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les commandes d'un serveur")
    @ApiResponse(responseCode = "200", description = "Commandes récupérées")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByServeur(@Parameter(description = "ID du serveur") @PathVariable Long serveurId) {
        User serveur = new User();
        serveur.setId(serveurId);
        return ResponseEntity.ok(commandeService.getCommandesByServeur(serveur).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    /**
     * Liste les commandes filtrées par leur statut actuel.
     *
     * @param statut Statut de commande (EN_ATTENTE, EN_PREPARATION, PRET, LIVREE, etc.)
     * @return Liste des commandes dans cet état
     */
    @GetMapping("/statut/{statut}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les commandes par statut")
    @ApiResponse(responseCode = "200", description = "Commandes récupérées")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByStatut(@Parameter(description = "Statut de la commande") @PathVariable CommandeStatut statut) {
        return ResponseEntity.ok(commandeService.getCommandesByStatut(statut).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    /**
     * Liste les commandes d'une table filtrées par statut.
     *
     * @param tableId Identifiant de la table
     * @param statut Statut recherché
     * @return Liste des commandes filtrées
     */
    @GetMapping("/table/{tableId}/statut/{statut}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les commandes d'une table filtrées par statut")
    @ApiResponse(responseCode = "200", description = "Commandes récupérées")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByTableAndStatut(
        @Parameter(description = "ID de la table") @PathVariable Long tableId,
        @Parameter(description = "Statut de la commande") @PathVariable CommandeStatut statut) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(commandeService.getCommandesByTableAndStatut(table, statut).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    /**
     * Liste les commandes créées sur une période de temps.
     *
     * @param debut Date et heure de début
     * @param fin Date et heure de fin
     * @return Liste des commandes dans la période
     */
    @GetMapping("/date")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les commandes sur une plage de dates")
    @ApiResponse(responseCode = "200", description = "Commandes récupérées")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByDate(
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(commandeService.getCommandesByDate(debut, fin).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    /**
     * Ajoute un article (cocktail / variante) à une commande existante.
     *
     * @param id Identifiant de la commande
     * @param item Ligne de commande à rajouter
     * @return DTO de la commande mise à jour
     */
    @PostMapping("/{id}/items")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN')")
    @Operation(summary = "Add an item to an order (SERVEUR/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Item added")
    public ResponseEntity<CommandeResponseDTO> ajouterItem(
        @Parameter(description = "Order ID") @PathVariable Long id,
        @Valid @RequestBody CommandeItemRequestDTO request) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.ajouterItem(id, request.toEntity())));
    }

    /**
     * Retire un article d'une commande.
     *
     * @param id Identifiant de la commande
     * @param itemId Identifiant de la ligne d'article
     * @return DTO de la commande mise à jour
     */
    @DeleteMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN')")
    @Operation(summary = "Retirer un article d'une commande (SERVEUR/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Article retiré")
    public ResponseEntity<CommandeResponseDTO> retirerItem(
        @Parameter(description = "ID de la commande") @PathVariable Long id,
        @Parameter(description = "ID de l'article") @PathVariable Long itemId) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.retirerItem(id, itemId)));
    }

    /**
     * Fait évoluer le statut d'une commande (ex: passage à EN_PREPARATION par le barman).
     *
     * @param id Identifiant de la commande
     * @param nouveauStatut Le nouveau statut à appliquer
     * @return DTO de la commande mise à jour
     */
    @PutMapping("/{id}/statut")
    @PreAuthorize("hasRole('BARMAN') or hasRole('SERVEUR')")
    @Operation(summary = "Changer le statut d'une commande (BARMAN/SERVEUR)", description = "Déclenche la mise à jour des timestamps et les évènements WebSocket.")
    @ApiResponse(responseCode = "200", description = "Statut mis à jour")
    public ResponseEntity<CommandeResponseDTO> changerStatut(
        @Parameter(description = "ID de la commande") @PathVariable Long id,
        @RequestBody CommandeStatut nouveauStatut) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.changerStatut(id, nouveauStatut)));
    }

    /**
     * Annule une commande en cours.
     *
     * @param id Identifiant de la commande à annuler
     * @return DTO de la commande annulée
     */
    @PutMapping("/{id}/annuler")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('MANAGER')")
    @Operation(summary = "Annuler une commande (SERVEUR/MANAGER)")
    @ApiResponse(responseCode = "200", description = "Commande annulée")
    @ApiResponse(responseCode = "404", description = "Commande non trouvée")
    public ResponseEntity<CommandeResponseDTO> annulerCommande(@Parameter(description = "ID de la commande") @PathVariable Long id) {
        return commandeService.getCommandeById(id)
            .map(commande -> {
                commandeService.annulerCommande(commande);
                return ResponseEntity.ok(CommandeResponseDTO.from(commande));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Définit si une ligne de commande est prioritaire.
     *
     * @param itemId Identifiant de la ligne d'article
     * @param prioritaire Indique si la préparation est prioritaire
     * @return Statut 200 OK
     */
    @PutMapping("/items/{itemId}/priorite")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('BARMAN')")
    @Operation(summary = "Marquer un article comme prioritaire (SERVEUR/BARMAN)")
    @ApiResponse(responseCode = "200", description = "Priorité mise à jour")
    public ResponseEntity<Void> definirPriorite(
        @Parameter(description = "ID de l'article") @PathVariable Long itemId,
        @RequestParam boolean prioritaire) {
        CommandeItem item = new CommandeItem();
        item.setId(itemId);
        commandeService.definirPriorite(item, prioritaire);
        return ResponseEntity.ok().build();
    }
}
