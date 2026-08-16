package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
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
 * REST controller managing order lifecycle.
 * <p>
 * Handles creation, order item updates, table or status tracking,
 * status progression (EN_ATTENTE, EN_PREPARATION, PRET, LIVREE, REGLEE, ANNULEE), and priority flags.
 */
@RestController
@RequestMapping("/api/commandes")
@Tag(name = "Commandes", description = "Order lifecycle management for bar and table service")
public class CommandeController {
    private final CommandeService commandeService;

    /**
     * Constructs the controller with the order service dependency.
     *
     * @param commandeService Service managing order domain logic
     */
    public CommandeController(CommandeService commandeService) {
        this.commandeService = commandeService;
    }

    /**
     * Retrieves the complete list of all orders.
     *
     * @return List of all order DTOs
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all orders", description = "Retrieves all orders in the system.")
    @ApiResponse(responseCode = "200", description = "List of orders retrieved")
    public ResponseEntity<List<CommandeResponseDTO>> getAllCommandes() {
        return ResponseEntity.ok(commandeService.getAllCommandesDto());
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
     * Deletes an order from the system.
     *
     * @param id Identifier of the order to delete
     * @return HTTP 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete an order (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Order deleted")
    public ResponseEntity<Void> deleteCommande(@Parameter(description = "Order ID") @PathVariable Long id) {
        commandeService.deleteCommande(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Retrieves an order by its identifier.
     *
     * @param id Identifier of the order
     * @return DTO of the found order
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get order by ID")
    @ApiResponse(responseCode = "200", description = "Order found")
    @ApiResponse(responseCode = "404", description = "Order not found")
    public ResponseEntity<CommandeResponseDTO> getCommandeById(@Parameter(description = "Order ID") @PathVariable Long id) {
        return commandeService.getCommandeDtoById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Lists orders associated with a table.
     *
     * @param tableId Table identifier
     * @return List of table orders
     */
    @GetMapping("/table/{tableId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List orders for a table")
    @ApiResponse(responseCode = "200", description = "Table orders retrieved")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByTable(@Parameter(description = "Table ID") @PathVariable Long tableId) {
        return ResponseEntity.ok(commandeService.getCommandesDtoByTable(tableId));
    }

    /**
     * Lists orders created by a server.
     *
     * @param serveurId Server user identifier
     * @return List of server orders
     */
    @GetMapping("/serveur/{serveurId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List orders by server")
    @ApiResponse(responseCode = "200", description = "Server orders retrieved")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByServeur(@Parameter(description = "Server user ID") @PathVariable Long serveurId) {
        User serveur = new User();
        serveur.setId(serveurId);
        return ResponseEntity.ok(commandeService.getCommandesByServeur(serveur).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    /**
     * Lists orders filtered by current status.
     *
     * @param statut Order status (EN_ATTENTE, EN_PREPARATION, PRET, LIVREE, etc.)
     * @return List of orders matching status
     */
    @GetMapping("/statut/{statut}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List orders by status")
    @ApiResponse(responseCode = "200", description = "Orders retrieved")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByStatut(@Parameter(description = "Order status") @PathVariable CommandeStatut statut) {
        return ResponseEntity.ok(commandeService.getCommandesByStatut(statut).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    /**
     * Lists orders for a table filtered by status.
     *
     * @param tableId Table identifier
     * @param statut Target status
     * @return List of filtered orders
     */
    @GetMapping("/table/{tableId}/statut/{statut}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List table orders filtered by status")
    @ApiResponse(responseCode = "200", description = "Table orders retrieved")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByTableAndStatut(
        @Parameter(description = "Table ID") @PathVariable Long tableId,
        @Parameter(description = "Order status") @PathVariable CommandeStatut statut) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(commandeService.getCommandesByTableAndStatut(table, statut).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    /**
     * Lists orders created within a date range.
     *
     * @param debut Start date and time
     * @param fin End date and time
     * @return List of orders within period
     */
    @GetMapping("/date")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List orders in date range")
    @ApiResponse(responseCode = "200", description = "Orders retrieved")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByDate(
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(commandeService.getCommandesByDate(debut, fin).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    /**
     * Adds an item (cocktail / variant) to an existing order.
     *
     * @param id Order identifier
     * @param request Order item payload to add
     * @return Updated order DTO
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
     * Removes an item line from an order.
     *
     * @param id Order identifier
     * @param itemId Order item identifier
     * @return Updated order DTO
     */
    @DeleteMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN')")
    @Operation(summary = "Remove an item from an order (SERVEUR/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Item removed")
    public ResponseEntity<CommandeResponseDTO> retirerItem(
        @Parameter(description = "Order ID") @PathVariable Long id,
        @Parameter(description = "Item ID") @PathVariable Long itemId) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.retirerItem(id, itemId)));
    }

    /**
     * Progresses the status of an order (e.g. advance to EN_PREPARATION by bartender).
     *
     * @param id Order identifier
     * @param body Optional JSON body (string or object)
     * @param statut Optional query param
     * @return Updated order DTO
     */
    @RequestMapping(value = "/{id}/statut", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("hasRole('BARMAN') or hasRole('SERVEUR') or hasRole('ADMIN')")
    @Operation(summary = "Update order status (BARMAN/SERVEUR/ADMIN)", description = "Updates order status and triggers WebSocket broadcasts.")
    @ApiResponse(responseCode = "200", description = "Status updated")
    public ResponseEntity<CommandeResponseDTO> changerStatut(
        @Parameter(description = "Order ID") @PathVariable Long id,
        @RequestBody(required = false) com.fasterxml.jackson.databind.JsonNode body,
        @RequestParam(required = false) CommandeStatut statut) {
        CommandeStatut targetStatut = statut;
        if (targetStatut == null && body != null) {
            if (body.isTextual()) {
                targetStatut = CommandeStatut.valueOf(body.asText());
            } else if (body.has("statut")) {
                targetStatut = CommandeStatut.valueOf(body.get("statut").asText());
            }
        }
        if (targetStatut == null) {
            throw new com.bar.gestioncocktail.exception.BusinessException("Order status is required");
        }
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.changerStatut(id, targetStatut)));
    }

    /**
     * Cancels an active order.
     *
     * @param id Identifier of the order to cancel
     * @return DTO of the canceled order
     */
    @PutMapping("/{id}/annuler")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('MANAGER')")
    @Operation(summary = "Cancel an order (SERVEUR/MANAGER)")
    @ApiResponse(responseCode = "200", description = "Order canceled")
    @ApiResponse(responseCode = "404", description = "Order not found")
    public ResponseEntity<CommandeResponseDTO> annulerCommande(@Parameter(description = "Order ID") @PathVariable Long id) {
        return commandeService.getCommandeById(id)
            .map(commande -> {
                commandeService.annulerCommande(commande);
                return ResponseEntity.ok(CommandeResponseDTO.from(commande));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Sets whether an order item line is marked as priority.
     *
     * @param itemId Order item identifier
     * @param prioritaire Priority status flag
     * @return HTTP 200 OK
     */
    @PutMapping("/items/{itemId}/priorite")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('BARMAN')")
    @Operation(summary = "Mark order item as priority (SERVEUR/BARMAN)")
    @ApiResponse(responseCode = "200", description = "Priority updated")
    public ResponseEntity<Void> definirPriorite(
        @Parameter(description = "Item ID") @PathVariable Long itemId,
        @RequestParam boolean prioritaire) {
        CommandeItem item = new CommandeItem();
        item.setId(itemId);
        commandeService.definirPriorite(item, prioritaire);
        return ResponseEntity.ok().build();
    }

    /**
     * Transfer an order to a new table (SERVEUR/ADMIN).
     *
     * @param id Order ID
     * @param newTableId New target table ID
     * @return DTO of the updated order
     */
    @PutMapping("/{id}/table/{newTableId}")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN')")
    @Operation(summary = "Transfer an order to a new table (SERVEUR/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Order transferred to new table")
    public ResponseEntity<CommandeResponseDTO> transfererCommande(
        @Parameter(description = "Order ID") @PathVariable Long id,
        @Parameter(description = "New Table ID") @PathVariable Long newTableId) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.transfererCommande(id, newTableId)));
    }
}
