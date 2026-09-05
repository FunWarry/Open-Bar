package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.model.TableCartItem;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.bar.gestioncocktail.repository.TableCartItemRepository;
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
import java.time.Month;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link TableCartService}.
 */
@ExtendWith(MockitoExtension.class)
class TableCartServiceTest {

    @Mock
    private TableCartItemRepository tableCartItemRepository;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private CocktailRepository cocktailRepository;

    @Mock
    private CocktailVarianteRepository varianteRepository;

    @Mock
    private PublicCommandeService publicCommandeService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Spy
    private TimeService timeService = new TimeService(null);

    @InjectMocks
    private TableCartService tableCartService;

    private final LocalDateTime fixedNow = LocalDateTime.of(2026, Month.SEPTEMBER, 5, 19, 0, 0);
    private TableEntity mockTable;
    private Cocktail mockCocktail;
    private CocktailVariante mockVariante;

    @BeforeEach
    void setUp() {
        lenient().doReturn(fixedNow).when(timeService).now();

        mockTable = new TableEntity();
        mockTable.setId(1L);
        mockTable.setNumero(1);

        mockCocktail = new Cocktail();
        mockCocktail.setId(10L);
        mockCocktail.setNom("Mojito");
        mockCocktail.setPrix(BigDecimal.valueOf(8.50));
        mockCocktail.setDisponible(true);

        mockVariante = new CocktailVariante();
        mockVariante.setId(20L);
        mockVariante.setNom("Spicy");
        mockVariante.setPrixSupplement(BigDecimal.valueOf(1.50));
    }

    @Test
    @DisplayName("getCart: returns empty cart when no items exist for table")
    void getCart_whenNoItems_returnsEmptyCart() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        TableCartResponseDTO response = tableCartService.getCart(1L);

        assertThat(response).isNotNull();
        assertThat(response.tableId()).isEqualTo(1L);
        assertThat(response.status()).isEqualTo("OPEN");
        assertThat(response.items()).isEmpty();
        assertThat(response.totalItems()).isZero();
        assertThat(response.totalPrice()).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("getCart: aggregates items with variants and calculates totals accurately")
    void getCart_withItemsAndVariants_calculatesTotalsCorrectly() {
        TableCartItem item1 = new TableCartItem();
        item1.setId(101L);
        item1.setTableId(1L);
        item1.setGuestSessionId("guest-1");
        item1.setGuestName("Alice");
        item1.setCocktailId(10L);
        item1.setCocktailVarianteId(20L);
        item1.setQuantite(2);
        item1.setNotes("Less sweet");
        item1.setCreatedAt(fixedNow);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(item1));
        when(cocktailRepository.findAllById(List.of(10L))).thenReturn(List.of(mockCocktail));
        when(varianteRepository.findAllById(List.of(20L))).thenReturn(List.of(mockVariante));

        TableCartResponseDTO response = tableCartService.getCart(1L);

        assertThat(response).isNotNull();
        assertThat(response.items()).hasSize(1);
        TableCartItemResponseDTO itemDto = response.items().getFirst();
        assertThat(itemDto.guestName()).isEqualTo("Alice");
        assertThat(itemDto.cocktailNom()).isEqualTo("Mojito");
        assertThat(itemDto.varianteNom()).isEqualTo("Spicy");
        assertThat(itemDto.quantite()).isEqualTo(2);
        assertThat(itemDto.prixUnitaire()).isEqualByComparingTo(BigDecimal.valueOf(10.00));
        assertThat(itemDto.totalLigne()).isEqualByComparingTo(BigDecimal.valueOf(20.00));
        assertThat(response.totalItems()).isEqualTo(2);
        assertThat(response.totalPrice()).isEqualByComparingTo(BigDecimal.valueOf(20.00));
    }

    @Test
    @DisplayName("getCart: throws ResourceNotFoundException when table does not exist")
    void getCart_whenTableNotFound_throwsException() {
        when(tableRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tableCartService.getCart(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Table not found with id: 99");
    }

    @Test
    @DisplayName("addItem: persists new item and broadcasts updated cart")
    void addItem_whenNewItem_savesAndBroadcasts() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(cocktailRepository.findById(10L)).thenReturn(Optional.of(mockCocktail));
        when(varianteRepository.findById(20L)).thenReturn(Optional.of(mockVariante));
        when(tableCartItemRepository.findByTableIdAndGuestSessionIdAndCocktailIdAndCocktailVarianteId(
                1L, "guest-1", 10L, 20L)).thenReturn(Optional.empty());
        when(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        TableCartItemRequestDTO request = new TableCartItemRequestDTO();
        request.setGuestSessionId("guest-1");
        request.setGuestName("Bob");
        request.setCocktailId(10L);
        request.setVarianteId(20L);
        request.setQuantite(1);
        request.setNotes("Extra lime");

        TableCartResponseDTO result = tableCartService.addItem(1L, request);

        assertThat(result).isNotNull();
        ArgumentCaptor<TableCartItem> captor = ArgumentCaptor.forClass(TableCartItem.class);
        verify(tableCartItemRepository).save(captor.capture());
        TableCartItem saved = captor.getValue();
        assertThat(saved.getTableId()).isEqualTo(1L);
        assertThat(saved.getGuestSessionId()).isEqualTo("guest-1");
        assertThat(saved.getGuestName()).isEqualTo("Bob");
        assertThat(saved.getCocktailId()).isEqualTo(10L);
        assertThat(saved.getCocktailVarianteId()).isEqualTo(20L);
        assertThat(saved.getQuantite()).isEqualTo(1);
        assertThat(saved.getNotes()).isEqualTo("Extra lime");

        verify(messagingTemplate).convertAndSend(eq("/topic/tables/1/cart"), any(TableCartResponseDTO.class));
    }

    @Test
    @DisplayName("addItem: increments existing item quantity for same guest and variant")
    void addItem_whenExistingItem_incrementsQuantity() {
        TableCartItem existingItem = new TableCartItem();
        existingItem.setId(50L);
        existingItem.setTableId(1L);
        existingItem.setGuestSessionId("guest-1");
        existingItem.setGuestName("Bob");
        existingItem.setCocktailId(10L);
        existingItem.setQuantite(2);
        existingItem.setNotes("Initial note");

        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(cocktailRepository.findById(10L)).thenReturn(Optional.of(mockCocktail));
        when(tableCartItemRepository.findByTableIdAndGuestSessionIdAndCocktailIdAndCocktailVarianteIdIsNull(
                1L, "guest-1", 10L)).thenReturn(Optional.of(existingItem));
        when(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(existingItem));

        TableCartItemRequestDTO request = new TableCartItemRequestDTO();
        request.setGuestSessionId("guest-1");
        request.setGuestName("Bob Updated");
        request.setCocktailId(10L);
        request.setQuantite(3);
        request.setNotes("Updated note");

        tableCartService.addItem(1L, request);

        assertThat(existingItem.getQuantite()).isEqualTo(5);
        assertThat(existingItem.getGuestName()).isEqualTo("Bob Updated");
        assertThat(existingItem.getNotes()).isEqualTo("Updated note");
        verify(tableCartItemRepository).save(existingItem);
    }

    @Test
    @DisplayName("addItem: throws BusinessException when cocktail is marked unavailable")
    void addItem_whenCocktailUnavailable_throwsBusinessException() {
        mockCocktail.setDisponible(false);
        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(cocktailRepository.findById(10L)).thenReturn(Optional.of(mockCocktail));

        TableCartItemRequestDTO request = new TableCartItemRequestDTO();
        request.setGuestSessionId("guest-1");
        request.setGuestName("Bob");
        request.setCocktailId(10L);
        request.setQuantite(1);

        assertThatThrownBy(() -> tableCartService.addItem(1L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cocktail is currently unavailable");
    }

    @Test
    @DisplayName("updateItem: updates quantity and notes when positive")
    void updateItem_whenPositiveQuantity_updatesFields() {
        TableCartItem item = new TableCartItem();
        item.setId(55L);
        item.setTableId(1L);
        item.setQuantite(2);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(tableCartItemRepository.findById(55L)).thenReturn(Optional.of(item));
        when(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(item));

        TableCartItemUpdateRequestDTO request = new TableCartItemUpdateRequestDTO();
        request.setQuantite(4);
        request.setNotes("No sugar");

        tableCartService.updateItem(1L, 55L, request);

        assertThat(item.getQuantite()).isEqualTo(4);
        assertThat(item.getNotes()).isEqualTo("No sugar");
        verify(tableCartItemRepository).save(item);
    }

    @Test
    @DisplayName("updateItem: deletes item when quantity is zero or negative")
    void updateItem_whenQuantityZero_deletesItem() {
        TableCartItem item = new TableCartItem();
        item.setId(55L);
        item.setTableId(1L);
        item.setQuantite(2);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(tableCartItemRepository.findById(55L)).thenReturn(Optional.of(item));
        when(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        TableCartItemUpdateRequestDTO request = new TableCartItemUpdateRequestDTO();
        request.setQuantite(0);

        tableCartService.updateItem(1L, 55L, request);

        verify(tableCartItemRepository).delete(item);
    }

    @Test
    @DisplayName("updateItem: throws BusinessException when item belongs to different table")
    void updateItem_whenMismatchedTable_throwsBusinessException() {
        TableCartItem item = new TableCartItem();
        item.setId(55L);
        item.setTableId(2L);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(tableCartItemRepository.findById(55L)).thenReturn(Optional.of(item));

        TableCartItemUpdateRequestDTO request = new TableCartItemUpdateRequestDTO();
        request.setQuantite(1);

        assertThatThrownBy(() -> tableCartService.updateItem(1L, 55L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cart item does not belong to table 1");
    }

    @Test
    @DisplayName("removeItem: deletes item and broadcasts updated cart")
    void removeItem_deletesItemAndBroadcasts() {
        TableCartItem item = new TableCartItem();
        item.setId(60L);
        item.setTableId(1L);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(tableCartItemRepository.findById(60L)).thenReturn(Optional.of(item));
        when(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        tableCartService.removeItem(1L, 60L, "guest-1");

        verify(tableCartItemRepository).delete(item);
        verify(messagingTemplate).convertAndSend(eq("/topic/tables/1/cart"), any(TableCartResponseDTO.class));
    }

    @Test
    @DisplayName("clearCart: deletes all items and broadcasts empty cart state")
    void clearCart_deletesAllAndBroadcasts() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));

        TableCartResponseDTO response = tableCartService.clearCart(1L);

        assertThat(response.items()).isEmpty();
        assertThat(response.totalItems()).isZero();
        verify(tableCartItemRepository).deleteByTableId(1L);
        verify(messagingTemplate).convertAndSend(eq("/topic/tables/1/cart"), any(TableCartResponseDTO.class));
    }

    @Test
    @DisplayName("submitCart: creates public order with consolidated guest items and clears cart")
    void submitCart_whenValidCart_submitsOrderAndNotifies() {
        TableCartItem item1 = new TableCartItem();
        item1.setId(101L);
        item1.setTableId(1L);
        item1.setGuestSessionId("guest-1");
        item1.setGuestName("Alice");
        item1.setCocktailId(10L);
        item1.setCocktailVarianteId(20L);
        item1.setQuantite(2);
        item1.setNotes("Less ice");

        TableCartItem item2 = new TableCartItem();
        item2.setId(102L);
        item2.setTableId(1L);
        item2.setGuestSessionId("guest-2");
        item2.setGuestName("Bob");
        item2.setCocktailId(10L);
        item2.setQuantite(1);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(item1, item2));

        PublicCommandeResponseDTO orderResponse = new PublicCommandeResponseDTO();
        orderResponse.setCommandeId(999L);
        orderResponse.setTrackingToken("track-token-abc");

        when(publicCommandeService.creerCommandePublique(any(PublicCommandeRequestDTO.class)))
                .thenReturn(orderResponse);

        TableCartSubmitRequestDTO submitRequest = new TableCartSubmitRequestDTO();
        submitRequest.setGuestSessionId("guest-1");
        submitRequest.setGuestName("Alice");
        submitRequest.setSessionToken("session-token-123");
        submitRequest.setNotes("Please serve together");

        PublicCommandeResponseDTO result = tableCartService.submitCart(1L, submitRequest);

        assertThat(result).isNotNull();
        assertThat(result.getCommandeId()).isEqualTo(999L);

        ArgumentCaptor<PublicCommandeRequestDTO> captor = ArgumentCaptor.forClass(PublicCommandeRequestDTO.class);
        verify(publicCommandeService).creerCommandePublique(captor.capture());
        PublicCommandeRequestDTO sentOrder = captor.getValue();
        assertThat(sentOrder.getTableId()).isEqualTo(1L);
        assertThat(sentOrder.getSessionToken()).isEqualTo("session-token-123");
        assertThat(sentOrder.getNotes()).isEqualTo("Please serve together");
        assertThat(sentOrder.getItems()).hasSize(2);
        assertThat(sentOrder.getItems().getFirst().getNotes()).isEqualTo("[Alice] Less ice");
        assertThat(sentOrder.getItems().get(1).getNotes()).isEqualTo("[Bob]");

        verify(tableCartItemRepository).deleteByTableId(1L);

        ArgumentCaptor<TableCartResponseDTO> broadcastCaptor = ArgumentCaptor.forClass(TableCartResponseDTO.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/tables/1/cart"), broadcastCaptor.capture());
        TableCartResponseDTO broadcast = broadcastCaptor.getValue();
        assertThat(broadcast.status()).isEqualTo("SUBMITTED");
        assertThat(broadcast.submittedOrderId()).isEqualTo(999L);
        assertThat(broadcast.trackingToken()).isEqualTo("track-token-abc");
        assertThat(broadcast.submittedBy()).isEqualTo("Alice");
    }

    @Test
    @DisplayName("submitCart: throws BusinessException when cart is empty")
    void submitCart_whenEmpty_throwsBusinessException() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(mockTable));
        when(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        TableCartSubmitRequestDTO request = new TableCartSubmitRequestDTO();
        request.setGuestName("Alice");

        assertThatThrownBy(() -> tableCartService.submitCart(1L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot submit order: table cart is empty");
    }

    @Test
    @DisplayName("handleTableLiberated: deletes cart items and broadcasts empty state")
    void handleTableLiberated_deletesCartAndBroadcasts() {
        TableEntity liberatedTable = new TableEntity();
        liberatedTable.setId(7L);
        TableLiberatedEvent event = new TableLiberatedEvent(liberatedTable);

        tableCartService.handleTableLiberated(event);

        verify(tableCartItemRepository).deleteByTableId(7L);
        verify(messagingTemplate).convertAndSend(eq("/topic/tables/7/cart"), any(TableCartResponseDTO.class));
    }
}
