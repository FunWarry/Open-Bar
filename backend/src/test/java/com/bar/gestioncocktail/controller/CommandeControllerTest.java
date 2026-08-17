package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommandeControllerTest {

    @Mock
    private CommandeService commandeService;

    @InjectMocks
    private CommandeController commandeController;

    private Commande commande;

    @BeforeEach
    void setUp() {
        TableEntity table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);

        commande = new Commande();
        commande.setId(10L);
        commande.setTable(table);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setItems(new ArrayList<>());
    }

    @Test
    @DisplayName("getAllCommandes - returns all orders")
    void getAllCommandes_returnsList() {
        when(commandeService.getAllCommandes()).thenReturn(List.of(commande));

        ResponseEntity<List<CommandeResponseDTO>> response = commandeController.getAllCommandes();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("createCommande and updateCommande - mutations")
    void mutations() {
        CommandeRequestDTO request = new CommandeRequestDTO(1L, null, "Note", null);
        when(commandeService.createCommande(any(Commande.class))).thenReturn(commande);
        when(commandeService.updateCommande(eq(10L), any(Commande.class))).thenReturn(commande);

        ResponseEntity<CommandeResponseDTO> createResp = commandeController.createCommande(request);
        ResponseEntity<CommandeResponseDTO> updateResp = commandeController.updateCommande(10L, request);

        assertThat(createResp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(updateResp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("deleteCommande - deletes order")
    void deleteCommande_success() {
        ResponseEntity<Void> response = commandeController.deleteCommande(10L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(commandeService).deleteCommande(10L);
    }

    @Test
    @DisplayName("getCommandeById - returns order if found, 404 otherwise")
    void getCommandeById_foundAndNotFound() {
        when(commandeService.getCommandeById(10L)).thenReturn(Optional.of(commande));
        when(commandeService.getCommandeById(99L)).thenReturn(Optional.empty());

        ResponseEntity<CommandeResponseDTO> found = commandeController.getCommandeById(10L);
        ResponseEntity<CommandeResponseDTO> notFound = commandeController.getCommandeById(99L);

        assertThat(found.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(notFound.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("getCommandesByTable, getCommandesByServeur, getCommandesByStatut, getCommandesByTableAndStatut, getCommandesByDate")
    void queries() {
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now().plusDays(1);

        when(commandeService.getCommandesByTable(any(TableEntity.class))).thenReturn(List.of(commande));
        when(commandeService.getCommandesByServeur(any(User.class))).thenReturn(List.of(commande));
        when(commandeService.getCommandesByStatut(CommandeStatut.EN_ATTENTE)).thenReturn(List.of(commande));
        when(commandeService.getCommandesByTableAndStatut(any(TableEntity.class), eq(CommandeStatut.EN_ATTENTE))).thenReturn(List.of(commande));
        when(commandeService.getCommandesByDate(start, end)).thenReturn(List.of(commande));

        assertThat(commandeController.getCommandesByTable(1L).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(commandeController.getCommandesByServeur(2L).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(commandeController.getCommandesByStatut(CommandeStatut.EN_ATTENTE).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(commandeController.getCommandesByTableAndStatut(1L, CommandeStatut.EN_ATTENTE).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(commandeController.getCommandesByDate(start, end).getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("ajouterItem and retirerItem")
    void itemModifications() {
        CommandeItemRequestDTO itemReq = new CommandeItemRequestDTO(1L, null, 2, new BigDecimal("8.50"), "Note", false);
        when(commandeService.ajouterItem(eq(10L), any(CommandeItem.class))).thenReturn(commande);
        when(commandeService.retirerItem(10L, 1L)).thenReturn(commande);

        ResponseEntity<CommandeResponseDTO> addResp = commandeController.ajouterItem(10L, itemReq);
        ResponseEntity<CommandeResponseDTO> removeResp = commandeController.retirerItem(10L, 1L);

        assertThat(addResp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(removeResp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("changerStatut - updates order status with query param or body")
    void changerStatut_cases() {
        when(commandeService.changerStatut(10L, CommandeStatut.EN_PREPARATION)).thenReturn(commande);

        ResponseEntity<CommandeResponseDTO> respParam = commandeController.changerStatut(10L, null, CommandeStatut.EN_PREPARATION);
        ResponseEntity<CommandeResponseDTO> respBody = commandeController.changerStatut(10L, Map.of("statut", "EN_PREPARATION"), null);

        assertThat(respParam.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(respBody.getStatusCode().is2xxSuccessful()).isTrue();

        assertThatThrownBy(() -> commandeController.changerStatut(10L, null, null))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("annulerCommande - cancels order if found, 404 otherwise")
    void annulerCommande_foundAndNotFound() {
        when(commandeService.getCommandeById(10L)).thenReturn(Optional.of(commande));
        when(commandeService.getCommandeById(99L)).thenReturn(Optional.empty());

        ResponseEntity<CommandeResponseDTO> found = commandeController.annulerCommande(10L);
        ResponseEntity<CommandeResponseDTO> notFound = commandeController.annulerCommande(99L);

        assertThat(found.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(notFound.getStatusCode().value()).isEqualTo(404);
        verify(commandeService).annulerCommande(commande);
    }

    @Test
    @DisplayName("definirPriorite - sets priority flag on order item")
    void definirPriorite_success() {
        ResponseEntity<Void> response = commandeController.definirPriorite(100L, true);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(commandeService).definirPriorite(any(CommandeItem.class), eq(true));
    }

    @Test
    @DisplayName("transfererCommande - transfers order to another table")
    void transfererCommande_success() {
        when(commandeService.transfererCommande(10L, 2L)).thenReturn(commande);

        ResponseEntity<CommandeResponseDTO> response = commandeController.transfererCommande(10L, 2L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(commandeService).transfererCommande(10L, 2L);
    }

    @Test
    @DisplayName("modifierCommande - modifies active order items and details")
    void modifierCommande_success() {
        var itemDto = new com.bar.gestioncocktail.dto.ModifierCommandeItemDTO(null, 1L, null, 2, "Moins sucré", false);
        var request = new com.bar.gestioncocktail.dto.ModifierCommandeRequestDTO(List.of(itemDto), "Urgent", new BigDecimal("2.00"));
        when(commandeService.modifierCommande(eq(10L), any())).thenReturn(commande);

        ResponseEntity<CommandeResponseDTO> response = commandeController.modifierCommande(10L, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(commandeService).modifierCommande(10L, request);
    }
}
