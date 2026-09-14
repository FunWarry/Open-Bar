package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableAppelRepository;
import com.bar.gestioncocktail.repository.TableCartItemRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
    private final CommandeRepository commandeRepository;
    private final TableAppelRepository tableAppelRepository;

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
     * @param commandeRepository Repository for order queries and updates
     * @param tableAppelRepository Repository for waiter and bill alerts
     */
    @org.springframework.beans.factory.annotation.Autowired
    public TableCartService(
            TableCartItemRepository tableCartItemRepository,
            TableRepository tableRepository,
            CocktailRepository cocktailRepository,
            CocktailVarianteRepository varianteRepository,
            PublicCommandeService publicCommandeService,
            SimpMessagingTemplate messagingTemplate,
            TimeService timeService,
            CommandeRepository commandeRepository,
            TableAppelRepository tableAppelRepository) {
        this.tableCartItemRepository = tableCartItemRepository;
        this.tableRepository = tableRepository;
        this.cocktailRepository = cocktailRepository;
        this.varianteRepository = varianteRepository;
        this.publicCommandeService = publicCommandeService;
        this.messagingTemplate = messagingTemplate;
        this.timeService = timeService;
        this.commandeRepository = commandeRepository;
        this.tableAppelRepository = tableAppelRepository;
    }

    /**
     * Backward-compatible constructor for existing tests and call sites.
     */
    public TableCartService(
            TableCartItemRepository tableCartItemRepository,
            TableRepository tableRepository,
            CocktailRepository cocktailRepository,
            CocktailVarianteRepository varianteRepository,
            PublicCommandeService publicCommandeService,
            SimpMessagingTemplate messagingTemplate,
            TimeService timeService) {
        this(tableCartItemRepository, tableRepository, cocktailRepository, varianteRepository,
                publicCommandeService, messagingTemplate, timeService, null, null);
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
        log.info("Added {}x cocktail {} to table {} cart",
                dto.getQuantite(), dto.getCocktailId(), tableId);
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
     * Consolidates all items in the collaborative table cart into an official order dispatched to the bar,
     * grouping with an existing order if placed within the 2-minute grace window.
     *
     * @param tableId Table identifier
     * @param dto Submission request payload
     * @return Created or merged public order response DTO
     */
    public PublicCommandeResponseDTO submitCart(Long tableId, TableCartSubmitRequestDTO dto) {
        TableEntity table = resolveTable(tableId);

        List<TableCartItem> items = tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(table.getId());
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

        LocalDateTime now = timeService.now();
        PublicCommandeResponseDTO orderResult;
        LocalDateTime dispatchAt;

        // Check if there is an existing pending order on this table created within the 2-minute grouping grace window
        Optional<Commande> optExistingOrder = findActiveGracePeriodOrder(table, now);

        if (optExistingOrder.isPresent() && publicCommandeService != null) {
            Commande existing = optExistingOrder.get();
            orderResult = publicCommandeService.ajouterArticlesACommande(existing.getId(), orderItems);
            dispatchAt = existing.getDateCommande().plusSeconds(120);
            log.info("Merged {} items into existing pending order #{} for table {} within 2-min grace period",
                    orderItems.size(), existing.getId(), table.getId());
        } else {
            PublicCommandeRequestDTO orderRequest = new PublicCommandeRequestDTO();
            orderRequest.setTableId(table.getId());
            orderRequest.setItems(orderItems);
            orderRequest.setNotes(dto.getNotes());
            orderRequest.setSessionToken(dto.getSessionToken());

            orderResult = publicCommandeService.creerCommandePublique(orderRequest);
            dispatchAt = now.plusSeconds(120);
            log.info("Created new collaborative order #{} for table {} with 2-min grouping timer",
                    orderResult.getCommandeId(), table.getId());
        }

        tableCartItemRepository.deleteByTableId(table.getId());

        java.time.ZoneId zone = java.time.ZoneId.systemDefault();
        long diffSeconds = dispatchAt.atZone(zone).toEpochSecond() - now.atZone(zone).toEpochSecond();
        int remainingSeconds = (int) Math.max(0, diffSeconds);

        TableCartResponseDTO submittedNotification = new TableCartResponseDTO(
                table.getId(),
                "SUBMITTED",
                List.of(),
                0,
                BigDecimal.ZERO,
                orderResult.getCommandeId(),
                orderResult.getTrackingToken(),
                dto.getGuestName(),
                now,
                dispatchAt,
                remainingSeconds
        );
        broadcastCart(table.getId(), submittedNotification);
        broadcastTableOrders(table.getId());

        return orderResult;
    }

    /**
     * Finalizes the 2-minute grouping grace period immediately upon guest or host request.
     *
     * @param tableId Table identifier
     * @return Fresh open table cart state
     */
    public TableCartResponseDTO finalizeGracePeriod(Long tableId) {
        TableEntity table = resolveTable(tableId);
        LocalDateTime now = timeService.now();
        TableCartResponseDTO cart = new TableCartResponseDTO(
                table.getId(),
                "OPEN",
                List.of(),
                0,
                BigDecimal.ZERO,
                null,
                null,
                null,
                now,
                null,
                0
        );
        broadcastCart(table.getId(), cart);
        broadcastTableOrders(table.getId());
        log.info("Finalized 2-minute grouping grace period immediately for table {}", table.getId());
        return cart;
    }

    /**
     * Summarizes all active and past orders placed on a table and computes running cumulative total
     * until the table's final invoice settlement.
     *
     * @param tableId Table identifier or table number
     * @return Table orders summary DTO
     */
    @Transactional(readOnly = true)
    public TableOrdersSummaryResponseDTO getTableOrdersSummary(Long tableId) {
        TableEntity table = resolveTable(tableId);
        return doGetTableOrdersSummary(table);
    }

    /**
     * Broadcasts updated table orders summary to connected patrons.
     *
     * @param tableId Table identifier
     */
    public void broadcastTableOrders(Long tableId) {
        if (messagingTemplate != null && tableId != null) {
            try {
                TableEntity table = resolveTable(tableId);
                TableOrdersSummaryResponseDTO summary = doGetTableOrdersSummary(table);
                messagingTemplate.convertAndSend("/topic/tables/" + table.getId() + "/orders", summary);
            } catch (Exception e) {
                log.warn("Failed to broadcast table orders summary for table {}: {}", tableId, e.getMessage());
            }
        }
    }

    private TableOrdersSummaryResponseDTO doGetTableOrdersSummary(TableEntity table) {
        if (commandeRepository == null || table == null) {
            return new TableOrdersSummaryResponseDTO(table != null ? table.getId() : null,
                    table != null ? table.getNumero() : null, List.of(), BigDecimal.ZERO, 0, false, false);
        }

        List<Commande> unpaidOrders = commandeRepository.findByTable(table).stream()
                .filter(c -> c.getStatut() != CommandeStatut.REGLEE && c.getStatut() != CommandeStatut.ANNULEE)
                .sorted((c1, c2) -> {
                    if (c1.getDateCommande() == null || c2.getDateCommande() == null) {
                        return 0;
                    }
                    return c1.getDateCommande().compareTo(c2.getDateCommande());
                })
                .toList();

        List<PublicCommandeResponseDTO> orderDtos = unpaidOrders.stream()
                .map(cmd -> PublicCommandeResponseDTO.from(cmd, 10))
                .toList();

        BigDecimal cumulativeTotal = calculateCumulativeTotal(unpaidOrders);
        int totalDrinks = calculateTotalDrinks(unpaidOrders);

        boolean billRequested = tableAppelRepository != null
                && tableAppelRepository.existsByTableIdAndTypeAndStatut(table.getId(), TableAppelType.ADDITION, TableAppelStatut.EN_ATTENTE);

        return new TableOrdersSummaryResponseDTO(
                table.getId(),
                table.getNumero(),
                orderDtos,
                cumulativeTotal,
                totalDrinks,
                !unpaidOrders.isEmpty(),
                billRequested
        );
    }

    private BigDecimal calculateCumulativeTotal(List<Commande> orders) {
        BigDecimal total = BigDecimal.ZERO;
        for (Commande cmd : orders) {
            if (cmd.getTotal() != null) {
                total = total.add(cmd.getTotal());
            }
        }
        return total;
    }

    private int calculateTotalDrinks(List<Commande> orders) {
        int count = 0;
        for (Commande cmd : orders) {
            if (cmd.getItems() != null) {
                for (var item : cmd.getItems()) {
                    count += item.getQuantite();
                }
            }
        }
        return count;
    }

    private Optional<Commande> findActiveGracePeriodOrder(TableEntity table, LocalDateTime now) {
        if (commandeRepository == null || table == null) {
            return Optional.empty();
        }
        List<Commande> pending = commandeRepository.findByTableAndStatut(table, CommandeStatut.EN_ATTENTE);
        if (pending.isEmpty()) {
            return Optional.empty();
        }
        return pending.stream()
                .filter(c -> c.getDateCommande() != null && c.getDateCommande().isAfter(now.minusSeconds(120)))
                .max((c1, c2) -> c1.getDateCommande().compareTo(c2.getDateCommande()));
    }

    private TableEntity resolveTable(Long tableId) {
        if (tableId == null) {
            throw new BusinessException("Table ID cannot be null");
        }
        return tableRepository.findById(tableId)
                .or(() -> tableRepository.findByNumero(tableId.intValue()))
                .orElseThrow(() -> new ResourceNotFoundException("Table not found with id: " + tableId));
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
