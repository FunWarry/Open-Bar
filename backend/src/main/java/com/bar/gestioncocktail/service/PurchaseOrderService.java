package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service managing the complete supplier procurement lifecycle: purchase orders creation,
 * goods intake verification (Bons de Livraison), automatic stock replenishment,
 * and live Weighted Average Unit Cost (PAMP / WAC) recalculation.
 */
@Service
public class PurchaseOrderService {

    private static final MathContext MC = new MathContext(10, RoundingMode.HALF_UP);
    private static final BigDecimal DEFAULT_VAT_RATE = new BigDecimal("20.00");

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderDeliveryRepository purchaseOrderDeliveryRepository;
    private final PurchaseOrderDeliveryItemRepository purchaseOrderDeliveryItemRepository;
    private final SupplierRepository supplierRepository;
    private final IngredientRepository ingredientRepository;
    private final EstablishmentConfigService establishmentConfigService;
    private final TimeService timeService;

    /**
     * Constructs the PurchaseOrderService with required dependencies.
     *
     * @param purchaseOrderRepository             repository for orders
     * @param purchaseOrderDeliveryRepository     repository for delivery receipts
     * @param purchaseOrderDeliveryItemRepository repository for delivery items
     * @param supplierRepository                  repository for suppliers
     * @param ingredientRepository                repository for ingredients
     * @param establishmentConfigService          configuration service for capability checks
     * @param timeService                         system time provider
     */
    public PurchaseOrderService(
            PurchaseOrderRepository purchaseOrderRepository,
            PurchaseOrderDeliveryRepository purchaseOrderDeliveryRepository,
            PurchaseOrderDeliveryItemRepository purchaseOrderDeliveryItemRepository,
            SupplierRepository supplierRepository,
            IngredientRepository ingredientRepository,
            EstablishmentConfigService establishmentConfigService,
            TimeService timeService
    ) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderDeliveryRepository = purchaseOrderDeliveryRepository;
        this.purchaseOrderDeliveryItemRepository = purchaseOrderDeliveryItemRepository;
        this.supplierRepository = supplierRepository;
        this.ingredientRepository = ingredientRepository;
        this.establishmentConfigService = establishmentConfigService;
        this.timeService = timeService;
    }

    /**
     * Retrieves all purchase orders ordered by order date descending.
     *
     * @return list of purchase order DTOs
     */
    @Transactional(readOnly = true)
    public List<PurchaseOrderDTO> getAllPurchaseOrders() {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        return purchaseOrderRepository.findAllByOrderByDateCommandeDesc().stream()
                .map(PurchaseOrderDTO::from)
                .toList();
    }

    /**
     * Retrieves purchase orders filtered by lifecycle status.
     *
     * @param statut status filter
     * @return list of matching purchase order DTOs
     */
    @Transactional(readOnly = true)
    public List<PurchaseOrderDTO> getPurchaseOrdersByStatus(PurchaseOrderStatus statut) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        return purchaseOrderRepository.findByStatutOrderByDateCommandeDesc(statut).stream()
                .map(PurchaseOrderDTO::from)
                .toList();
    }

    /**
     * Retrieves a purchase order by its identifier.
     *
     * @param id purchase order ID
     * @return purchase order DTO
     * @throws ResourceNotFoundException if order does not exist
     */
    @Transactional(readOnly = true)
    public PurchaseOrderDTO getPurchaseOrderById(Long id) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        return PurchaseOrderDTO.from(findOrderEntity(id));
    }

    /**
     * Internal lookup for a purchase order entity.
     *
     * @param id purchase order identifier
     * @return purchase order entity
     * @throws ResourceNotFoundException if order does not exist
     */
    public PurchaseOrder findOrderEntity(Long id) {
        return purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with ID: " + id));
    }

    /**
     * Creates a new purchase order draft with line items and financial totals.
     *
     * @param request creation payload
     * @param user    creator user
     * @return created purchase order DTO
     */
    @Transactional
    public PurchaseOrderDTO createPurchaseOrder(PurchaseOrderCreateRequest request, User user) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        if (request == null || request.supplierId() == null) {
            throw new BusinessException("Supplier is required to create a purchase order");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new BusinessException("Purchase order must contain at least one line item");
        }

        Supplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + request.supplierId()));

        PurchaseOrder order = new PurchaseOrder();
        order.setReference(generateUniqueReference());
        order.setSupplier(supplier);
        order.setDateCommande(timeService.now());
        order.setDateLivraisonPrevue(request.dateLivraisonPrevue());
        order.setStatut(PurchaseOrderStatus.DRAFT);
        order.setNotes(request.notes());
        order.setCreatedBy(user);

        populateOrderItems(order, request.items());
        calculateTotals(order);

        PurchaseOrder saved = purchaseOrderRepository.save(order);
        return PurchaseOrderDTO.from(saved);
    }

    /**
     * Updates an existing purchase order before it is received.
     *
     * @param id      purchase order identifier
     * @param request update payload
     * @return updated purchase order DTO
     */
    @Transactional
    public PurchaseOrderDTO updatePurchaseOrder(Long id, PurchaseOrderCreateRequest request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        PurchaseOrder order = findOrderEntity(id);

        if (order.getStatut() == PurchaseOrderStatus.RECEIVED || order.getStatut() == PurchaseOrderStatus.CANCELLED) {
            throw new BusinessException("Cannot modify a purchase order in " + order.getStatut() + " status");
        }

        if (request.supplierId() != null && !request.supplierId().equals(order.getSupplier().getId())) {
            Supplier newSupplier = supplierRepository.findById(request.supplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + request.supplierId()));
            order.setSupplier(newSupplier);
        }

        order.setDateLivraisonPrevue(request.dateLivraisonPrevue());
        order.setNotes(request.notes());

        if (request.items() != null && !request.items().isEmpty()) {
            order.getItems().clear();
            populateOrderItems(order, request.items());
        }
        calculateTotals(order);

        PurchaseOrder updated = purchaseOrderRepository.save(order);
        return PurchaseOrderDTO.from(updated);
    }

    /**
     * Transmits a draft purchase order to the supplier, transitioning status to ORDERED.
     *
     * @param id purchase order identifier
     * @return updated purchase order DTO
     */
    @Transactional
    public PurchaseOrderDTO markAsOrdered(Long id) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        PurchaseOrder order = findOrderEntity(id);
        if (order.getStatut() != PurchaseOrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT purchase orders can be marked as ORDERED");
        }
        order.setStatut(PurchaseOrderStatus.ORDERED);
        return PurchaseOrderDTO.from(purchaseOrderRepository.save(order));
    }

    /**
     * Checks in incoming goods against an active purchase order.
     * Updates delivered item quantities, replenishes active stock, recalculates the Weighted Average
     * Unit Cost (PAMP / WAC), and creates an immutable audit receipt.
     *
     * @param id      purchase order identifier
     * @param request reception intake payload
     * @param user    receiving staff member
     * @return updated purchase order DTO
     */
    @Transactional
    public PurchaseOrderDTO receiveDelivery(Long id, PurchaseOrderReceptionRequest request, User user) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        PurchaseOrder order = findOrderEntity(id);

        validateOrderCanReceiveDelivery(order);
        validateReceptionRequest(request);

        LocalDateTime now = timeService.now();
        PurchaseOrderDelivery delivery = createDeliverySnapshot(order, request, user, now);

        Map<Long, PurchaseOrderItem> itemMap = buildItemMap(order);
        boolean anyReceived = processAllReceptionItems(order, request.items(), itemMap, delivery);

        if (!anyReceived) {
            throw new BusinessException("Delivery check-in must have at least one item with received quantity > 0");
        }

        purchaseOrderDeliveryRepository.save(delivery);
        updateOrderStatusAfterReception(order, now);

        PurchaseOrder updated = purchaseOrderRepository.save(order);
        return PurchaseOrderDTO.from(updated);
    }

    private void validateOrderCanReceiveDelivery(PurchaseOrder order) {
        if (order.getStatut() != PurchaseOrderStatus.ORDERED && order.getStatut() != PurchaseOrderStatus.PARTIALLY_RECEIVED) {
            throw new BusinessException("Cannot receive delivery for order in status: " + order.getStatut());
        }
    }

    private void validateReceptionRequest(PurchaseOrderReceptionRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new BusinessException("Delivery check-in must specify at least one received item");
        }
    }

    private PurchaseOrderDelivery createDeliverySnapshot(PurchaseOrder order, PurchaseOrderReceptionRequest request, User user, LocalDateTime now) {
        PurchaseOrderDelivery delivery = new PurchaseOrderDelivery();
        delivery.setPurchaseOrder(order);
        delivery.setDateReception(now);
        delivery.setBonLivraisonRef(request.bonLivraisonRef());
        delivery.setReceivedBy(user);
        delivery.setNotes(request.notes());
        return delivery;
    }

    private Map<Long, PurchaseOrderItem> buildItemMap(PurchaseOrder order) {
        Map<Long, PurchaseOrderItem> itemMap = new HashMap<>();
        for (PurchaseOrderItem poi : order.getItems()) {
            itemMap.put(poi.getId(), poi);
        }
        return itemMap;
    }

    private boolean processAllReceptionItems(
            PurchaseOrder order,
            List<PurchaseOrderReceptionItemRequest> requests,
            Map<Long, PurchaseOrderItem> itemMap,
            PurchaseOrderDelivery delivery
    ) {
        boolean anyPositive = false;
        for (PurchaseOrderReceptionItemRequest recItem : requests) {
            PurchaseOrderItem orderItem = itemMap.get(recItem.itemId());
            if (orderItem == null) {
                throw new BusinessException("Item ID " + recItem.itemId() + " does not belong to purchase order " + order.getReference());
            }

            BigDecimal qtyReceivedNow = recItem.quantiteRecue() != null ? recItem.quantiteRecue() : BigDecimal.ZERO;
            if (qtyReceivedNow.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException("Received quantity cannot be negative for item ID: " + recItem.itemId());
            }

            if (qtyReceivedNow.compareTo(BigDecimal.ZERO) > 0) {
                anyPositive = true;
                applyItemIntake(orderItem, recItem, qtyReceivedNow, order.getSupplier(), delivery);
            }
        }
        return anyPositive;
    }

    private void applyItemIntake(
            PurchaseOrderItem orderItem,
            PurchaseOrderReceptionItemRequest recItem,
            BigDecimal qtyReceivedNow,
            Supplier supplier,
            PurchaseOrderDelivery delivery
    ) {
        BigDecimal currentTotalReceived = orderItem.getQuantiteRecue() != null ? orderItem.getQuantiteRecue() : BigDecimal.ZERO;
        orderItem.setQuantiteRecue(currentTotalReceived.add(qtyReceivedNow));

        BigDecimal receivedPrice = recItem.prixUnitaireHt() != null ? recItem.prixUnitaireHt() : orderItem.getPrixUnitaireHt();
        Ingredient ingredient = orderItem.getIngredient();
        if (ingredient == null) {
            throw new BusinessException("Order item ID " + orderItem.getId() + " is missing associated ingredient");
        }

        BigDecimal capacity = resolveItemPackagingCapacity(orderItem, ingredient);
        BigDecimal qtyStockReceived = qtyReceivedNow.multiply(capacity);
        BigDecimal unitStockPrice = receivedPrice.divide(capacity, 6, RoundingMode.HALF_UP);

        BigDecimal oldStock = ingredient.getQuantiteStock() != null ? ingredient.getQuantiteStock() : BigDecimal.ZERO;
        BigDecimal oldPamp = ingredient.getPrixUnitaire();

        BigDecimal newPamp = calculateWeightedAverageCost(oldStock, oldPamp, qtyStockReceived, unitStockPrice);
        BigDecimal newStock = oldStock.add(qtyStockReceived);

        ingredient.setQuantiteStock(newStock);
        ingredient.setPrixUnitaire(newPamp);
        ingredient.setUnitCost(newPamp);
        if (ingredient.getDefaultSupplier() == null) {
            ingredient.setDefaultSupplier(supplier);
        }
        ingredientRepository.save(ingredient);

        PurchaseOrderDeliveryItem deliveryItem = new PurchaseOrderDeliveryItem();
        deliveryItem.setIngredient(ingredient);
        deliveryItem.setQuantiteRecue(qtyReceivedNow);
        deliveryItem.setPrixUnitaireHt(receivedPrice);
        deliveryItem.setAncienPamp(oldPamp);
        deliveryItem.setNouveauPamp(newPamp);
        String pUnit = (orderItem.getPurchaseUnit() != null && !orderItem.getPurchaseUnit().isBlank())
                ? orderItem.getPurchaseUnit()
                : ingredient.getEffectivePurchaseUnit();
        deliveryItem.setPurchaseUnit(pUnit);
        deliveryItem.setPackagingCapacity(capacity);
        deliveryItem.setStockQuantityReceived(qtyStockReceived);
        delivery.addItem(deliveryItem);
    }

    private void updateOrderStatusAfterReception(PurchaseOrder order, LocalDateTime now) {
        boolean allFulfilled = isOrderFullyFulfilled(order);
        if (allFulfilled) {
            order.setStatut(PurchaseOrderStatus.RECEIVED);
            order.setDateReception(now);
        } else {
            order.setStatut(PurchaseOrderStatus.PARTIALLY_RECEIVED);
        }
    }

    private boolean isOrderFullyFulfilled(PurchaseOrder order) {
        for (PurchaseOrderItem poi : order.getItems()) {
            BigDecimal ordered = poi.getQuantiteCommandee() != null ? poi.getQuantiteCommandee() : BigDecimal.ZERO;
            BigDecimal received = poi.getQuantiteRecue() != null ? poi.getQuantiteRecue() : BigDecimal.ZERO;
            if (received.compareTo(ordered) < 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Recalculates the Weighted Average Unit Cost (PAMP / WAC) formula:
     * <pre>
     * New Cost = ((Current Stock * Current Cost) + (Received Qty * Received Price)) / (Current Stock + Received Qty)
     * </pre>
     * Edge cases:
     * - If current stock &le; 0 or current cost is null/zero, new PAMP is simply the received purchase price.
     * - If received quantity &le; 0, returns the current cost.
     *
     * @param currentStock  stock quantity before intake
     * @param currentCost   unit cost before intake
     * @param receivedQty   quantity received in this delivery
     * @param receivedPrice unit purchase price agreed on this delivery
     * @return new Weighted Average Unit Cost scaled to 2 decimal places
     */
    public BigDecimal calculateWeightedAverageCost(
            BigDecimal currentStock,
            BigDecimal currentCost,
            BigDecimal receivedQty,
            BigDecimal receivedPrice
    ) {
        if (receivedPrice == null || receivedPrice.compareTo(BigDecimal.ZERO) < 0) {
            return currentCost != null ? currentCost.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (receivedQty == null || receivedQty.compareTo(BigDecimal.ZERO) <= 0) {
            return currentCost != null ? currentCost.setScale(2, RoundingMode.HALF_UP) : receivedPrice.setScale(2, RoundingMode.HALF_UP);
        }

        if (currentStock == null || currentStock.compareTo(BigDecimal.ZERO) <= 0 || currentCost == null || currentCost.compareTo(BigDecimal.ZERO) <= 0) {
            return receivedPrice.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal currentTotalValue = currentStock.multiply(currentCost, MC);
        BigDecimal receivedTotalValue = receivedQty.multiply(receivedPrice, MC);
        BigDecimal newTotalQuantity = currentStock.add(receivedQty);

        return currentTotalValue.add(receivedTotalValue)
                .divide(newTotalQuantity, 2, RoundingMode.HALF_UP);
    }

    /**
     * Cancels an order. If items were already received, generates a compensatory decrement to prevent stock inflation.
     *
     * @param id     purchase order identifier
     * @param reason cancellation memo
     * @param user   actor cancelling the order
     * @return updated purchase order DTO
     */
    @Transactional
    public PurchaseOrderDTO cancelPurchaseOrder(Long id, String reason, User user) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        PurchaseOrder order = findOrderEntity(id);

        if (order.getStatut() == PurchaseOrderStatus.CANCELLED) {
            throw new BusinessException("Purchase order is already cancelled");
        }

        revertReceivedStockIfNecessary(order);

        order.setStatut(PurchaseOrderStatus.CANCELLED);
        if (reason != null && !reason.isBlank()) {
            String currentNotes = order.getNotes() != null ? order.getNotes() + "\n" : "";
            order.setNotes(currentNotes + "[CANCELLED by " + (user != null ? user.getNom() : "system") + ": " + reason + "]");
        }

        PurchaseOrder updated = purchaseOrderRepository.save(order);
        return PurchaseOrderDTO.from(updated);
    }

    private void revertReceivedStockIfNecessary(PurchaseOrder order) {
        if (order.getStatut() != PurchaseOrderStatus.PARTIALLY_RECEIVED && order.getStatut() != PurchaseOrderStatus.RECEIVED) {
            return;
        }
        if (order.getItems() == null) {
            return;
        }

        for (PurchaseOrderItem item : order.getItems()) {
            revertItemReceivedStock(item);
        }
    }

    private void revertItemReceivedStock(PurchaseOrderItem item) {
        BigDecimal received = item.getQuantiteRecue();
        if (received == null || received.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        Ingredient ingredient = item.getIngredient();
        if (ingredient == null) {
            return;
        }

        BigDecimal capacity = resolveItemPackagingCapacity(item, ingredient);
        BigDecimal stockToRevert = received.multiply(capacity);
        BigDecimal currentStock = ingredient.getQuantiteStock() != null ? ingredient.getQuantiteStock() : BigDecimal.ZERO;
        BigDecimal revertedStock = currentStock.subtract(stockToRevert).max(BigDecimal.ZERO);

        ingredient.setQuantiteStock(revertedStock);
        ingredientRepository.save(ingredient);
    }

    private BigDecimal resolveItemPackagingCapacity(PurchaseOrderItem item, Ingredient ingredient) {
        if (item.getPackagingCapacity() != null && item.getPackagingCapacity().compareTo(BigDecimal.ZERO) > 0) {
            return item.getPackagingCapacity();
        }
        return ingredient.getEffectivePackagingCapacity();
    }

    /**
     * Retrieves historical price variations and delivery logs for all ingredients or a specific one.
     *
     * @param ingredientId optional target ingredient identifier
     * @return list of price variation DTOs
     */
    @Transactional(readOnly = true)
    public List<PriceVariationDTO> getPriceVariations(Long ingredientId) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        List<PurchaseOrderDeliveryItem> items = ingredientId != null
                ? purchaseOrderDeliveryItemRepository.findByIngredientIdOrderByDeliveryDateReceptionDesc(ingredientId)
                : purchaseOrderDeliveryItemRepository.findAllByOrderByDeliveryDateReceptionDesc();

        return items.stream()
                .map(PriceVariationDTO::from)
                .toList();
    }

    private void populateOrderItems(PurchaseOrder order, List<PurchaseOrderItemRequest> itemRequests) {
        for (PurchaseOrderItemRequest itemReq : itemRequests) {
            Ingredient ingredient = ingredientRepository.findById(itemReq.ingredientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ingredient not found with ID: " + itemReq.ingredientId()));

            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setIngredient(ingredient);
            item.setQuantiteCommandee(itemReq.quantiteCommandee());
            item.setQuantiteRecue(BigDecimal.ZERO);
            item.setPrixUnitaireHt(itemReq.prixUnitaireHt());
            item.setTauxTva(itemReq.tauxTva() != null ? itemReq.tauxTva() : DEFAULT_VAT_RATE);

            String pUnit = (itemReq.purchaseUnit() != null && !itemReq.purchaseUnit().isBlank())
                    ? itemReq.purchaseUnit()
                    : ingredient.getEffectivePurchaseUnit();
            BigDecimal capacity = (itemReq.packagingCapacity() != null && itemReq.packagingCapacity().compareTo(BigDecimal.ZERO) > 0)
                    ? itemReq.packagingCapacity()
                    : ingredient.getEffectivePackagingCapacity();
            item.setPurchaseUnit(pUnit);
            item.setPackagingCapacity(capacity);

            order.addItem(item);
        }
    }

    private void calculateTotals(PurchaseOrder order) {
        BigDecimal totalHt = BigDecimal.ZERO;
        BigDecimal totalTva = BigDecimal.ZERO;

        if (order.getItems() != null) {
            for (PurchaseOrderItem item : order.getItems()) {
                BigDecimal qty = item.getQuantiteCommandee() != null ? item.getQuantiteCommandee() : BigDecimal.ZERO;
                BigDecimal price = item.getPrixUnitaireHt() != null ? item.getPrixUnitaireHt() : BigDecimal.ZERO;
                BigDecimal lineHt = qty.multiply(price).setScale(2, RoundingMode.HALF_UP);

                BigDecimal rate = item.getTauxTva() != null ? item.getTauxTva() : DEFAULT_VAT_RATE;
                BigDecimal lineTva = lineHt.multiply(rate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
                        .setScale(2, RoundingMode.HALF_UP);

                totalHt = totalHt.add(lineHt);
                totalTva = totalTva.add(lineTva);
            }
        }

        order.setTotalHt(totalHt.setScale(2, RoundingMode.HALF_UP));
        order.setTotalTva(totalTva.setScale(2, RoundingMode.HALF_UP));
        order.setTotalTtc(totalHt.add(totalTva).setScale(2, RoundingMode.HALF_UP));
    }

    private String generateUniqueReference() {
        int year = timeService.now().getYear();
        String prefix = "BC-" + year + "-";
        long count = purchaseOrderRepository.countByReferenceStartingWith(prefix);
        long nextIndex = count + 1;
        String reference;
        do {
            reference = prefix + String.format("%04d", nextIndex++);
        } while (purchaseOrderRepository.findByReference(reference).isPresent());
        return reference;
    }
}
