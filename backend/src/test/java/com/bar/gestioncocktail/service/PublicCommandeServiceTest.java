package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.exception.StockInsuffisantException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.bar.gestioncocktail.event.OrderCreatedEvent;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.mockito.Spy;

@ExtendWith(MockitoExtension.class)
class PublicCommandeServiceTest {

    @Mock
    private CommandeRepository commandeRepository;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private CocktailRepository cocktailRepository;

    @Mock
    private CocktailVarianteRepository varianteRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Spy
    private TimeService timeService = new TimeService(null);

    @Mock
    private TableSessionService tableSessionService;

    @Mock
    private HappyHourService happyHourService;

    @InjectMocks
    private PublicCommandeService publicCommandeService;


    private TableEntity table;
    private Cocktail cocktail;
    private Ingredient ingredient;
    private CocktailIngredient cocktailIngredient;

    @BeforeEach
    void setUp() {
        table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);
        table.setOccupee(false);

        ingredient = new Ingredient();
        ingredient.setId(10L);
        ingredient.setNom("Rhum");
        ingredient.setQuantiteStock(BigDecimal.valueOf(100.0));

        cocktailIngredient = new CocktailIngredient();
        cocktailIngredient.setIngredient(ingredient);
        cocktailIngredient.setQuantite(BigDecimal.valueOf(5.0));

        cocktail = new Cocktail();
        cocktail.setId(100L);
        cocktail.setNom("Mojito");
        cocktail.setPrix(BigDecimal.valueOf(8.50));
        cocktail.setIngredients(List.of(cocktailIngredient));

        org.mockito.Mockito.lenient().when(tableSessionService.isSessionValidForOrder(any(), any())).thenReturn(true);
    }

    @Test
    void creerCommandePublique_casNominal_succes() {
        PublicCommandeItemRequestDTO itemDTO = new PublicCommandeItemRequestDTO(100L, null, 2, "Sans sucre");
        PublicCommandeRequestDTO requestDTO = new PublicCommandeRequestDTO(1L, List.of(itemDTO), "Commande rapide");

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(cocktailRepository.findById(100L)).thenReturn(Optional.of(cocktail));
        when(commandeRepository.save(any(Commande.class))).thenAnswer(invocation -> {
            Commande c = invocation.getArgument(0);
            c.setId(999L);
            return c;
        });

        PublicCommandeResponseDTO response = publicCommandeService.creerCommandePublique(requestDTO);

        assertNotNull(response);
        assertEquals(999L, response.getCommandeId());
        assertNotNull(response.getTrackingToken());
        assertEquals(1L, response.getTableId());
        assertEquals(BigDecimal.valueOf(17.00), response.getTotal());
        assertTrue(table.isOccupee());

        verify(eventPublisher, atLeastOnce()).publishEvent(any(OrderCreatedEvent.class));
    }

    @Test
    void creerCommandePublique_tableInexistante_lanceException() {
        PublicCommandeRequestDTO requestDTO = new PublicCommandeRequestDTO(99L, List.of(), "Test");
        when(tableRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> publicCommandeService.creerCommandePublique(requestDTO));
    }

    @Test
    void creerCommandePublique_stockInsuffisant_lanceException() {
        ingredient.setQuantiteStock(BigDecimal.valueOf(1.0)); // Moins que 5.0 x 1

        PublicCommandeItemRequestDTO itemDTO = new PublicCommandeItemRequestDTO(100L, null, 1, null);
        PublicCommandeRequestDTO requestDTO = new PublicCommandeRequestDTO(1L, List.of(itemDTO), null);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(cocktailRepository.findById(100L)).thenReturn(Optional.of(cocktail));

        assertThrows(StockInsuffisantException.class, () -> publicCommandeService.creerCommandePublique(requestDTO));
    }

    @Test
    void getCommandeParTrackingToken_succes() {
        Commande commande = new Commande();
        commande.setId(10L);
        commande.setTrackingToken("token-uuid-123");
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setTable(table);
        commande.setTotal(BigDecimal.valueOf(10.0));

        when(commandeRepository.findByTrackingToken("token-uuid-123")).thenReturn(Optional.of(commande));
        when(commandeRepository.countByStatut(CommandeStatut.EN_ATTENTE)).thenReturn(2L);

        PublicCommandeResponseDTO response = publicCommandeService.getCommandeParTrackingToken("token-uuid-123");

        assertNotNull(response);
        assertEquals("token-uuid-123", response.getTrackingToken());
        assertEquals(11, response.getTempsEstimeMinutes()); // 5 + (2 * 3)
    }

    @Test
    void creerCommandePublique_publishesOrderCreatedEvent() {
        PublicCommandeItemRequestDTO itemDTO = new PublicCommandeItemRequestDTO(100L, null, 1, null);
        PublicCommandeRequestDTO requestDTO = new PublicCommandeRequestDTO(1L, List.of(itemDTO), null);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(cocktailRepository.findById(100L)).thenReturn(Optional.of(cocktail));
        when(commandeRepository.save(any(Commande.class))).thenAnswer(inv -> {
            Commande c = inv.getArgument(0);
            c.setId(42L);
            return c;
        });

        PublicCommandeResponseDTO response = publicCommandeService.creerCommandePublique(requestDTO);

        assertNotNull(response);
        verify(eventPublisher).publishEvent(any(OrderCreatedEvent.class));
    }

    @Test
    void ajouterArticlesACommande_succes() {
        Commande existing = new Commande();
        existing.setId(50L);
        existing.setStatut(CommandeStatut.EN_ATTENTE);
        existing.setTable(table);
        existing.setTotal(BigDecimal.valueOf(10.0));
        existing.setItems(new java.util.ArrayList<>());

        PublicCommandeItemRequestDTO newItemDTO = new PublicCommandeItemRequestDTO(100L, null, 2, "Extra mint");

        when(commandeRepository.findById(50L)).thenReturn(Optional.of(existing));
        when(cocktailRepository.findById(100L)).thenReturn(Optional.of(cocktail));
        when(commandeRepository.save(any(Commande.class))).thenAnswer(inv -> inv.getArgument(0));
        when(commandeRepository.countByStatut(CommandeStatut.EN_ATTENTE)).thenReturn(1L);

        PublicCommandeResponseDTO response = publicCommandeService.ajouterArticlesACommande(50L, List.of(newItemDTO));

        assertNotNull(response);
        assertEquals(0, BigDecimal.valueOf(27.0).compareTo(existing.getTotal())); // 10.0 + (2 * 8.50)
        verify(eventPublisher).publishEvent(any(com.bar.gestioncocktail.event.OrderUpdatedEvent.class));
        assertEquals(8, response.getTempsEstimeMinutes()); // 5 + (1 * 3)
    }

    @Test
    void ajouterArticlesACommande_whenNotFound_throwsResourceNotFoundException() {
        when(commandeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                publicCommandeService.ajouterArticlesACommande(999L, List.of())
        );
    }

    @Test
    void ajouterArticlesACommande_whenNotEnAttente_throwsBusinessException() {
        Commande existing = new Commande();
        existing.setId(50L);
        existing.setStatut(CommandeStatut.PRET);

        when(commandeRepository.findById(50L)).thenReturn(Optional.of(existing));

        assertThrows(com.bar.gestioncocktail.exception.BusinessException.class, () ->
                publicCommandeService.ajouterArticlesACommande(50L, List.of())
        );
    }
}
