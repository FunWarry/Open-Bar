package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.dto.TableResponseDTO;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.NotificationService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

/**
 * STOMP WebSocket controller managing messaging interactions and real-time broadcasts.
 * <p>
 * Handles incoming client messages and triggers broadcasts to corresponding WebSocket topics.
 */
@Controller
public class WebSocketController {

    private final NotificationService notificationService;

    /**
     * Constructs the controller with notification service dependency.
     *
     * @param notificationService WebSocket notification service
     */
    public WebSocketController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Broadcasts notification of a newly placed order to {@code /topic/commandes}.
     *
     * @param commande Created order entity
     * @return Order response DTO broadcast to subscribers
     */
    @MessageMapping("/commandes/nouvelle")
    @SendTo("/topic/commandes")
    public CommandeResponseDTO nouvelleCommande(Commande commande) {
        notificationService.notifierNouvelleCommande(commande);
        return CommandeResponseDTO.from(commande);
    }

    /**
     * Broadcasts notification of order status updates to {@code /topic/commandes/{commandeId}}.
     *
     * @param commande Updated order entity
     * @return Broadcast order DTO
     */
    @MessageMapping("/commandes/statut")
    @SendTo("/topic/commandes/{commandeId}")
    public CommandeResponseDTO statutCommande(Commande commande) {
        notificationService.notifierStatutCommande(commande);
        return CommandeResponseDTO.from(commande);
    }

    /**
     * Broadcasts table occupancy status to {@code /topic/tables}.
     *
     * @param table Occupied table entity
     * @return Broadcast table DTO
     */
    @MessageMapping("/tables/occuper")
    @SendTo("/topic/tables")
    public TableResponseDTO occuperTable(TableEntity table) {
        notificationService.notifierOccupationTable(table);
        return TableResponseDTO.from(table);
    }

    /**
     * Broadcasts table liberation to {@code /topic/tables}.
     *
     * @param table Liberated table entity
     * @return Broadcast table DTO
     */
    @MessageMapping("/tables/liberer")
    @SendTo("/topic/tables")
    public TableResponseDTO libererTable(TableEntity table) {
        notificationService.notifierLiberationTable(table);
        return TableResponseDTO.from(table);
    }
}
