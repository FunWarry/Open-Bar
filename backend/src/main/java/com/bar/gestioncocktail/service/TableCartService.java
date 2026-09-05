package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.model.TableCartItem;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.bar.gestioncocktail.repository.TableCartItemRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service managing collaborative multi-guest table carts.
 * <p>
 * Synchronizes items added by patrons at the same table in real time via STOMP destination
 * {@code /topic/tables/{tableId}/cart}, allowing consolidated submission to the bar.
 */
@Service
@Transactional
public class TableCartService {

    private static final Logger log = LoggerFactory.getLogger(TableCartService.class);

    private final TableCartItemRepository tableCartItemRepository;
    private final TableRepository tableRepository;
    private final CocktailRepository cocktailRepository;
    private final CocktailVarianteRepository varianteRepository;
    private final PublicCommandeService publicCommandeService;
    private final SimpMessagingTemplate messagingTemplate;
    private final TimeService timeService;

    /**
     * Constructs the table cart service with all required dependencies.
     *
     * @param tableCartItemRepository Repository for cart item persistence
     * @param tableRepository Table repository
     * @param cocktailRepository Cocktail catalog repository
     * @param varianteRepository Cocktail variant repository
     * @param publicCommandeService Public order service for consolidated submission
     * @param messagingTemplate STOMP messaging template for real-time broadcasts
     * @param timeService Application time service
     */
    public TableCartService(
            TableCartItemRepository tableCartItemRepository,
            TableRepository tableRepository,
            CocktailRepository cocktailRepository,
            CocktailVarianteRepository varianteRepository,
            PublicCommandeService publicCommandeService,
            SimpMessagingTemplate messagingTemplate,
            TimeService timeService) {
        this.tableCartItemRepository = tableCartItemRepository;
        this.tableRepository = tableRepository;
        this.cocktailRepository = cocktailRepository;
        this.varianteRepository = varianteRepository;
        this.publicCommandeService = publicCommandeService;
        this.messagingTemplate = messagingTemplate;
        this.timeService = timeService;
    }

    /**
     * Retrieves the current consolidated collaborative cart for a table.
     *
     * @param tableId Table identifier
     * @return Current table cart state
     */
    @Transactional(readOnly = true)
    public TableCartResponseDTO getCart(Long tableId) {
        return fetchCart(tableId);
    }

    /**
     * Adds or increments an item in the collaborative table cart.
     *
     * @param tableId Table identifier
     * @param dto Item creation payload
     * @return Updated table cart state
     */
    public TableCartResponseDTO addItem(Long tableId, TableCartItemRequestDTO dto) {
        validateTableExists(tableId);

        Cocktail cocktail = cocktailRepository.findById(dto.getCocktailId())
                .orElseThrow(() -> new ResourceNotFoundException("Cocktail not found with id: " + dto.getCocktailId()));

        if (!cocktail.isDisponible()) {
            throw new BusinessException("Cocktail is currently unavailable: " + cocktail.getNom());
        }

        if (dto.getVarianteId() != null) {
            varianteRepository.findById(dto.getVarianteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Variant not found with id: " + dto.getVarianteId()));
        }

        saveOrIncrementItem(tableId, dto);

        TableCartResponseDTO updatedCart = fetchCart(tableId);
        broadcastCart(tableId, updatedCart);
        log.info("Guest '{}' added {}x cocktail {} to table {} cart",
                dto.getGuestName(), dto.getQuantite(), dto.getCocktailId(), tableId);
        return updatedCart;
    }

    private void saveOrIncrementItem(Long tableId, TableCartItemRequestDTO dto) {
        Optional<TableCartItem> existing = dto.getVarianteId() != null
                ? tableCartItemRepository.findByTableIdAndGuestSessionIdAndCocktailIdAndCocktailVarianteId(
                        tableId, dto.getGuestSessionId(), dto.getCocktailId(), dto.getVarianteId())
                : tableCartItemRepository.findByTableIdAndGuestSessionIdAndCocktailIdAndCocktailVarianteIdIsNull(
                        tableId, dto.getGuestSessionId(), dto.getCocktailId());

        if (existing.isPresent()) {
            TableCartItem item = existing.get();
            item.setQuantite(item.getQuantite() + dto.getQuantite());
            item.setGuestName(dto.getGuestName());
            if (dto.getNotes() != null && !dto.getNotes().isBlank()) {
                item.setNotes(dto.getNotes());
            }
            tableCartItemRepository.save(item);
        } else {
            TableCartItem newItem = new TableCartItem();
            newItem.setTableId(tableId);
            newItem.setGuestSessionId(dto.getGuestSessionId());
            newItem.setGuestName(dto.getGuestName());
            newItem.setCocktailId(dto.getCocktailId());
            newItem.setCocktailVarianteId(dto.getVarianteId());
            newItem.setQuantite(dto.getQuantite());
            newItem.setNotes(dto.getNotes());
            tableCartItemRepository.save(newItem);
        }
    }

    /**
     * Updates an existing cart item's quantity or notes.
     *
     * @param tableId Table identifier
     * @param itemId Cart item identifier
     * @param dto Update payload
     * @return Updated table cart state
     */
    public TableCartResponseDTO updateItem(Long tableId, Long itemId, TableCartItemUpdateRequestDTO dto) {
        validateTableExists(tableId);

        TableCartItem item = tableCartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found with id: " + itemId));

        if (!item.getTableId().equals(tableId)) {
            throw new BusinessException("Cart item does not belong to table " + tableId);
        }

        if (dto.getQuantite() <= 0) {
            tableCartItemRepository.delete(item);
        } else {
            item.setQuantite(dto.getQuantite());
            if (dto.getNotes() != null) {
                item.setNotes(dto.getNotes());
            }
            tableCartItemRepository.save(item);
        }

        TableCartResponseDTO updatedCart = fetchCart(tableId);
        broadcastCart(tableId, updatedCart);
        return updatedCart;
    }

    /**
     * Removes an item from the collaborative table cart.
     *
     * @param tableId Table identifier
     * @param itemId Cart item identifier
     * @param guestSessionId Optional guest identifier requesting removal
     * @return Updated table cart state
     */
    public TableCartResponseDTO removeItem(Long tableId, Long itemId, String guestSessionId) {
        validateTableExists(tableId);

        TableCartItem item = tableCartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found with id: " + itemId));

        if (!item.getTableId().equals(tableId)) {
            throw new BusinessException("Cart item does not belong to table " + tableId);
        }

        tableCartItemRepository.delete(item);

        TableCartResponseDTO updatedCart = fetchCart(tableId);
        broadcastCart(tableId, updatedCart);
        log.info("Removed cart item {} from table {} cart", itemId, tableId);
        return updatedCart;
    }

    /**
     * Clears all items currently in the table cart.
     *
     * @param tableId Table identifier
     * @return Empty table cart state
     */
    public TableCartResponseDTO clearCart(Long tableId) {
        validateTableExists(tableId);
        tableCartItemRepository.deleteByTableId(tableId);
        TableCartResponseDTO emptyCart = TableCartResponseDTO.empty(tableId, timeService.now());
        broadcastCart(tableId, emptyCart);
        log.info("Cleared all items from table {} cart", tableId);
        return emptyCart;
    }

    /**
     * Consolidates all items in the collaborative table cart into an official order dispatched to the bar.
     *
     * @param tableId Table identifier
     * @param dto Submission request payload
     * @return Created public order response DTO
     */
    public PublicCommandeResponseDTO submitCart(Long tableId, TableCartSubmitRequestDTO dto) {
        validateTableExists(tableId);

        List<TableCartItem> items = tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(tableId);
        if (items.isEmpty()) {
            throw new BusinessException("Cannot submit order: table cart is empty");
        }

        List<PublicCommandeItemRequestDTO> orderItems = new ArrayList<>();
        for (TableCartItem item : items) {
            PublicCommandeItemRequestDTO orderItem = new PublicCommandeItemRequestDTO();
            orderItem.setCocktailId(item.getCocktailId());
            orderItem.setVarianteId(item.getCocktailVarianteId());
            orderItem.setQuantite(item.getQuantite());

            String itemNotes = (item.getNotes() != null && !item.getNotes().isBlank()) ? item.getNotes().trim() : "";
            String guestLabel = "[" + item.getGuestName() + "]";
            orderItem.setNotes(itemNotes.isEmpty() ? guestLabel : guestLabel + " " + itemNotes);

            orderItems.add(orderItem);
        }

        PublicCommandeRequestDTO orderRequest = new PublicCommandeRequestDTO();
        orderRequest.setTableId(tableId);
        orderRequest.setItems(orderItems);
        orderRequest.setNotes(dto.getNotes());
        orderRequest.setSessionToken(dto.getSessionToken());

        PublicCommandeResponseDTO createdOrder = publicCommandeService.creerCommandePublique(orderRequest);

        tableCartItemRepository.deleteByTableId(tableId);

        TableCartResponseDTO submittedNotification = new TableCartResponseDTO(
                tableId,
                "SUBMITTED",
                List.of(),
                0,
                BigDecimal.ZERO,
                createdOrder.getCommandeId(),
                createdOrder.getTrackingToken(),
                dto.getGuestName(),
                timeService.now()
        );
        broadcastCart(tableId, submittedNotification);

        log.info("Guest '{}' successfully submitted collaborative order #{} for table {}",
                dto.getGuestName(), createdOrder.getCommandeId(), tableId);

        return createdOrder;
    }

    /**
     * Invalidation listener triggered when a table is liberated or settled.
     * Purges all lingering collaborative cart items.
     *
     * @param event Table liberated event
     */
    @EventListener
    public void handleTableLiberated(TableLiberatedEvent event) {
        if (event == null || event.table() == null || event.table().getId() == null) {
            return;
        }
        Long tableId = event.table().getId();
        tableCartItemRepository.deleteByTableId(tableId);
        TableCartResponseDTO emptyCart = TableCartResponseDTO.empty(tableId, timeService.now());
        broadcastCart(tableId, emptyCart);
        log.info("Automatically invalidated collaborative cart for liberated table {}", tableId);
    }

    private TableCartResponseDTO fetchCart(Long tableId) {
        validateTableExists(tableId);
        List<TableCartItem> items = tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(tableId);
        return buildCartResponse(tableId, "OPEN", items, null, null, null);
    }

    private void validateTableExists(Long tableId) {
        if (tableId == null) {
            throw new BusinessException("Table ID cannot be null");
        }
        tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Table not found with id: " + tableId));
    }

    private TableCartResponseDTO buildCartResponse(
            Long tableId,
            String status,
            List<TableCartItem> items,
            Long submittedOrderId,
            String trackingToken,
            String submittedBy) {

        if (items.isEmpty()) {
            return new TableCartResponseDTO(
                    tableId,
                    status,
                    List.of(),
                    0,
                    BigDecimal.ZERO,
                    submittedOrderId,
                    trackingToken,
                    submittedBy,
                    timeService.now()
            );
        }

        Map<Long, Cocktail> cocktailsMap = loadCocktailsMap(items);
        Map<Long, CocktailVariante> variantesMap = loadVariantesMap(items);

        List<TableCartItemResponseDTO> itemDTOs = new ArrayList<>();
        int totalItems = 0;
        BigDecimal totalPrice = BigDecimal.ZERO;

        for (TableCartItem item : items) {
            TableCartItemResponseDTO itemDto = mapItemToDto(item, cocktailsMap, variantesMap);
            if (itemDto != null) {
                itemDTOs.add(itemDto);
                totalItems += item.getQuantite();
                totalPrice = totalPrice.add(itemDto.totalLigne());
            }
        }

        return new TableCartResponseDTO(
                tableId,
                status,
                itemDTOs,
                totalItems,
                totalPrice,
                submittedOrderId,
                trackingToken,
                submittedBy,
                timeService.now()
        );
    }

    private Map<Long, Cocktail> loadCocktailsMap(List<TableCartItem> items) {
        List<Long> cocktailIds = new ArrayList<>();
        for (TableCartItem item : items) {
            if (item.getCocktailId() != null && !cocktailIds.contains(item.getCocktailId())) {
                cocktailIds.add(item.getCocktailId());
            }
        }
        Map<Long, Cocktail> map = new HashMap<>();
        for (Cocktail cocktail : cocktailRepository.findAllById(cocktailIds)) {
            if (cocktail.getId() != null) {
                map.put(cocktail.getId(), cocktail);
            }
        }
        return map;
    }

    private Map<Long, CocktailVariante> loadVariantesMap(List<TableCartItem> items) {
        List<Long> varianteIds = new ArrayList<>();
        for (TableCartItem item : items) {
            Long varianteId = item.getCocktailVarianteId();
            if (varianteId != null && varianteId > 0 && !varianteIds.contains(varianteId)) {
                varianteIds.add(varianteId);
            }
        }

        Map<Long, CocktailVariante> map = new HashMap<>();
        if (!varianteIds.isEmpty()) {
            for (CocktailVariante variante : varianteRepository.findAllById(varianteIds)) {
                if (variante.getId() != null) {
                    map.put(variante.getId(), variante);
                }
            }
        }
        return map;
    }

    private TableCartItemResponseDTO mapItemToDto(
            TableCartItem item,
            Map<Long, Cocktail> cocktailsMap,
            Map<Long, CocktailVariante> variantesMap) {

        Cocktail cocktail = cocktailsMap.get(item.getCocktailId());
        if (cocktail == null) {
            return null;
        }

        CocktailVariante variante = item.getCocktailVarianteId() != null
                ? variantesMap.get(item.getCocktailVarianteId())
                : null;

        BigDecimal unitPrice = cocktail.getPrix();
        if (variante != null && variante.getPrixSupplement() != null) {
            unitPrice = unitPrice.add(variante.getPrixSupplement());
        }

        BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(item.getQuantite()));

        return new TableCartItemResponseDTO(
                item.getId(),
                item.getGuestSessionId(),
                item.getGuestName(),
                cocktail.getId(),
                cocktail.getNom(),
                cocktail.getImageUrl(),
                variante != null ? variante.getId() : null,
                variante != null ? variante.getNom() : null,
                item.getQuantite(),
                unitPrice,
                lineTotal,
                item.getNotes(),
                item.getCreatedAt() != null ? item.getCreatedAt() : timeService.now()
        );
    }

    private void broadcastCart(Long tableId, TableCartResponseDTO cart) {
        if (messagingTemplate != null && tableId != null) {
            try {
                messagingTemplate.convertAndSend("/topic/tables/" + tableId + "/cart", cart);
            } catch (Exception e) {
                log.warn("Failed to broadcast cart update for table {}: {}", tableId, e.getMessage());
            }
        }
    }
}
