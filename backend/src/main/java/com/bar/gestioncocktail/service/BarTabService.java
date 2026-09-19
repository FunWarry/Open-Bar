package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.BarTabCreateRequest;
import com.bar.gestioncocktail.dto.BarTabDetailResponseDTO;
import com.bar.gestioncocktail.dto.BarTabItemDTO;
import com.bar.gestioncocktail.dto.BarTabOrderTransferRequest;
import com.bar.gestioncocktail.dto.BarTabResponseDTO;
import com.bar.gestioncocktail.dto.BarTabTransferRequest;
import com.bar.gestioncocktail.dto.BarTabUpdateRequest;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.BarTab;
import com.bar.gestioncocktail.model.BarTabStatus;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.BarTabRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service managing customer bar tabs and running ledgers without mandatory physical table binding.
 * <p>
 * Supports tab opening, drink addition across an evening, table-to-tab and tab-to-table order transfers,
 * and real-time status updates over STOMP WebSocket.
 */
@Slf4j
@Service
public class BarTabService {

    private static final String ENTITY_BAR_TAB = "BarTab";
    private static final String NOT_FOUND_TAB_ID = "Bar tab not found with id: ";

    private final BarTabRepository barTabRepository;
    private final CommandeRepository commandeRepository;
    private final TableRepository tableRepository;
    private final CommandeService commandeService;
    private final EstablishmentConfigService establishmentConfigService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final TimeService timeService;

    /**
     * Constructs the BarTabService with required repositories and domain collaborators.
     *
     * @param barTabRepository              Repository for BarTab entity
     * @param commandeRepository            Repository for order persistence
     * @param tableRepository               Repository for floor plan tables
     * @param commandeService               Service managing order lifecycle
     * @param establishmentConfigService    Service for capability module checks
     * @param notificationService           Service for STOMP WebSocket broadcasts
     * @param auditLogService               Service for compliance audit logging
     * @param timeService                   Service providing timezone-aware clock
     */
    public BarTabService(
            BarTabRepository barTabRepository,
            CommandeRepository commandeRepository,
            TableRepository tableRepository,
            CommandeService commandeService,
            EstablishmentConfigService establishmentConfigService,
            NotificationService notificationService,
            AuditLogService auditLogService,
            TimeService timeService
    ) {
        this.barTabRepository = barTabRepository;
        this.commandeRepository = commandeRepository;
        this.tableRepository = tableRepository;
        this.commandeService = commandeService;
        this.establishmentConfigService = establishmentConfigService;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.timeService = timeService;
    }

    private void checkModuleEnabled() {
        if (establishmentConfigService != null && !establishmentConfigService.isModuleEnabled(EstablishmentModule.BAR_TABS)) {
            throw new BusinessException("The Bar Tabs module is currently disabled for this establishment.");
        }
    }

    /**
     * Creates and opens a new customer bar tab.
     *
     * @param request Creation payload
     * @param user    Authenticated waiter or bartender opening the tab
     * @return DTO representation of the newly created tab
     */
    @Transactional
    public BarTabResponseDTO createTab(BarTabCreateRequest request, User user) {
        return doCreateTab(request, user);
    }

    /**
     * Opens a new bar tab without explicit user context.
     *
     * @param request Creation payload
     * @return DTO representation of the newly created tab
     */
    @Transactional
    public BarTabResponseDTO createTab(BarTabCreateRequest request) {
        return doCreateTab(request, null);
    }

    private BarTabResponseDTO doCreateTab(BarTabCreateRequest request, User user) {
        checkModuleEnabled();
        if (request == null || request.nom() == null || request.nom().trim().isBlank()) {
            throw new BusinessException("Tab name cannot be empty.");
        }

        BarTab tab = new BarTab();
        tab.setNom(request.nom().trim());
        tab.setClientReference(request.clientReference() != null ? request.clientReference().trim() : null);
        tab.setNotes(request.notes());
        tab.setCautionMontant(request.cautionMontant() != null ? request.cautionMontant() : BigDecimal.ZERO);
        tab.setStatut(BarTabStatus.ACTIVE);
        tab.setServeur(user);
        tab.setOpenedAt(LocalDateTime.now(timeService.getZoneId()));
        tab.setTotal(BigDecimal.ZERO);

        if (request.tableOriginaleId() != null) {
            tableRepository.findById(request.tableOriginaleId()).ifPresent(tab::setTableOriginale);
        }

        BarTab saved = barTabRepository.save(tab);

        if (auditLogService != null) {
            auditLogService.logAction(user, "CREATE_TAB", ENTITY_BAR_TAB, saved.getId(), "Created bar tab: " + saved.getNom(), null);
        }

        BarTabResponseDTO responseDTO = BarTabResponseDTO.from(saved, 0, 0);
        if (notificationService != null) {
            notificationService.notifierBarTabMisAJour(responseDTO);
        }
        return responseDTO;
    }

    /**
     * Retrieves bar tabs filtered by status.
     *
     * @param statut Status to filter by
     * @return List of matching bar tab DTOs
     */
    @Transactional(readOnly = true)
    public List<BarTabResponseDTO> getTabsByStatus(BarTabStatus statut) {
        checkModuleEnabled();
        List<BarTab> tabs = barTabRepository.findByStatutOrderByIdDesc(statut);
        List<BarTabResponseDTO> dtos = new ArrayList<>();

        for (BarTab tab : tabs) {
            List<Commande> orders = filterActiveOrders(commandeRepository.findByBarTab(tab));
            dtos.add(BarTabResponseDTO.from(tab, orders.size(), computeItemsCount(orders)));
        }

        return dtos;
    }

    /**
     * Retrieves all currently active customer bar tabs with calculated order and item counts.
     *
     * @return List of active bar tab DTOs
     */
    @Transactional(readOnly = true)
    public List<BarTabResponseDTO> getActiveTabs() {
        checkModuleEnabled();
        List<BarTab> tabs = barTabRepository.findByStatutOrderByIdDesc(BarTabStatus.ACTIVE);
        List<BarTabResponseDTO> dtos = new ArrayList<>();

        for (BarTab tab : tabs) {
            List<Commande> orders = filterActiveOrders(commandeRepository.findByBarTab(tab));
            int activeOrdersCount = orders.size();
            int itemsCount = computeItemsCount(orders);
            BigDecimal total = computeOrdersTotal(orders);
            tab.setTotal(total);
            dtos.add(BarTabResponseDTO.from(tab, activeOrdersCount, itemsCount));
        }

        return dtos;
    }

    /**
     * Retrieves a single bar tab summary by its identifier.
     *
     * @param id Bar tab identifier
     * @return Summary response DTO
     */
    @Transactional(readOnly = true)
    public BarTabResponseDTO getTabById(Long id) {
        checkModuleEnabled();
        BarTab tab = barTabRepository.findDetailedById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_TAB_ID + id));

        List<Commande> orders = filterActiveOrders(commandeRepository.findByBarTab(tab));
        int activeOrdersCount = orders.size();
        int itemsCount = computeItemsCount(orders);
        tab.setTotal(computeOrdersTotal(orders));

        return BarTabResponseDTO.from(tab, activeOrdersCount, itemsCount);
    }

    /**
     * Retrieves full details for a bar tab, including active order breakdown, consolidated items, and taxes.
     *
     * @param id Bar tab identifier
     * @return Detailed bar tab DTO
     */
    @Transactional(readOnly = true)
    public BarTabDetailResponseDTO getTabDetail(Long id) {
        return doGetTabDetail(id);
    }

    /**
     * Alias for {@link #getTabDetail(Long)} to retrieve tab details.
     *
     * @param id Bar tab identifier
     * @return Detailed bar tab DTO
     */
    @Transactional(readOnly = true)
    public BarTabDetailResponseDTO getTabDetails(Long id) {
        return doGetTabDetail(id);
    }

    private BarTabDetailResponseDTO doGetTabDetail(Long id) {
        checkModuleEnabled();
        BarTab tab = barTabRepository.findDetailedById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_TAB_ID + id));

        List<Commande> activeOrders = filterActiveOrders(commandeRepository.findByBarTab(tab));
        List<BarTabItemDTO> consolidatedItems = buildConsolidatedItems(activeOrders);

        BigDecimal totalTTC = BigDecimal.ZERO;
        for (BarTabItemDTO item : consolidatedItems) {
            if (item.totalLigne() != null) {
                totalTTC = totalTTC.add(item.totalLigne());
            }
        }

        BigDecimal totalHT = totalTTC.divide(BigDecimal.valueOf(1.20), 2, RoundingMode.HALF_UP);
        BigDecimal totalVAT = totalTTC.subtract(totalHT);

        tab.setTotal(totalTTC);

        long elapsedMinutes = 0;
        if (tab.getOpenedAt() != null) {
            elapsedMinutes = Duration.between(
                    tab.getOpenedAt().atZone(timeService.getZoneId()),
                    timeService.now().atZone(timeService.getZoneId())
            ).toMinutes();
        }

        List<CommandeResponseDTO> commandeDTOs = activeOrders.stream()
                .map(CommandeResponseDTO::from)
                .toList();

        BarTabResponseDTO tabSummary = BarTabResponseDTO.from(tab, activeOrders.size(), computeItemsCount(activeOrders));
        return new BarTabDetailResponseDTO(
                tabSummary,
                commandeDTOs,
                consolidatedItems,
                totalHT,
                totalVAT,
                totalTTC,
                Math.max(0, elapsedMinutes)
        );
    }

    /**
     * Updates header metadata for an active bar tab.
     *
     * @param id      Bar tab identifier
     * @param request Update payload
     * @return Updated bar tab summary DTO
     */
    @Transactional
    public BarTabResponseDTO updateTab(Long id, BarTabUpdateRequest request) {
        checkModuleEnabled();
        BarTab tab = barTabRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_TAB_ID + id));

        if (tab.getStatut() != BarTabStatus.ACTIVE) {
            throw new BusinessException("Cannot update non-active bar tab: " + tab.getNom());
        }

        if (request.nom() != null && !request.nom().trim().isBlank()) {
            tab.setNom(request.nom().trim());
        }
        if (request.clientReference() != null) {
            tab.setClientReference(request.clientReference().trim());
        }
        if (request.notes() != null) {
            tab.setNotes(request.notes());
        }
        if (request.cautionMontant() != null) {
            tab.setCautionMontant(request.cautionMontant());
        }
        if (request.tableOriginaleId() != null) {
            if (request.tableOriginaleId() <= 0) {
                tab.setTableOriginale(null);
            } else {
                TableEntity table = tableRepository.findById(request.tableOriginaleId())
                        .orElseThrow(() -> new ResourceNotFoundException("Table not found with id: " + request.tableOriginaleId()));
                tab.setTableOriginale(table);
            }
        }

        BarTab saved = barTabRepository.save(tab);
        List<Commande> activeOrders = filterActiveOrders(commandeRepository.findByBarTab(saved));
        BarTabResponseDTO responseDTO = BarTabResponseDTO.from(saved, activeOrders.size(), computeItemsCount(activeOrders));

        if (notificationService != null) {
            notificationService.notifierBarTabMisAJour(responseDTO);
        }
        return responseDTO;
    }

    /**
     * Adds a newly placed order directly to a customer bar tab.
     *
     * @param tabId    Target bar tab identifier
     * @param commande Order entity containing ordered items
     * @param user     Authenticated server or bartender placing the order
     * @return Response DTO of the created order
     */
    @Transactional
    public CommandeResponseDTO addOrderToTab(Long tabId, Commande commande, User user) {
        return doAddOrderToTab(tabId, commande, user);
    }

    /**
     * Adds an order defined by a request DTO directly to a customer bar tab.
     *
     * @param tabId   Target bar tab identifier
     * @param request Order creation request DTO
     * @return Response DTO of the created order
     */
    @Transactional
    public CommandeResponseDTO addOrderToTab(Long tabId, CommandeRequestDTO request) {
        return doAddOrderToTab(tabId, request.toEntity(), null);
    }

    private CommandeResponseDTO doAddOrderToTab(Long tabId, Commande commande, User user) {
        checkModuleEnabled();
        BarTab tab = barTabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_TAB_ID + tabId));

        if (tab.getStatut() != BarTabStatus.ACTIVE) {
            throw new BusinessException("Cannot add orders to non-active bar tab: " + tab.getNom());
        }

        commande.setTable(tab.getTableOriginale());
        commande.setBarTab(tab);
        if (commande.getServeur() == null) {
            commande.setServeur(user != null ? user : tab.getServeur());
        }

        Commande created = commandeService.createCommande(commande);

        List<Commande> activeOrders = filterActiveOrders(commandeRepository.findByBarTab(tab));
        BigDecimal newTotal = computeOrdersTotal(activeOrders);
        tab.setTotal(newTotal);
        barTabRepository.save(tab);

        if (notificationService != null) {
            notificationService.notifierBarTabMisAJour(BarTabResponseDTO.from(tab, activeOrders.size(), computeItemsCount(activeOrders)));
        }

        return CommandeResponseDTO.from(created);
    }

    /**
     * Transfers active unbilled orders from a physical table to a customer bar tab.
     *
     * @param tableId      Source table identifier
     * @param tabId        Target bar tab identifier
     * @param releaseTable Whether the physical table should be released upon transferring orders
     * @return Updated target bar tab response DTO
     */
    @Transactional
    public BarTabResponseDTO transferTableOrdersToTab(Long tableId, Long tabId, boolean releaseTable) {
        return doTransferTableOrdersToTab(tableId, tabId, releaseTable);
    }

    /**
     * Transfers active table orders into the bar tab using a transfer request DTO.
     *
     * @param tabId   Target bar tab identifier
     * @param request Transfer request parameters
     * @return Updated bar tab response DTO
     */
    @Transactional
    public BarTabResponseDTO transferOrdersFromTable(Long tabId, BarTabTransferRequest request) {
        return doTransferTableOrdersToTab(request.tableId(), tabId, request.releaseTable());
    }

    private BarTabResponseDTO doTransferTableOrdersToTab(Long tableId, Long tabId, boolean releaseTable) {
        checkModuleEnabled();
        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Table not found with id: " + tableId));
        BarTab tab = barTabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_TAB_ID + tabId));

        if (tab.getStatut() != BarTabStatus.ACTIVE) {
            throw new BusinessException("Target bar tab is not active: " + tab.getNom());
        }

        List<Commande> activeTableOrders = filterActiveOrders(commandeRepository.findByTable(table));
        if (activeTableOrders.isEmpty()) {
            throw new BusinessException("No active orders found on table " + table.getNumero() + " to transfer.");
        }

        for (Commande order : activeTableOrders) {
            order.setTable(null);
            order.setBarTab(tab);
            commandeRepository.save(order);
        }

        if (releaseTable) {
            table.setOccupee(false);
            table.setDateOccupation(null);
            table.setDateLiberation(LocalDateTime.now(timeService.getZoneId()));
            tableRepository.save(table);
            if (notificationService != null) {
                notificationService.notifierChangementTable(table);
            }
        }

        List<Commande> allTabOrders = filterActiveOrders(commandeRepository.findByBarTab(tab));
        tab.setTotal(computeOrdersTotal(allTabOrders));
        BarTab savedTab = barTabRepository.save(tab);

        if (auditLogService != null) {
            auditLogService.logAction(null, "TRANSFER_TABLE_TO_TAB", ENTITY_BAR_TAB, tab.getId(),
                    "Transferred " + activeTableOrders.size() + " orders from table " + table.getNumero() + " to tab " + tab.getNom(), null);
        }

        BarTabResponseDTO responseDTO = BarTabResponseDTO.from(savedTab, allTabOrders.size(), computeItemsCount(allTabOrders));
        if (notificationService != null) {
            notificationService.notifierBarTabMisAJour(responseDTO);
        }
        return responseDTO;
    }

    /**
     * Transfers active unbilled orders from a bar tab to a physical floor plan table.
     *
     * @param tabId         Source bar tab identifier
     * @param targetTableId Target table identifier
     * @return Updated source bar tab response DTO marked as TRANSFERRED
     */
    @Transactional
    public BarTabResponseDTO transferTabOrdersToTable(Long tabId, Long targetTableId) {
        return doTransferTabOrdersToTable(tabId, targetTableId);
    }

    /**
     * Transfers active bar tab orders to a physical table using a transfer request DTO.
     *
     * @param tabId   Source bar tab identifier
     * @param request Transfer request parameters
     * @return Updated bar tab response DTO
     */
    @Transactional
    public BarTabResponseDTO transferTabToTable(Long tabId, BarTabTransferRequest request) {
        return doTransferTabOrdersToTable(tabId, request.tableId());
    }

    private BarTabResponseDTO doTransferTabOrdersToTable(Long tabId, Long targetTableId) {
        checkModuleEnabled();
        BarTab tab = barTabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_TAB_ID + tabId));
        TableEntity targetTable = tableRepository.findById(targetTableId)
                .orElseThrow(() -> new ResourceNotFoundException("Target table not found with id: " + targetTableId));

        if (tab.getStatut() != BarTabStatus.ACTIVE) {
            throw new BusinessException("Source bar tab is not active: " + tab.getNom());
        }

        List<Commande> activeTabOrders = filterActiveOrders(commandeRepository.findByBarTab(tab));
        if (activeTabOrders.isEmpty()) {
            throw new BusinessException("No active orders found on bar tab " + tab.getNom() + " to transfer.");
        }

        for (Commande order : activeTabOrders) {
            order.setBarTab(null);
            order.setTable(targetTable);
            commandeRepository.save(order);
        }

        if (!targetTable.isOccupee()) {
            targetTable.setOccupee(true);
            targetTable.setDateOccupation(LocalDateTime.now(timeService.getZoneId()));
            if (tab.getServeur() != null) {
                targetTable.setServeurId(tab.getServeur().getId());
            }
            tableRepository.save(targetTable);
            if (notificationService != null) {
                notificationService.notifierChangementTable(targetTable);
            }
        }

        tab.setStatut(BarTabStatus.TRANSFERRED);
        tab.setSettledAt(LocalDateTime.now(timeService.getZoneId()));
        tab.setTotal(BigDecimal.ZERO);
        BarTab savedTab = barTabRepository.save(tab);

        if (auditLogService != null) {
            auditLogService.logAction(null, "TRANSFER_TAB_TO_TABLE", ENTITY_BAR_TAB, tab.getId(),
                    "Transferred " + activeTabOrders.size() + " orders from tab " + tab.getNom() + " to table " + targetTable.getNumero(), null);
        }

        BarTabResponseDTO responseDTO = BarTabResponseDTO.from(savedTab, 0, 0);
        if (notificationService != null) {
            notificationService.notifierBarTabMisAJour(responseDTO);
        }
        return responseDTO;
    }

    /**
     * Transfers a single order between a bar tab and another destination.
     *
     * @param tabId   Bar tab identifier
     * @param request Single order transfer request
     * @return Updated bar tab response DTO
     */
    @Transactional
    public BarTabResponseDTO transferSingleOrder(Long tabId, BarTabOrderTransferRequest request) {
        checkModuleEnabled();
        BarTab tab = barTabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_TAB_ID + tabId));

        List<Long> cmdIds;
        if (request.commandeIds() != null && !request.commandeIds().isEmpty()) {
            cmdIds = request.commandeIds();
        } else if (request.commandeId() != null) {
            cmdIds = List.of(request.commandeId());
        } else {
            cmdIds = Collections.emptyList();
        }

        if (cmdIds.isEmpty()) {
            throw new BusinessException("No order IDs provided for transfer.");
        }

        for (Long cmdId : cmdIds) {
            Commande order = commandeRepository.findById(cmdId)
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + cmdId));

            if (request.targetTableId() != null) {
                TableEntity table = tableRepository.findById(request.targetTableId())
                        .orElseThrow(() -> new ResourceNotFoundException("Target table not found with id: " + request.targetTableId()));
                order.setBarTab(null);
                order.setTable(table);
                if (!table.isOccupee()) {
                    table.setOccupee(true);
                    table.setDateOccupation(LocalDateTime.now(timeService.getZoneId()));
                    tableRepository.save(table);
                }
            } else if (request.targetTabId() != null) {
                BarTab targetTab = barTabRepository.findById(request.targetTabId())
                        .orElseThrow(() -> new ResourceNotFoundException("Target bar tab not found with id: " + request.targetTabId()));
                order.setTable(null);
                order.setBarTab(targetTab);
            } else {
                order.setTable(null);
                order.setBarTab(tab);
            }

            commandeRepository.save(order);
        }

        List<Commande> activeOrders = filterActiveOrders(commandeRepository.findByBarTab(tab));
        tab.setTotal(computeOrdersTotal(activeOrders));
        BarTab saved = barTabRepository.save(tab);

        BarTabResponseDTO dto = BarTabResponseDTO.from(saved, activeOrders.size(), computeItemsCount(activeOrders));
        if (notificationService != null) {
            notificationService.notifierBarTabMisAJour(dto);
        }
        return dto;
    }

    /**
     * Cancels an empty or voided bar tab.
     *
     * @param tabId Bar tab identifier
     * @return Updated bar tab response DTO marked as CANCELLED
     */
    @Transactional
    public BarTabResponseDTO cancelTab(Long tabId) {
        return doCancelTab(tabId, null);
    }

    /**
     * Cancels an empty or voided bar tab with a specified reason.
     *
     * @param tabId  Bar tab identifier
     * @param reason Optional cancellation reason
     * @return Updated bar tab response DTO marked as CANCELLED
     */
    @Transactional
    public BarTabResponseDTO cancelTab(Long tabId, String reason) {
        return doCancelTab(tabId, reason);
    }

    private BarTabResponseDTO doCancelTab(Long tabId, String reason) {
        checkModuleEnabled();
        BarTab tab = barTabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_TAB_ID + tabId));

        List<Commande> activeOrders = filterActiveOrders(commandeRepository.findByBarTab(tab));
        if (!activeOrders.isEmpty()) {
            throw new BusinessException("Cannot cancel bar tab with active unbilled orders. Please settle or cancel orders first.");
        }

        tab.setStatut(BarTabStatus.CANCELLED);
        tab.setSettledAt(LocalDateTime.now(timeService.getZoneId()));
        if (reason != null && !reason.isBlank()) {
            String updatedNotes = tab.getNotes() != null ? tab.getNotes() + " | Cancellation: " + reason : "Cancellation: " + reason;
            tab.setNotes(updatedNotes);
        }
        BarTab saved = barTabRepository.save(tab);

        BarTabResponseDTO responseDTO = BarTabResponseDTO.from(saved, 0, 0);
        if (notificationService != null) {
            notificationService.notifierBarTabMisAJour(responseDTO);
        }
        return responseDTO;
    }

    private List<Commande> filterActiveOrders(List<Commande> orders) {
        if (orders == null) {
            return Collections.emptyList();
        }
        return orders.stream()
                .filter(c -> c.getStatut() != CommandeStatut.REGLEE && c.getStatut() != CommandeStatut.ANNULEE)
                .toList();
    }

    private int computeItemsCount(List<Commande> orders) {
        int sum = 0;
        for (Commande order : orders) {
            if (order.getItems() != null) {
                for (CommandeItem item : order.getItems()) {
                    sum += item.getQuantite();
                }
            }
        }
        return sum;
    }

    private BigDecimal computeOrdersTotal(List<Commande> orders) {
        BigDecimal total = BigDecimal.ZERO;
        for (Commande order : orders) {
            if (order.getTotal() != null) {
                total = total.add(order.getTotal());
            }
        }
        return total;
    }

    private List<BarTabItemDTO> buildConsolidatedItems(List<Commande> orders) {
        Map<String, BarTabItemAccumulator> map = new LinkedHashMap<>();
        for (Commande order : orders) {
            consolidateOrderItems(order, map);
        }
        List<BarTabItemDTO> items = new ArrayList<>(map.size());
        for (BarTabItemAccumulator accumulator : map.values()) {
            items.add(accumulator.toDTO());
        }
        return items;
    }

    private void consolidateOrderItems(Commande order, Map<String, BarTabItemAccumulator> map) {
        if (order.getItems() == null) {
            return;
        }
        for (CommandeItem item : order.getItems()) {
            accumulateItem(item, map);
        }
    }

    private void accumulateItem(CommandeItem item, Map<String, BarTabItemAccumulator> map) {
        Long cId = item.getCocktail() != null ? item.getCocktail().getId() : null;
        String cNom = item.getCocktail() != null ? item.getCocktail().getNom() : "Article";
        Long vId = item.getVariante() != null ? item.getVariante().getId() : null;
        String vNom = item.getVariante() != null ? item.getVariante().getNom() : null;
        BigDecimal price = item.getPrixUnitaire() != null ? item.getPrixUnitaire() : BigDecimal.ZERO;
        String notes = item.getNotes() != null ? item.getNotes().trim() : "";

        String key = cId + "_" + vId + "_" + price + "_" + notes;
        map.computeIfAbsent(key, k -> new BarTabItemAccumulator(cId, cNom, vId, vNom, price, notes))
           .addQuantity(item.getQuantite());
    }

    private static class BarTabItemAccumulator {
        private final Long cocktailId;
        private final String cocktailNom;
        private final Long varianteId;
        private final String varianteNom;
        private final BigDecimal prixUnitaire;
        private final String notes;
        private int quantite;

        public BarTabItemAccumulator(Long cocktailId, String cocktailNom, Long varianteId, String varianteNom, BigDecimal prixUnitaire, String notes) {
            this.cocktailId = cocktailId;
            this.cocktailNom = cocktailNom;
            this.varianteId = varianteId;
            this.varianteNom = varianteNom;
            this.prixUnitaire = prixUnitaire;
            this.notes = notes;
            this.quantite = 0;
        }

        public void addQuantity(int q) {
            this.quantite += q;
        }

        public BarTabItemDTO toDTO() {
            BigDecimal totalLigne = prixUnitaire.multiply(BigDecimal.valueOf(quantite));
            return new BarTabItemDTO(
                    cocktailId,
                    cocktailNom,
                    varianteId,
                    varianteNom,
                    quantite,
                    prixUnitaire,
                    totalLigne,
                    notes.isBlank() ? null : notes
            );
        }
    }
}
