package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.StockAlerteEvent;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CommandeItemRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommandeServiceTest {

    @Mock CommandeRepository commandeRepository;
    @Mock CommandeItemRepository commandeItemRepository;
    @Mock IngredientRepository ingredientRepository;
    @Mock CocktailRepository cocktailRepository;
    @Mock CocktailIngredientRepository cocktailIngredientRepository;
    @Mock TableRepository tableRepository;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Spy TimeService timeService = new TimeService(null);

    @InjectMocks CommandeService commandeService;

    private Ingredient ingredient;
    private CocktailIngredient cocktailIngredient;
    private CommandeItem item;
    private Commande commande;

    @BeforeEach
    void setUp() {
        ingredient = new Ingredient();
        ingredient.setId(1L);
        ingredient.setNom("Rhum");
        ingredient.setUniteMesure("cl");
        ingredient.setQuantiteStock(new BigDecimal("100.00"));
        ingredient.setSeuilAlerte(new BigDecimal("20.00"));

        Cocktail cocktail = new Cocktail();
        cocktail.setId(1L);

        cocktailIngredient = new CocktailIngredient();
        cocktailIngredient.setIngredient(ingredient);
        cocktailIngredient.setQuantite(new BigDecimal("4.00")); // 4 cl per cocktail
        cocktail.setIngredients(List.of(cocktailIngredient));

        item = new CommandeItem();
        item.setId(1L);
        item.setCocktail(cocktail);
        item.setQuantite(2); // 2 ordered cocktails

        commande = new Commande();
        commande.setId(1L);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setItems(new ArrayList<>(List.of(item)));

        lenient().when(commandeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // ─── changerStatut — transitions de base ──────────────────────────────────

    @Test
    void changerStatut_enPreparation_setsDatePreparation() {
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        Commande result = commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        assertThat(result.getStatut()).isEqualTo(CommandeStatut.EN_PREPARATION);
        assertThat(result.getDatePreparation()).isNotNull();
    }

    @Test
    void changerStatut_livree_setsDateLivraison() {
        commande.setStatut(CommandeStatut.PRET);
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        Commande result = commandeService.changerStatut(1L, CommandeStatut.LIVREE);

        assertThat(result.getStatut()).isEqualTo(CommandeStatut.LIVREE);
        assertThat(result.getDateLivraison()).isNotNull();
    }

    @Test
    void changerStatut_reglee_setsDateReglement() {
        commande.setStatut(CommandeStatut.LIVREE);
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        Commande result = commandeService.changerStatut(1L, CommandeStatut.REGLEE);

        assertThat(result.getStatut()).isEqualTo(CommandeStatut.REGLEE);
        assertThat(result.getDateReglement()).isNotNull();
    }

    @Test
    void changerStatut_enPreparation_destockeIngredients() {
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        ArgumentCaptor<Ingredient> captor = ArgumentCaptor.forClass(Ingredient.class);
        verify(ingredientRepository).save(captor.capture());
        // 100 - (4 cl * 2) = 92
        assertThat(captor.getValue().getQuantiteStock()).isEqualByComparingTo(new BigDecimal("92.00"));
    }

    @Test
    void changerStatut_enPreparation_declencheAlerteStockSiSousSeuil() {
        ingredient.setQuantiteStock(new BigDecimal("25.00")); // will drop to 17 <= 20
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        verify(messagingTemplate).convertAndSend(eq("/topic/stock/alerte"), any(StockAlerteEvent.class));
    }

    @Test
    void changerStatut_enPreparation_pasDAlerteSiAuDessusDuSeuil() {
        ingredient.setQuantiteStock(new BigDecimal("100.00")); // will drop to 92 > 20
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        verify(messagingTemplate, never()).convertAndSend(anyString(), any(StockAlerteEvent.class));
    }

    @Test
    void changerStatut_dejaEnPreparation_neDestockePasUneDeuxiemeFois() {
        commande.setStatut(CommandeStatut.EN_PREPARATION);
        commande.setDatePreparation(LocalDateTime.now());
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.PRET);

        verify(ingredientRepository, never()).save(any());
    }

    @Test
    void destockage_seuilAlerteNull_nePasNPE() {
        ingredient.setSeuilAlerte(null);
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
            () -> commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION)
        );
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(StockAlerteEvent.class));
    }

    @Test
    void destockage_messagingTemplateException_handledSafely() {
        ingredient.setQuantiteStock(new BigDecimal("25.00"));
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));
        doThrow(new RuntimeException("WebSocket down")).when(messagingTemplate).convertAndSend(anyString(), any(StockAlerteEvent.class));

        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
            () -> commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION)
        );
    }

    @Test
    void destockerIngredients_cocktailIngredientRepoThrowsException_fallsBackGracefully() {
        when(cocktailIngredientRepository.findByCocktail(any())).thenThrow(new RuntimeException("DB down"));
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
                () -> commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION)
        );
        verify(ingredientRepository).save(any(Ingredient.class));
    }

    @Test
    void destockerIngredients_itemCocktailNull_skipsSafely() {
        CommandeItem nullCocktailItem = new CommandeItem();
        nullCocktailItem.setId(99L);
        nullCocktailItem.setCocktail(null);
        commande.getItems().add(nullCocktailItem);

        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
                () -> commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION)
        );
    }

    // ─── Stock replenishment on cancellation & variants ───────────────────────

    @Test
    void annulerCommande_apresPreparation_reincrementeStockIngredients() {
        commande.setStatut(CommandeStatut.EN_PREPARATION);
        commande.setDatePreparation(LocalDateTime.now());

        commandeService.annulerCommande(commande);

        assertThat(commande.getStatut()).isEqualTo(CommandeStatut.ANNULEE);
        ArgumentCaptor<Ingredient> captor = ArgumentCaptor.forClass(Ingredient.class);
        verify(ingredientRepository).save(captor.capture());
        // 100 + (4 cl * 2) = 108
        assertThat(captor.getValue().getQuantiteStock()).isEqualByComparingTo(new BigDecimal("108.00"));
    }

    @Test
    void annulerCommande_sansItems_skipsSafely() {
        commande.setStatut(CommandeStatut.EN_PREPARATION);
        commande.setDatePreparation(LocalDateTime.now());
        commande.setItems(null);

        commandeService.annulerCommande(commande);

        assertThat(commande.getStatut()).isEqualTo(CommandeStatut.ANNULEE);
    }

    @Test
    void destockerIngredients_avecVarianteMultiplicateur_destockeEnFonctionDuMultiplicateur() {
        CocktailVariante variante = new CocktailVariante();
        variante.setMultiplicateurIngredient(new BigDecimal("1.5")); // Format XL 1.5x
        item.setVariante(variante);

        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        // 4 cl * 2 qty * 1.5 mult = 12 cl consumed -> 100 - 12 = 88
        ArgumentCaptor<Ingredient> captor = ArgumentCaptor.forClass(Ingredient.class);
        verify(ingredientRepository).save(captor.capture());
        assertThat(captor.getValue().getQuantiteStock()).isEqualByComparingTo(new BigDecimal("88.00"));
    }

    @Test
    void destockerIngredients_withCocktailIngredientRepository_success() {
        when(cocktailIngredientRepository.findByCocktail(any())).thenReturn(List.of(cocktailIngredient));
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        verify(ingredientRepository).save(any(Ingredient.class));
    }

    @Test
    void transfererCommande_nominal_modifieTableEtBroadcastEvent() {
        TableEntity targetTable = new TableEntity();
        targetTable.setId(2L);
        targetTable.setNumero(5);

        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));
        when(tableRepository.findById(2L)).thenReturn(Optional.of(targetTable));
        when(commandeRepository.save(any(Commande.class))).thenAnswer(inv -> inv.getArgument(0));

        Commande result = commandeService.transfererCommande(1L, 2L);

        assertThat(result.getTable().getId()).isEqualTo(2L);
        verify(messagingTemplate, times(2)).convertAndSend(anyString(), any(Commande.class));
    }

    @Test
    void transfererCommande_tableNonTrouvee_lanceException() {
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));
        when(tableRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commandeService.transfererCommande(1L, 99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Table not found with id: 99");
    }

    // ─── CRUD & Item methods ──────────────────────────────────────────────────

    @Test
    @DisplayName("updateCommande - updates table, serveur, and notes")
    void updateCommande_success() {
        TableEntity newTable = new TableEntity();
        newTable.setId(2L);
        User newServeur = new User();
        newServeur.setId(3L);

        Commande updates = new Commande();
        updates.setTable(newTable);
        updates.setServeur(newServeur);
        updates.setNotes("VIP");

        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        Commande updated = commandeService.updateCommande(1L, updates);

        assertThat(updated.getTable()).isEqualTo(newTable);
        assertThat(updated.getServeur()).isEqualTo(newServeur);
        assertThat(updated.getNotes()).isEqualTo("VIP");
    }

    @Test
    @DisplayName("deleteCommande - deletes existing order")
    void deleteCommande_success() {
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.deleteCommande(1L);

        verify(commandeRepository).delete(commande);
    }

    @Test
    @DisplayName("deleteCommande - throws ResourceNotFoundException when not found")
    void deleteCommande_notFound_throwsException() {
        when(commandeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commandeService.deleteCommande(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("ajouterItem - associates cocktail and recomputes total")
    void ajouterItem_success() {
        Cocktail mockCocktail = new Cocktail();
        mockCocktail.setId(1L);

        CommandeItem newItem = new CommandeItem();
        newItem.setCocktail(mockCocktail);
        newItem.setPrixUnitaire(new BigDecimal("10.00"));
        newItem.setQuantite(3);

        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));
        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(mockCocktail));
        when(commandeItemRepository.save(any(CommandeItem.class))).thenAnswer(inv -> inv.getArgument(0));

        Commande result = commandeService.ajouterItem(1L, newItem);

        assertThat(result).isNotNull();
        verify(commandeItemRepository).save(newItem);
    }

    @Test
    @DisplayName("ajouterItem - with null items list initializes and adds item")
    void ajouterItem_withNullItems_initializesList() {
        commande.setItems(null);

        Cocktail mockCocktail = new Cocktail();
        mockCocktail.setId(1L);

        CommandeItem newItem = new CommandeItem();
        newItem.setCocktail(mockCocktail);
        newItem.setPrixUnitaire(new BigDecimal("5.00"));
        newItem.setQuantite(1);

        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));
        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(mockCocktail));
        when(commandeItemRepository.save(any(CommandeItem.class))).thenAnswer(inv -> inv.getArgument(0));

        Commande result = commandeService.ajouterItem(1L, newItem);

        assertThat(result).isNotNull();
        assertThat(result.getItems()).isNotNull();
        assertThat(result.getTotal()).isEqualByComparingTo(new BigDecimal("5.00"));
    }

    @Test
    @DisplayName("retirerItem - removes item from order")
    void retirerItem_success() {
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        Commande result = commandeService.retirerItem(1L, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getItems()).isEmpty();
    }
}
