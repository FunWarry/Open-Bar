package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
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
        messagingTemplate.convertAndSend("/topic/tables", table);
    }

    public void notifierLiberationTable(TableEntity table) {
        messagingTemplate.convertAndSend("/topic/tables", table);
    }

    public void notifierStockFaible(Long ingredientId, String nomIngredient, double quantiteRestante) {
        messagingTemplate.convertAndSend(
            "/topic/stock/alerte",
            new StockAlerteNotification(ingredientId, nomIngredient, quantiteRestante)
        );
    }

    private static class CommandeStatutNotification {
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

    private static class StockAlerteNotification {
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

        public double getQuantiteRestante() {
            return quantiteRestante;
        }
    }
} 