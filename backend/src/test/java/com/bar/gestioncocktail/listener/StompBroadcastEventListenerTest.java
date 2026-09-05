package com.bar.gestioncocktail.listener;

import com.bar.gestioncocktail.dto.CommandeResponseDTO;
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
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.TableEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class StompBroadcastEventListenerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private StompBroadcastEventListener listener;

    private Commande commande;
    private TableEntity table;

    @BeforeEach
    void setUp() {
        table = new TableEntity();
        table.setId(10L);
        table.setNumero(5);

        commande = new Commande();
        commande.setId(100L);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setTable(table);
        commande.setTotal(new BigDecimal("25.00"));
        commande.setTrackingToken("test-track-token");
    }

    @Test
    @DisplayName("handleOrderCreated - broadcasts to /topic/commandes, /topic/commandes/statut, /topic/barman/commandes and tracking token")
    void handleOrderCreated_broadcastsAllTopics() {
        OrderCreatedEvent event = new OrderCreatedEvent(commande);

        listener.handleOrderCreated(event);

        verify(messagingTemplate).convertAndSend(eq("/topic/commandes"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/commandes/statut"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/barman/commandes"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/commandes/test-track-token"), (Object) any(com.bar.gestioncocktail.dto.PublicCommandeResponseDTO.class));
    }

    @Test
    @DisplayName("handleOrderCreated - handles null event or null commande safely")
    void handleOrderCreated_nullSafe() {
        listener.handleOrderCreated(null);
        listener.handleOrderCreated(new OrderCreatedEvent(null));

        verifyNoInteractions(messagingTemplate);
    }

    @Test
    @DisplayName("handleOrderStatusChanged - broadcasts updated status and notification")
    void handleOrderStatusChanged_broadcastsStatusChange() {
        OrderStatusChangedEvent event = new OrderStatusChangedEvent(
                100L, CommandeStatut.EN_ATTENTE, CommandeStatut.EN_PREPARATION, commande);

        listener.handleOrderStatusChanged(event);

        verify(messagingTemplate).convertAndSend(eq("/topic/commandes"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/barman/commandes"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/commandes/100"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/commandes/statut"), (Object) any(com.bar.gestioncocktail.service.NotificationService.CommandeStatutNotification.class));
    }

    @Test
    @DisplayName("handleOrderUpdated - broadcasts modified order")
    void handleOrderUpdated_broadcastsUpdate() {
        OrderUpdatedEvent event = new OrderUpdatedEvent(commande);

        listener.handleOrderUpdated(event);

        verify(messagingTemplate).convertAndSend(eq("/topic/commandes"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/commandes/statut"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/barman/commandes"), any(CommandeResponseDTO.class));
    }

    @Test
    @DisplayName("handleOrderCancelled - broadcasts order cancellation")
    void handleOrderCancelled_broadcastsCancellation() {
        commande.setStatut(CommandeStatut.ANNULEE);
        OrderCancelledEvent event = new OrderCancelledEvent(commande);

        listener.handleOrderCancelled(event);

        verify(messagingTemplate).convertAndSend(eq("/topic/commandes"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/commandes/statut"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/barman/commandes"), any(CommandeResponseDTO.class));
    }

    @Test
    @DisplayName("handleTableUpdated - broadcasts updated table to /topic/tables")
    void handleTableUpdated_broadcastsTable() {
        TableUpdatedEvent event = new TableUpdatedEvent(table);

        listener.handleTableUpdated(event);

        verify(messagingTemplate).convertAndSend(eq("/topic/tables"), any(TableResponseDTO.class));
    }

    @Test
    @DisplayName("handleTableLiberated - broadcasts liberated table to /topic/tables")
    void handleTableLiberated_broadcastsTable() {
        TableLiberatedEvent event = new TableLiberatedEvent(table);

        listener.handleTableLiberated(event);

        verify(messagingTemplate).convertAndSend(eq("/topic/tables"), any(TableResponseDTO.class));
    }

    @Test
    @DisplayName("handleTableDeleted - broadcasts deletion to both /topic/tables/delete and /topic/tables/supprime")
    void handleTableDeleted_broadcastsDeletion() {
        TableDeletedEvent event = new TableDeletedEvent(10L);

        listener.handleTableDeleted(event);

        verify(messagingTemplate).convertAndSend("/topic/tables/delete", (Object) 10L);
        verify(messagingTemplate).convertAndSend("/topic/tables/supprime", (Object) 10L);
    }

    @Test
    @DisplayName("handleStockAlert - broadcasts low stock alert to /topic/stock/alerte")
    void handleStockAlert_broadcastsAlert() {
        StockAlertEvent event = new StockAlertEvent(1L, "Gin", 4.5);

        listener.handleStockAlert(event);

        verify(messagingTemplate).convertAndSend(eq("/topic/stock/alerte"), (Object) any(com.bar.gestioncocktail.service.NotificationService.StockAlerteNotification.class));
    }

    @Test
    @DisplayName("handleInvoiceSettled - broadcasts table update and settled order updates")
    void handleInvoiceSettled_broadcastsSettlement() {
        Facture facture = new Facture();
        facture.setId(1L);
        InvoiceSettledEvent event = new InvoiceSettledEvent(facture, table, List.of(commande), true);

        listener.handleInvoiceSettled(event);

        verify(messagingTemplate).convertAndSend(eq("/topic/tables"), any(TableResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/commandes/statut"), any(CommandeResponseDTO.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/commandes/100"), any(CommandeResponseDTO.class));
    }

    @Test
    @DisplayName("handleOrderCreated - safely catches exceptions without propagating")
    void handleOrderCreated_catchesExceptionSafely() {
        doThrow(new RuntimeException("STOMP connection failed"))
                .when(messagingTemplate).convertAndSend(anyString(), any(Object.class));

        OrderCreatedEvent event = new OrderCreatedEvent(commande);

        org.junit.jupiter.api.Assertions.assertDoesNotThrow(() -> listener.handleOrderCreated(event));
    }
}
