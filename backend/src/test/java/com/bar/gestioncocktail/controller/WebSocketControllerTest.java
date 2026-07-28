package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.dto.TableResponseDTO;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class WebSocketControllerTest {

    @Mock
    NotificationService notificationService;

    @InjectMocks
    WebSocketController controller;

    private Commande commande;
    private TableEntity table;

    @BeforeEach
    void setUp() {
        table = new TableEntity();
        table.setId(1L);
        table.setNumero(10);

        commande = new Commande();
        commande.setId(50L);
        commande.setTable(table);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setItems(List.of());
    }

    @Test
    @DisplayName("nouvelleCommande - notifies and returns CommandeResponseDTO")
    void nouvelleCommande_notifiesAndReturnsDTO() {
        CommandeResponseDTO dto = controller.nouvelleCommande(commande);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(50L);
        verify(notificationService).notifierNouvelleCommande(commande);
    }

    @Test
    @DisplayName("statutCommande - notifies and returns CommandeResponseDTO")
    void statutCommande_notifiesAndReturnsDTO() {
        CommandeResponseDTO dto = controller.statutCommande(commande);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(50L);
        verify(notificationService).notifierStatutCommande(commande);
    }

    @Test
    @DisplayName("occuperTable - notifies and returns TableResponseDTO")
    void occuperTable_notifiesAndReturnsDTO() {
        TableResponseDTO dto = controller.occuperTable(table);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(1L);
        verify(notificationService).notifierOccupationTable(table);
    }

    @Test
    @DisplayName("libererTable - notifies and returns TableResponseDTO")
    void libererTable_notifiesAndReturnsDTO() {
        TableResponseDTO dto = controller.libererTable(table);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(1L);
        verify(notificationService).notifierLiberationTable(table);
    }
}
