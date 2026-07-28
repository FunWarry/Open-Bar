package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.CommandeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommandeControllerTest {

    @Mock
    CommandeService commandeService;

    @InjectMocks
    CommandeController commandeController;

    private Commande commande;

    @BeforeEach
    void setUp() {
        TableEntity table = new TableEntity();
        table.setId(1L);

        commande = new Commande();
        commande.setId(10L);
        commande.setTable(table);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setItems(new ArrayList<>());
    }

    @Test
    @DisplayName("createCommande - creates order and returns DTO")
    void createCommande_success() {
        CommandeRequestDTO request = new CommandeRequestDTO(1L, null, "Note", null);
        when(commandeService.createCommande(any(Commande.class))).thenReturn(commande);

        ResponseEntity<CommandeResponseDTO> response = commandeController.createCommande(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    @DisplayName("updateCommande - updates order and returns DTO")
    void updateCommande_success() {
        CommandeRequestDTO request = new CommandeRequestDTO(1L, null, "Updated", null);
        when(commandeService.updateCommande(eq(10L), any(Commande.class))).thenReturn(commande);

        ResponseEntity<CommandeResponseDTO> response = commandeController.updateCommande(10L, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("ajouterItem - adds item to order and returns DTO")
    void ajouterItem_success() {
        CommandeItemRequestDTO request = new CommandeItemRequestDTO(1L, null, 2, new BigDecimal("8.50"), null, false);
        when(commandeService.ajouterItem(eq(10L), any(CommandeItem.class))).thenReturn(commande);

        ResponseEntity<CommandeResponseDTO> response = commandeController.ajouterItem(10L, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }
}
