package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    NotificationService notificationService;

    private Commande commande;
    private TableEntity table;

    @BeforeEach
    void setUp() {
        commande = new Commande();
        commande.setStatut(CommandeStatut.EN_ATTENTE);

        table = new TableEntity();
        table.setId(1L);
        table.setNumero(3);
        table.setCapacite(4);
        table.setZone(TableZone.INTERIEUR);
    }

    // ─── notifierNouvelleCommande ─────────────────────────────────────────────

    @Test
    void notifierNouvelleCommande_envoyeSurTopicCommandes() {
        notificationService.notifierNouvelleCommande(commande);

        verify(messagingTemplate).convertAndSend("/topic/commandes", commande);
    }

    @Test
    void notifierNouvelleCommande_passeLObjetCommandeIntact() {
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);

        notificationService.notifierNouvelleCommande(commande);

        verify(messagingTemplate).convertAndSend(anyString(), (Object) payloadCaptor.capture());
        assertThat(payloadCaptor.getValue()).isSameAs(commande);
    }

    // ─── notifierStatutCommande ───────────────────────────────────────────────

    @Test
    void notifierStatutCommande_envoyeSurTopicCommandeAvecId() {
        commande.setStatut(CommandeStatut.EN_PREPARATION);
        // Utilise la réflexion pour setter l'id (pas de setter public généré par Lombok)
        try {
            var idField = Commande.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(commande, 42L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        notificationService.notifierStatutCommande(commande);

        verify(messagingTemplate).convertAndSend("/topic/commandes/42", commande);
    }

    @Test
    void notifierStatutCommande_topicContientIdDeLaCommande() {
        try {
            var idField = Commande.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(commande, 7L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        ArgumentCaptor<String> topicCaptor = ArgumentCaptor.forClass(String.class);

        notificationService.notifierStatutCommande(commande);

        verify(messagingTemplate).convertAndSend(topicCaptor.capture(), eq(commande));
        assertThat(topicCaptor.getValue()).isEqualTo("/topic/commandes/7");
    }

    // ─── notifierOccupationTable ──────────────────────────────────────────────

    @Test
    void notifierOccupationTable_envoyeSurTopicTables() {
        notificationService.notifierOccupationTable(table);

        verify(messagingTemplate).convertAndSend("/topic/tables", table);
    }

    @Test
    void notifierOccupationTable_passeLaTableIntacte() {
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);

        notificationService.notifierOccupationTable(table);

        verify(messagingTemplate).convertAndSend(anyString(), (Object) payloadCaptor.capture());
        assertThat(payloadCaptor.getValue()).isSameAs(table);
    }

    // ─── notifierLiberationTable ──────────────────────────────────────────────

    @Test
    void notifierLiberationTable_envoyeSurTopicTables() {
        notificationService.notifierLiberationTable(table);

        verify(messagingTemplate).convertAndSend("/topic/tables", table);
    }

    @Test
    void notifierOccupationEtLiberationTable_utilisentLeMemeTopic() {
        notificationService.notifierOccupationTable(table);
        notificationService.notifierLiberationTable(table);

        // Les deux notifications utilisent /topic/tables
        verify(messagingTemplate, times(2)).convertAndSend("/topic/tables", table);
    }

    // ─── notifierStockFaible ──────────────────────────────────────────────────

    @Test
    void notifierStockFaible_envoyeSurTopicStockAlerte() {
        notificationService.notifierStockFaible(1L, "Rhum", 5.0);

        verify(messagingTemplate).convertAndSend(eq("/topic/stock/alerte"), any(Object.class));
    }

    @Test
    void notifierStockFaible_payloadContientLesDonneesIngredient() {
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);

        notificationService.notifierStockFaible(2L, "Citron", 3.5);

        verify(messagingTemplate).convertAndSend(anyString(), (Object) payloadCaptor.capture());
        Object payload = payloadCaptor.getValue();
        assertThat(payload).isNotNull();
        // Vérifie les données via la réflexion (classe interne privée StockAlerteNotification)
        try {
            var idGetter = payload.getClass().getDeclaredMethod("getIngredientId");
            idGetter.setAccessible(true);
            assertThat(idGetter.invoke(payload)).isEqualTo(2L);

            var nomGetter = payload.getClass().getDeclaredMethod("getNomIngredient");
            nomGetter.setAccessible(true);
            assertThat(nomGetter.invoke(payload)).isEqualTo("Citron");

            var qteGetter = payload.getClass().getDeclaredMethod("getQuantiteRestante");
            qteGetter.setAccessible(true);
            assertThat((Double) qteGetter.invoke(payload)).isEqualTo(3.5);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void notifierStockFaible_stockAZero_envoyeToutDeMeme() {
        notificationService.notifierStockFaible(3L, "Sucre", 0.0);

        verify(messagingTemplate).convertAndSend(eq("/topic/stock/alerte"), any(Object.class));
    }

    @Test
    void notifierStockFaible_stockNegatif_envoyeToutDeMeme() {
        // Le service ne filtre pas les valeurs négatives — il délègue à RabbitMQ/STOMP
        notificationService.notifierStockFaible(4L, "Glace", -2.0);

        verify(messagingTemplate).convertAndSend(eq("/topic/stock/alerte"), any(Object.class));
    }

    // ─── isolation : aucun appel parasite ────────────────────────────────────

    @Test
    void notifierNouvelleCommande_nAppelleQueConvertAndSend_uneFois() {
        notificationService.notifierNouvelleCommande(commande);

        // Exactement un seul appel, quel que soit le topic
        verify(messagingTemplate, times(1)).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void notifierLiberationTable_nAppelleQueConvertAndSend_uneFois() {
        notificationService.notifierLiberationTable(table);

        then(messagingTemplate).should(times(1)).convertAndSend(anyString(), any(Object.class));
    }
}
