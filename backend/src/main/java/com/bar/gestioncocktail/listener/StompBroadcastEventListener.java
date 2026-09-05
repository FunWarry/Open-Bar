package com.bar.gestioncocktail.listener;

import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.dto.PublicCommandeResponseDTO;
import com.bar.gestioncocktail.dto.TableResponseDTO;
import com.bar.gestioncocktail.event.InvoiceSettledEvent;
import com.bar.gestioncocktail.event.OrderCancelledEvent;
import com.bar.gestioncocktail.event.OrderCreatedEvent;
import com.bar.gestioncocktail.event.OrderStatusChangedEvent;
import com.bar.gestioncocktail.event.OrderUpdatedEvent;
import com.bar.gestioncocktail.event.StockAlertEvent;
import com.bar.gestioncocktail.event.TableDeletedEvent;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.event.TableUpdatedEvent;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.NotificationService.CommandeStatutNotification;
import com.bar.gestioncocktail.service.NotificationService.StockAlerteNotification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Asynchronous event listener that decouples domain services from STOMP WebSocket messaging.
 * Listens to Spring domain events and broadcasts updates to connected WebSocket subscribers.
 */
@Component
public class StompBroadcastEventListener {

    private static final Logger log = LoggerFactory.getLogger(StompBroadcastEventListener.class);

    private static final String TOPIC_COMMANDES = "/topic/commandes";
    private static final String TOPIC_COMMANDES_PREFIX = "/topic/commandes/";
    private static final String TOPIC_COMMANDES_STATUT = "/topic/commandes/statut";
    private static final String TOPIC_BARMAN_COMMANDES = "/topic/barman/commandes";
    private static final String TOPIC_TABLES = "/topic/tables";
    private static final String TOPIC_TABLES_DELETE = "/topic/tables/delete";
    private static final String TOPIC_TABLES_SUPPRIME = "/topic/tables/supprime";
    private static final String TOPIC_STOCK_ALERTE = "/topic/stock/alerte";

    private final SimpMessagingTemplate messagingTemplate;

    public StompBroadcastEventListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Broadcasts newly created order to bartender and server queues.
     *
     * @param event Order creation domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        if (event == null || event.commande() == null || messagingTemplate == null) {
            return;
        }
        try {
            Commande commande = event.commande();
            broadcastOrder(commande);

            if (commande.getTrackingToken() != null && !commande.getTrackingToken().isBlank()) {
                messagingTemplate.convertAndSend(TOPIC_COMMANDES_PREFIX + commande.getTrackingToken(),
                        PublicCommandeResponseDTO.from(commande, 10));
            }
        } catch (Exception ex) {
            log.warn("Failed to broadcast OrderCreatedEvent over WebSocket: {}", ex.getMessage());
        }
    }

    /**
     * Broadcasts order status changes to tracking topics and status listeners.
     *
     * @param event Order status changed domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void handleOrderStatusChanged(OrderStatusChangedEvent event) {
        if (event == null || messagingTemplate == null) {
            return;
        }
        try {
            if (event.commande() != null) {
                CommandeResponseDTO dto = CommandeResponseDTO.from(event.commande());
                messagingTemplate.convertAndSend(TOPIC_COMMANDES, dto);
                messagingTemplate.convertAndSend(TOPIC_BARMAN_COMMANDES, dto);
                messagingTemplate.convertAndSend(TOPIC_COMMANDES_PREFIX + event.commandeId(), dto);
            }
            messagingTemplate.convertAndSend(TOPIC_COMMANDES_STATUT,
                    new CommandeStatutNotification(event.commandeId(), event.oldStatut(), event.newStatut()));
        } catch (Exception ex) {
            log.warn("Failed to broadcast OrderStatusChangedEvent over WebSocket: {}", ex.getMessage());
        }
    }

    /**
     * Broadcasts modified order updates to connected channels.
     *
     * @param event Order updated domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void handleOrderUpdated(OrderUpdatedEvent event) {
        if (event == null || event.commande() == null || messagingTemplate == null) {
            return;
        }
        try {
            broadcastOrder(event.commande());
        } catch (Exception ex) {
            log.warn("Failed to broadcast OrderUpdatedEvent over WebSocket: {}", ex.getMessage());
        }
    }

    /**
     * Broadcasts order cancellation event.
     *
     * @param event Order cancelled domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void handleOrderCancelled(OrderCancelledEvent event) {
        if (event == null || event.commande() == null || messagingTemplate == null) {
            return;
        }
        try {
            broadcastOrder(event.commande());
        } catch (Exception ex) {
            log.warn("Failed to broadcast OrderCancelledEvent over WebSocket: {}", ex.getMessage());
        }
    }

    /**
     * Broadcasts table updates (status, position, assignment) to floor plan subscribers.
     *
     * @param event Table updated domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void handleTableUpdated(TableUpdatedEvent event) {
        if (event == null || event.table() == null || messagingTemplate == null) {
            return;
        }
        try {
            broadcastTable(event.table());
        } catch (Exception ex) {
            log.warn("Failed to broadcast TableUpdatedEvent over WebSocket: {}", ex.getMessage());
        }
    }

    /**
     * Broadcasts table liberation to floor plan subscribers.
     *
     * @param event Table liberated domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void handleTableLiberated(TableLiberatedEvent event) {
        if (event == null || event.table() == null || messagingTemplate == null) {
            return;
        }
        try {
            broadcastTable(event.table());
        } catch (Exception ex) {
            log.warn("Failed to broadcast TableLiberatedEvent over WebSocket: {}", ex.getMessage());
        }
    }

    /**
     * Broadcasts table deletion to floor plan subscribers.
     *
     * @param event Table deleted domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void handleTableDeleted(TableDeletedEvent event) {
        if (event == null || event.tableId() == null || messagingTemplate == null) {
            return;
        }
        try {
            messagingTemplate.convertAndSend(TOPIC_TABLES_DELETE, event.tableId());
            messagingTemplate.convertAndSend(TOPIC_TABLES_SUPPRIME, event.tableId());
        } catch (Exception ex) {
            log.warn("Failed to broadcast TableDeletedEvent over WebSocket: {}", ex.getMessage());
        }
    }

    /**
     * Broadcasts low inventory warnings to manager and bartender dashboards.
     *
     * @param event Stock alert domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void handleStockAlert(StockAlertEvent event) {
        if (event == null || messagingTemplate == null) {
            return;
        }
        try {
            messagingTemplate.convertAndSend(TOPIC_STOCK_ALERTE,
                    new StockAlerteNotification(event.ingredientId(), event.nomIngredient(), event.quantiteRestante()));
        } catch (Exception ex) {
            log.warn("Failed to broadcast StockAlertEvent over WebSocket: {}", ex.getMessage());
        }
    }

    /**
     * Broadcasts invoice settlement outcomes to floor plan and order tracking.
     *
     * @param event Invoice settled domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void handleInvoiceSettled(InvoiceSettledEvent event) {
        if (event == null || messagingTemplate == null) {
            return;
        }
        try {
            if (event.tableLiberated() && event.table() != null) {
                broadcastTable(event.table());
            }
            if (event.settledOrders() != null) {
                for (Commande cmd : event.settledOrders()) {
                    CommandeResponseDTO dto = CommandeResponseDTO.from(cmd);
                    messagingTemplate.convertAndSend(TOPIC_COMMANDES_STATUT, dto);
                    messagingTemplate.convertAndSend(TOPIC_COMMANDES_PREFIX + cmd.getId(), dto);
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to broadcast InvoiceSettledEvent over WebSocket: {}", ex.getMessage());
        }
    }

    private void broadcastOrder(Commande commande) {
        CommandeResponseDTO dto = CommandeResponseDTO.from(commande);
        messagingTemplate.convertAndSend(TOPIC_COMMANDES, dto);
        messagingTemplate.convertAndSend(TOPIC_COMMANDES_STATUT, dto);
        messagingTemplate.convertAndSend(TOPIC_BARMAN_COMMANDES, dto);
    }

    private void broadcastTable(TableEntity table) {
        messagingTemplate.convertAndSend(TOPIC_TABLES, TableResponseDTO.from(table));
    }
}
