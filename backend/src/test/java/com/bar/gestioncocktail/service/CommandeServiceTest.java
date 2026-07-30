package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.StockAlerteEvent;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.mockito.Spy;

@ExtendWith(MockitoExtension.class)
class CommandeServiceTest {

    @Mock CommandeRepository commandeRepository;
    @Mock CommandeItemRepository commandeItemRepository;
    @Mock IngredientRepository ingredientRepository;
    @Mock TableRepository tableRepository;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Spy TimeService timeService = new TimeService(null);

    CommandeService commandeService;


    private Ingredient ingredient;
    private CocktailIngredient cocktailIngredient;
    private CommandeItem item;
    private Commande commande;

    @BeforeEach
    void setUp() {
        commandeService = new CommandeService(
                commandeRepository,
                commandeItemRepository,
                ingredientRepository,
                tableRepository,
                messagingTemplate,
                timeService
        );

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
    void changerStatut_commandeInexistante_throwsException() {
        when(commandeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commandeService.changerStatut(99L, CommandeStatut.EN_PREPARATION))
                .isInstanceOf(ResourceNotFoundException.class)
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
        // Simule un appel double (retry réseau) — la commande est déjà EN_PREPARATION avec datePreparation déjà set
        commande.setStatut(CommandeStatut.EN_PREPARATION);
        commande.setDatePreparation(LocalDateTime.now().minusMinutes(1));
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        // Le stock NE doit PAS être décrémenté une seconde fois
        verify(ingredientRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(StockAlerteEvent.class));
    }

    @Test
    void changerStatut_enPreparation_idempotent_neSetsDatePreparationDeuxFois() {
        // La commande a déjà une datePreparation (premier passage déjà effectué)
        commande.setStatut(CommandeStatut.EN_PREPARATION);
        commande.setDatePreparation(LocalDateTime.now().minusMinutes(5));
        LocalDateTime dateInitiale = commande.getDatePreparation();
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        Commande result = commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        // datePreparation ne doit pas être écrasée — elle est préservée telle quelle
        assertThat(result.getDatePreparation()).isEqualTo(dateInitiale);
    }

    @Test
    void destockage_seuilAlerteNull_nePasNPE() {
        // Un ingrédient sans seuil d'alerte configuré ne doit pas lever de NPE
        ingredient.setSeuilAlerte(null);
        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        // Act + Assert : aucune exception ne doit être levée
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
            () -> commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION)
        );
        // Aucune alerte WebSocket ne doit être publiée (seuil absent)
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(StockAlerteEvent.class));
    }

    // ─── ré-incrémentation stock annulation & variantes ───────────────────────

    @Test
    void annulerCommande_apresPreparation_reincrementeStockIngredients() {
        commande.setStatut(CommandeStatut.EN_PREPARATION);
        commande.setDatePreparation(LocalDateTime.now());

        commandeService.annulerCommande(commande);

        assertThat(commande.getStatut()).isEqualTo(CommandeStatut.ANNULEE);
        ArgumentCaptor<Ingredient> captor = ArgumentCaptor.forClass(Ingredient.class);
        verify(ingredientRepository).save(captor.capture());
        // Stock initial (100) + (4 cl * 2 qte) = 108
        assertThat(captor.getValue().getQuantiteStock()).isEqualByComparingTo(new BigDecimal("108.00"));
    }

    @Test
    void destockerIngredients_avecVarianteMultiplicateur_destockeEnFonctionDuMultiplicateur() {
        CocktailVariante variante = new CocktailVariante();
        variante.setMultiplicateurIngredient(new BigDecimal("1.5")); // Format XL 1.5x
        item.setVariante(variante);

        when(commandeRepository.findById(1L)).thenReturn(Optional.of(commande));

        commandeService.changerStatut(1L, CommandeStatut.EN_PREPARATION);

        // 4 cl * 2 qte * 1.5 mult = 12 cl consommés -> 100 - 12 = 88
        ArgumentCaptor<Ingredient> captor = ArgumentCaptor.forClass(Ingredient.class);
        verify(ingredientRepository).save(captor.capture());
        assertThat(captor.getValue().getQuantiteStock()).isEqualByComparingTo(new BigDecimal("88.00"));
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
                .hasMessageContaining("Table non trouvée avec l'id: 99");
    }
}
