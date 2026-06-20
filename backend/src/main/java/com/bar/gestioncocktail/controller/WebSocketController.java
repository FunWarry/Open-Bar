package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.dto.TableResponseDTO;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.NotificationService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class WebSocketController {

    private final NotificationService notificationService;

    public WebSocketController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @MessageMapping("/commandes/nouvelle")
    @SendTo("/topic/commandes")
    public CommandeResponseDTO nouvelleCommande(Commande commande) {
        notificationService.notifierNouvelleCommande(commande);
        return CommandeResponseDTO.from(commande);
    }

    @MessageMapping("/commandes/statut")
    @SendTo("/topic/commandes/{commandeId}")
    public CommandeResponseDTO statutCommande(Commande commande) {
        notificationService.notifierStatutCommande(commande);
        return CommandeResponseDTO.from(commande);
    }

    @MessageMapping("/tables/occuper")
    @SendTo("/topic/tables")
    public TableResponseDTO occuperTable(TableEntity table) {
        notificationService.notifierOccupationTable(table);
        return TableResponseDTO.from(table);
    }

    @MessageMapping("/tables/liberer")
    @SendTo("/topic/tables")
    public TableResponseDTO libererTable(TableEntity table) {
        notificationService.notifierLiberationTable(table);
        return TableResponseDTO.from(table);
    }
}
