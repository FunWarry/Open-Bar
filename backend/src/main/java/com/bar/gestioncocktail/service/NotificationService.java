package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Service managing real-time WebSocket STOMP notification dispatching.
 * <p>
 * Broadcasts events across topics for tables, orders, stock alerts, cocktails,
 * app settings, and patron table assistance calls.
 */
@Service
public class NotificationService {
    private static final String TOPIC_TABLES = "/topic/tables";
    private static final String TOPIC_STOCK_ALERTE = "/topic/stock/alerte";
    private static final String TOPIC_COCKTAILS = "/topic/cocktails";
    private static final String TOPIC_COCKTAILS_SUPPRIME = "/topic/cocktails/supprime";
    private static final String TOPIC_SERVEUR_APPELS = "/topic/serveur/appels";
    private static final String TOPIC_SERVEUR_APPELS_ACQUITTE = "/topic/serveur/appels/acquitte";

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Constructs NotificationService with the STOMP messaging template.
     *
     * @param messagingTemplate STOMP messaging template
     */
    @Autowired
    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Broadcasts updated or newly created cocktail over WebSocket topic /topic/cocktails.
     *
     * @param cocktail Updated cocktail entity
     */
    public void notifierCocktailMisAJour(Cocktail cocktail) {
        messagingTemplate.convertAndSend(TOPIC_COCKTAILS, CocktailResponseDTO.from(cocktail));
    }

    /**
     * Broadcasts deleted cocktail ID over WebSocket topic /topic/cocktails/supprime.
     *
     * @param cocktailId Deleted cocktail identifier
     */
    public void notifierCocktailSupprime(Long cocktailId) {
        messagingTemplate.convertAndSend(TOPIC_COCKTAILS_SUPPRIME, (Object) Map.of("id", cocktailId, "deleted", true));
    }

    /**
     * Broadcasts a new order creation event over /topic/commandes.
     *
     * @param commande Newly created order
     */
    public void notifierNouvelleCommande(Commande commande) {
        messagingTemplate.convertAndSend("/topic/commandes", commande);
    }

    /**
     * Broadcasts order status update to a specific order topic.
     *
     * @param commande Updated order entity
     */
    public void notifierStatutCommande(Commande commande) {
        messagingTemplate.convertAndSend("/topic/commandes/" + commande.getId(), commande);
    }

    /**
     * Broadcasts table occupancy update over /topic/tables.
     *
     * @param table Occupied table entity
     */
    public void notifierOccupationTable(TableEntity table) {
        messagingTemplate.convertAndSend(TOPIC_TABLES, table);
    }

    /**
     * Broadcasts table liberation update over /topic/tables.
     *
     * @param table Liberated table entity
     */
    public void notifierLiberationTable(TableEntity table) {
        messagingTemplate.convertAndSend(TOPIC_TABLES, table);
    }

    /**
     * Broadcasts a low-stock alert over /topic/stock/alerte.
     *
     * @param ingredientId     Identifier of the depleted ingredient
     * @param nomIngredient    Name of the depleted ingredient
     * @param quantiteRestante Remaining stock quantity
     */
    public void notifierStockFaible(Long ingredientId, String nomIngredient, double quantiteRestante) {
        messagingTemplate.convertAndSend(
            TOPIC_STOCK_ALERTE,
            new StockAlerteNotification(ingredientId, nomIngredient, quantiteRestante)
        );
    }

    /**
     * Broadcasts bartender workstation order stream updates.
     *
     * @param payload Bartender orders payload
     */
    public void notifierBarmanCommandes(Object payload) {
        messagingTemplate.convertAndSend("/topic/barman/commandes", payload);
    }

    /**
     * Broadcasts client live order tracking update via ephemeral token topic.
     *
     * @param trackingToken Customer tracking token
     * @param payload       Tracking event payload
     */
    public void notifierTrackingClient(String trackingToken, Object payload) {
        messagingTemplate.convertAndSend("/topic/commandes/" + trackingToken, payload);
    }

    /**
     * Broadcasts table state or floor plan update over /topic/tables.
     *
     * @param table Modified table entity
     */
    public void notifierChangementTable(TableEntity table) {
        messagingTemplate.convertAndSend(TOPIC_TABLES, table);
    }

    /**
     * Broadcasts an order status transition notification.
     *
     * @param commandeId    Order identifier
     * @param ancienStatut  Previous status
     * @param nouveauStatut New status
     */
    public void notifierChangementStatutCommande(Long commandeId, CommandeStatut ancienStatut, CommandeStatut nouveauStatut) {
        messagingTemplate.convertAndSend(
            "/topic/commandes/statut",
            new CommandeStatutNotification(commandeId, ancienStatut, nouveauStatut)
        );
    }

    /**
     * Broadcasts a generic stock alert event payload over /topic/stock/alerte.
     *
     * @param payload Stock alert payload
     */
    public void notifierAlerteStockEvent(Object payload) {
        messagingTemplate.convertAndSend(TOPIC_STOCK_ALERTE, payload);
    }

    /**
     * Broadcasts updated application settings over STOMP WebSocket topics.
     *
     * @param settings Updated application settings DTO or payload
     */
    public void notifierParametresMisAJour(Object settings) {
        messagingTemplate.convertAndSend("/topic/app-settings", settings);
        messagingTemplate.convertAndSend("/topic/settings", settings);
    }

    /**
     * Broadcasts a new table call alert to servers and table listeners.
     *
     * @param payload Table call alert payload
     */
    public void notifierNouvelAppel(Object payload) {
        messagingTemplate.convertAndSend(TOPIC_SERVEUR_APPELS, payload);
        messagingTemplate.convertAndSend(TOPIC_TABLES, payload);
    }

    /**
     * Broadcasts table call alert acknowledgement / dismissal.
     *
     * @param payload Table call alert payload
     */
    public void notifierAppelAcquitte(Object payload) {
        messagingTemplate.convertAndSend(TOPIC_SERVEUR_APPELS, payload);
        messagingTemplate.convertAndSend(TOPIC_SERVEUR_APPELS_ACQUITTE, payload);
    }

    /**
     * Payload DTO for order status transition WebSocket events.
     */
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

    /**
     * Payload DTO for ingredient low stock alerts.
     */
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