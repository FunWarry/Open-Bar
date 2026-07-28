package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
    private static final String TOPIC_TABLES = "/topic/tables";
    private static final String TOPIC_STOCK_ALERTE = "/topic/stock/alerte";

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifierNouvelleCommande(Commande commande) {
        messagingTemplate.convertAndSend("/topic/commandes", commande);
    }

    public void notifierStatutCommande(Commande commande) {
        messagingTemplate.convertAndSend("/topic/commandes/" + commande.getId(), commande);
    }

    public void notifierOccupationTable(TableEntity table) {
        messagingTemplate.convertAndSend(TOPIC_TABLES, table);
    }

    public void notifierLiberationTable(TableEntity table) {
        messagingTemplate.convertAndSend(TOPIC_TABLES, table);
    }

    public void notifierStockFaible(Long ingredientId, String nomIngredient, double quantiteRestante) {
        messagingTemplate.convertAndSend(
            TOPIC_STOCK_ALERTE,
            new StockAlerteNotification(ingredientId, nomIngredient, quantiteRestante)
        );
    }

    public void notifierBarmanCommandes(Object payload) {
        messagingTemplate.convertAndSend("/topic/barman/commandes", payload);
    }

    public void notifierTrackingClient(String trackingToken, Object payload) {
        messagingTemplate.convertAndSend("/topic/commandes/" + trackingToken, payload);
    }

    public void notifierChangementTable(TableEntity table) {
        messagingTemplate.convertAndSend(TOPIC_TABLES, table);
    }

    public void notifierChangementStatutCommande(Long commandeId, CommandeStatut ancienStatut, CommandeStatut nouveauStatut) {
        messagingTemplate.convertAndSend(
            "/topic/commandes/statut",
            new CommandeStatutNotification(commandeId, ancienStatut, nouveauStatut)
        );
    }

    public void notifierAlerteStockEvent(Object payload) {
        messagingTemplate.convertAndSend(TOPIC_STOCK_ALERTE, payload);
    }

    public record CommandeStatutNotification(Long commandeId, CommandeStatut ancienStatut, CommandeStatut nouveauStatut) {}

    public record StockAlerteNotification(Long ingredientId, String nomIngredient, double quantiteRestante) {}
}