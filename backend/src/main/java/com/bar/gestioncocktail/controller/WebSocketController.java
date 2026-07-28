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
 * Controller STOMP WebSocket gérant les interactions messaging et diffusions temps réel.
 * <p>
 * Traite les messages entrants des clients et déclenche la diffusion sur les topics WebSocket correspondants.
 */
@Controller
public class WebSocketController {

    private final NotificationService notificationService;

    /**
     * Constructeur avec injection du service de notification.
     *
     * @param notificationService Service de notification WebSocket
     */
    public WebSocketController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Notifie la création d'une nouvelle commande sur le topic {@code /topic/commandes}.
     *
     * @param commande La commande créée
     * @return DTO de la commande diffusé aux abonnés
     */
    @MessageMapping("/commandes/nouvelle")
    @SendTo("/topic/commandes")
    public CommandeResponseDTO nouvelleCommande(Commande commande) {
        notificationService.notifierNouvelleCommande(commande);
        return CommandeResponseDTO.from(commande);
    }

    /**
     * Notifie la mise à jour du statut d'une commande sur son topic spécifique {@code /topic/commandes/{commandeId}}.
     *
     * @param commande La commande modifiée
     * @return DTO de la commande diffusé
     */
    @MessageMapping("/commandes/statut")
    @SendTo("/topic/commandes/{commandeId}")
    public CommandeResponseDTO statutCommande(Commande commande) {
        notificationService.notifierStatutCommande(commande);
        return CommandeResponseDTO.from(commande);
    }

    /**
     * Notifie l'occupation d'une table sur le topic {@code /topic/tables}.
     *
     * @param table La table occupée
     * @return DTO de la table
     */
    @MessageMapping("/tables/occuper")
    @SendTo("/topic/tables")
    public TableResponseDTO occuperTable(TableEntity table) {
        notificationService.notifierOccupationTable(table);
        return TableResponseDTO.from(table);
    }

    /**
     * Notifie la libération d'une table sur le topic {@code /topic/tables}.
     *
     * @param table La table libérée
     * @return DTO de la table
     */
    @MessageMapping("/tables/liberer")
    @SendTo("/topic/tables")
    public TableResponseDTO libererTable(TableEntity table) {
        notificationService.notifierLiberationTable(table);
        return TableResponseDTO.from(table);
    }
}
