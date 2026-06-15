package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class WebSocketController {

    @Autowired
    private NotificationService notificationService;

    @MessageMapping("/commandes/nouvelle")
    @SendTo("/topic/commandes")
    public Commande nouvelleCommande(Commande commande) {
        notificationService.notifierNouvelleCommande(commande);
        return commande;
    }

    @MessageMapping("/commandes/statut")
    @SendTo("/topic/commandes/{commandeId}")
    public Commande statutCommande(Commande commande) {
        notificationService.notifierStatutCommande(commande);
        return commande;
    }

    @MessageMapping("/tables/occuper")
    @SendTo("/topic/tables")
    public TableEntity occuperTable(TableEntity table) {
        notificationService.notifierOccupationTable(table);
        return table;
    }

    @MessageMapping("/tables/liberer")
    @SendTo("/topic/tables")
    public TableEntity libererTable(TableEntity table) {
        notificationService.notifierLiberationTable(table);
        return table;
    }
} 