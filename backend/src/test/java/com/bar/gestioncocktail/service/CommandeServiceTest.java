package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.StockAlerteEvent;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CommandeItemRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
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
    @Mock TableRepository tableRepository;
    @Mock IngredientRepository ingredientRepository;
    @Mock SimpMessagingTemplate messagingTemplate;

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
        cocktailIngredient.setQuantite(new BigDecimal("4.00")); // 4 cl par cocktail
        cocktail.setIngredients(List.of(cocktailIngredient));

        item = new CommandeItem();
        item.setId(1L);
        item.setCocktail(cocktail);
        item.setQuantite(2); // 2 cocktails commandés

        commande = new Commande();
        commande.setId(1L);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setItems(List.of(item));

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
    void changerStatut_pret_setsDateLivraison() {
        commande.setStatut(CommandeStatut.EN_PREPARATION);
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        Commande result = commandeService.changerStatut(1L, CommandeStatut.PRET);

        assertThat(result.getStatut()).isEqualTo(CommandeStatut.PRET);
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
    void changerStatut_commandeInexistante_throwsException() {
        when(commandeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commandeService.changerStatut(99L, CommandeStatut.EN_PREPARATION))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("99");
    }

    // ─── déstockage ───────────────────────────────────────────────────────────

    @Test
    void changerStatut_enPreparation_destockeIngredients() {
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        // 4 cl × 2 cocktails = 8 cl consommés → stock attendu : 92 cl
        ArgumentCaptor<Ingredient> captor = ArgumentCaptor.forClass(Ingredient.class);
        verify(ingredientRepository).save(captor.capture());
        assertThat(captor.getValue().getQuantiteStock()).isEqualByComparingTo(new BigDecimal("92.00"));
    }

    @Test
    void changerStatut_enPreparation_pasDAlerteSiStockAuDessusSeuilAlerte() {
        // stock 100, seuil 20, consommation 8 → reste 92, pas d'alerte
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        verify(messagingTemplate, never()).convertAndSend(anyString(), any(StockAlerteEvent.class));
    }

    @Test
    void changerStatut_enPreparation_publieAlerteWebSocketSiStockSousSeuil() {
        ingredient.setQuantiteStock(new BigDecimal("25.00")); // 25 - 8 = 17 < seuil 20
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        ArgumentCaptor<StockAlerteEvent> eventCaptor = ArgumentCaptor.forClass(StockAlerteEvent.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/stock/alerte"), eventCaptor.capture());
        StockAlerteEvent event = eventCaptor.getValue();
        assertThat(event.ingredientId()).isEqualTo(1L);
        assertThat(event.quantiteActuelle()).isEqualByComparingTo(new BigDecimal("17.00"));
        assertThat(event.stockNegatif()).isFalse();
    }

    @Test
    void changerStatut_enPreparation_stockNegatifMarqueDansEvenement() {
        ingredient.setQuantiteStock(new BigDecimal("5.00")); // 5 - 8 = -3 → négatif
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        ArgumentCaptor<StockAlerteEvent> eventCaptor = ArgumentCaptor.forClass(StockAlerteEvent.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/stock/alerte"), eventCaptor.capture());
        assertThat(eventCaptor.getValue().stockNegatif()).isTrue();
        assertThat(eventCaptor.getValue().quantiteActuelle()).isNegative();
    }

    // ─── idempotence ──────────────────────────────────────────────────────────

    @Test
    void changerStatut_enPreparation_idempotent_neDestockePasDeuxFois() {
        // Simule un appel double (retry réseau) — la commande est déjà EN_PREPARATION
        commande.setStatut(CommandeStatut.EN_PREPARATION);
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        // Le stock NE doit PAS être décrémenté une seconde fois
        verify(ingredientRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(StockAlerteEvent.class));
    }

    @Test
    void changerStatut_enPreparation_idempotent_neSetsDatePreparationDeuxFois() {
        commande.setStatut(CommandeStatut.EN_PREPARATION);
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        Commande result = commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        // datePreparation ne doit pas être écrasée (elle était déjà set lors du premier passage)
        assertThat(result.getDatePreparation()).isNull(); // null car on n'a pas re-setté
    }
}
