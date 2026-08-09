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

    public static class CommandeStatutNotification {
        private final Long commandeId;
        private final CommandeStatut ancienStatut;
        private final CommandeStatut nouveauStatut;

        public CommandeStatutNotification(Long commandeId, CommandeStatut ancienStatut, CommandeStatut nouveauStatut) {
            this.commandeId = commandeId;
            this.ancienStatut = ancienStatut;
            this.nouveauStatut = nouveauStatut;
        }

        public Long getCommandeId() {
            return commandeId;
        }

        public CommandeStatut getAncienStatut() {
            return ancienStatut;
        }

        public CommandeStatut getNouveauStatut() {
            return nouveauStatut;
        }
    }

    public static class StockAlerteNotification {
        private final Long ingredientId;
        private final String nomIngredient;
        private final double quantiteRestante;

        public StockAlerteNotification(Long ingredientId, String nomIngredient, double quantiteRestante) {
            this.ingredientId = ingredientId;
            this.nomIngredient = nomIngredient;
            this.quantiteRestante = quantiteRestante;
        }

        public Long getIngredientId() {
            return ingredientId;
        }

        public String getNomIngredient() {
            return nomIngredient;
        }

        public String getNom() {
            return getNomIngredient();
        }

        public double getQuantiteRestante() {
            return quantiteRestante;
        }

        public double getQuantiteActuelle() {
            return getQuantiteRestante();
        }
    }
}