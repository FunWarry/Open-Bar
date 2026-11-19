package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service managing automated matching and reconciliation between digital supplier invoices,
 * active purchase orders, delivery receipts (Bons de Livraison), and catalog inventory.
 * Triggers automated stock intakes and Weighted Average Unit Cost (PAMP/WAC) recalculations.
 */
@Service
public class InvoiceReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceReconciliationService.class);
    private static final BigDecimal TOLERANCE_PRICE = new BigDecimal("0.02");
    private static final String RESOURCE_SUPPLIER_INVOICE = "SupplierInvoice";

    private final SupplierInvoiceRepository supplierInvoiceRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderDeliveryRepository purchaseOrderDeliveryRepository;
    private final IngredientRepository ingredientRepository;
    private final PurchaseOrderService purchaseOrderService;
    private final EstablishmentConfigService establishmentConfigService;
    private final TimeService timeService;

    /**
     * Constructs the InvoiceReconciliationService with required repositories and services.
     *
     * @param supplierInvoiceRepository        repository for supplier invoices
     * @param purchaseOrderRepository          repository for purchase orders
     * @param purchaseOrderDeliveryRepository  repository for delivery intakes
     * @param ingredientRepository             repository for ingredients
     * @param purchaseOrderService             service for WAC recalculation
     * @param establishmentConfigService       service for checking modular capability flags
     * @param timeService                      system time service
     */
    public InvoiceReconciliationService(
            SupplierInvoiceRepository supplierInvoiceRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            PurchaseOrderDeliveryRepository purchaseOrderDeliveryRepository,
            IngredientRepository ingredientRepository,
            PurchaseOrderService purchaseOrderService,
            EstablishmentConfigService establishmentConfigService,
            TimeService timeService
    ) {
        this.supplierInvoiceRepository = supplierInvoiceRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderDeliveryRepository = purchaseOrderDeliveryRepository;
        this.ingredientRepository = ingredientRepository;
        this.purchaseOrderService = purchaseOrderService;
        this.establishmentConfigService = establishmentConfigService;
        this.timeService = timeService;
    }

    /**
     * Generates a preview comparison diff between an invoice and candidate/associated purchase orders.
     *
     * @param invoiceId       identifier of the invoice
     * @param purchaseOrderId optional target purchase order to compare against (defaults to linked or candidate)
     * @return populated {@link SupplierInvoiceReconciliationDTO} diff snapshot
     */
    @Transactional(readOnly = true)
    public SupplierInvoiceReconciliationDTO getReconciliationPreview(Long invoiceId, Long purchaseOrderId) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.FACTUR_X_INVOICE_IMPORT);

        SupplierInvoice invoice = findInvoiceEntity(invoiceId);
        List<PurchaseOrder> candidateOrders = findCandidateOrders(invoice);

        PurchaseOrder selectedOrder = resolveSelectedOrder(invoice, candidateOrders, purchaseOrderId);
        List<ReconciliationLineDiffDTO> lines = buildReconciliationLines(invoice, selectedOrder);

        BigDecimal orderedTotal = selectedOrder != null && selectedOrder.getTotalHt() != null
                ? selectedOrder.getTotalHt()
                : BigDecimal.ZERO;
        BigDecimal diffTotal = invoice.getTotalHt().subtract(orderedTotal);

        boolean hasBlockingErrors = lines.stream().anyMatch(l ->
                l.status() == InvoiceItemReconciliationStatus.UNRECOGNIZED_INGREDIENT);

        List<String> warnings = buildReconciliationWarnings(lines);
        List<PurchaseOrderDTO> candidateDtos = candidateOrders.stream().map(PurchaseOrderDTO::from).toList();

        return new SupplierInvoiceReconciliationDTO(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getSupplier() != null ? invoice.getSupplier().getId() : null,
                invoice.getSupplier() != null ? invoice.getSupplier().getNom() : invoice.getSupplierNameRaw(),
                selectedOrder != null ? selectedOrder.getId() : null,
                selectedOrder != null ? selectedOrder.getReference() : null,
                selectedOrder != null ? selectedOrder.getStatut() : null,
                invoice.getTotalHt(),
                orderedTotal,
                diffTotal,
                invoice.getStatus(),
                candidateDtos,
                lines,
                !hasBlockingErrors,
                warnings
        );
    }

    private PurchaseOrder resolveSelectedOrder(SupplierInvoice invoice, List<PurchaseOrder> candidateOrders, Long purchaseOrderId) {
        if (purchaseOrderId != null) {
            return purchaseOrderRepository.findById(purchaseOrderId).orElse(null);
        } else if (invoice.getPurchaseOrder() != null) {
            return invoice.getPurchaseOrder();
        } else if (!candidateOrders.isEmpty()) {
            return candidateOrders.getFirst();
        }
        return null;
    }

    private List<String> buildReconciliationWarnings(List<ReconciliationLineDiffDTO> lines) {
        List<String> warnings = new ArrayList<>();
        long priceVariances = lines.stream().filter(l -> l.status() == InvoiceItemReconciliationStatus.PRICE_VARIANCE).count();
        if (priceVariances > 0) {
            warnings.add(priceVariances + " line(s) have unit price discrepancies against the purchase order.");
        }
        long unexpected = lines.stream().filter(l -> l.status() == InvoiceItemReconciliationStatus.UNEXPECTED_ITEM).count();
        if (unexpected > 0) {
            warnings.add(unexpected + " invoiced item(s) were not part of the original order.");
        }
        return warnings;
    }

    private List<PurchaseOrder> findCandidateOrders(SupplierInvoice invoice) {
        if (invoice.getSupplier() == null) {
            return Collections.emptyList();
        }

        List<PurchaseOrder> orders = purchaseOrderRepository.findBySupplierIdOrderByDateCommandeDesc(invoice.getSupplier().getId());
        List<PurchaseOrder> openOrders = new ArrayList<>();

        if (invoice.getOrderReference() != null && !invoice.getOrderReference().isBlank()) {
            for (PurchaseOrder po : orders) {
                if (po.getReference().equalsIgnoreCase(invoice.getOrderReference().trim())) {
                    openOrders.add(0, po);
                    return openOrders;
                }
            }
        }

        for (PurchaseOrder po : orders) {
            if (po.getStatut() == PurchaseOrderStatus.ORDERED || po.getStatut() == PurchaseOrderStatus.PARTIALLY_RECEIVED || po.getStatut() == PurchaseOrderStatus.DRAFT) {
                openOrders.add(po);
            }
        }
        return openOrders;
    }

    private List<ReconciliationLineDiffDTO> buildReconciliationLines(SupplierInvoice invoice, PurchaseOrder order) {
        List<ReconciliationLineDiffDTO> diffs = new ArrayList<>();
        Map<Long, PurchaseOrderItem> poItemsByIngredient = mapPoItemsByIngredient(order);
        Set<Long> matchedPoItemIds = new HashSet<>();

        for (SupplierInvoiceItem item : invoice.getItems()) {
            Ingredient ing = item.getMatchedIngredient();
            PurchaseOrderItem matchedPoi = null;
            if (ing != null && poItemsByIngredient.containsKey(ing.getId())) {
                matchedPoi = poItemsByIngredient.get(ing.getId());
                matchedPoItemIds.add(matchedPoi.getId());
            }
            diffs.add(buildItemDiff(item, ing, order, matchedPoi));
        }

        if (order != null && order.getItems() != null) {
            for (PurchaseOrderItem poi : order.getItems()) {
                if (!matchedPoItemIds.contains(poi.getId())) {
                    diffs.add(buildMissingOrderedDiff(poi));
                }
            }
        }

        return diffs;
    }

    private Map<Long, PurchaseOrderItem> mapPoItemsByIngredient(PurchaseOrder order) {
        Map<Long, PurchaseOrderItem> map = new HashMap<>();
        if (order != null && order.getItems() != null) {
            for (PurchaseOrderItem poi : order.getItems()) {
                if (poi.getIngredient() != null) {
                    map.put(poi.getIngredient().getId(), poi);
                }
            }
        }
        return map;
    }

    private ReconciliationLineDiffDTO buildItemDiff(SupplierInvoiceItem item, Ingredient ing, PurchaseOrder order, PurchaseOrderItem matchedPoi) {
        BigDecimal qtyOrdered = matchedPoi != null ? matchedPoi.getQuantiteCommandee() : BigDecimal.ZERO;
        BigDecimal qtyDelivered = matchedPoi != null && matchedPoi.getQuantiteRecue() != null ? matchedPoi.getQuantiteRecue() : BigDecimal.ZERO;
        BigDecimal qtyDiff = item.getQuantityInvoiced().subtract(qtyOrdered);

        BigDecimal priceOrdered = matchedPoi != null ? matchedPoi.getPrixUnitaireHt() : BigDecimal.ZERO;
        BigDecimal priceDiff = item.getUnitPriceHt().subtract(priceOrdered);
        BigDecimal priceDiffPct = BigDecimal.ZERO;
        if (priceOrdered.compareTo(BigDecimal.ZERO) > 0) {
            priceDiffPct = priceDiff.divide(priceOrdered, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
        }

        InvoiceItemReconciliationStatus status;
        String varDetail;

        if (ing == null) {
            status = InvoiceItemReconciliationStatus.UNRECOGNIZED_INGREDIENT;
            varDetail = "Ingredient not recognized in catalog";
        } else if (order == null || matchedPoi == null) {
            status = InvoiceItemReconciliationStatus.UNEXPECTED_ITEM;
            varDetail = "Invoiced product was not in the selected purchase order";
        } else if (priceDiff.abs().compareTo(TOLERANCE_PRICE) > 0) {
            status = InvoiceItemReconciliationStatus.PRICE_VARIANCE;
            varDetail = String.format("Price variance: %+.2f€ (%+.1f%%)", priceDiff, priceDiffPct);
        } else if (qtyDiff.compareTo(BigDecimal.ZERO) != 0) {
            status = InvoiceItemReconciliationStatus.QUANTITY_VARIANCE;
            varDetail = String.format("Quantity variance: %+.2f", qtyDiff);
        } else {
            status = InvoiceItemReconciliationStatus.MATCHED;
            varDetail = "Conforming to purchase order";
        }

        return new ReconciliationLineDiffDTO(
                item.getId(),
                item.getLineNumber(),
                item.getDesignation(),
                item.getProductReference(),
                item.getPackaging(),
                item.getQuantityInvoiced(),
                qtyOrdered,
                qtyDelivered,
                qtyDiff,
                item.getUnitPriceHt(),
                priceOrdered,
                priceDiff,
                priceDiffPct,
                status,
                ing != null ? ing.getId() : null,
                ing != null ? ing.getNom() : null,
                matchedPoi != null ? matchedPoi.getId() : null,
                ing == null,
                varDetail
        );
    }

    private ReconciliationLineDiffDTO buildMissingOrderedDiff(PurchaseOrderItem poi) {
        return new ReconciliationLineDiffDTO(
                null,
                null,
                poi.getIngredient() != null ? poi.getIngredient().getNom() : "Missing Ordered Item",
                null,
                poi.getPurchaseUnit(),
                BigDecimal.ZERO,
                poi.getQuantiteCommandee(),
                poi.getQuantiteRecue(),
                poi.getQuantiteCommandee().negate(),
                BigDecimal.ZERO,
                poi.getPrixUnitaireHt(),
                poi.getPrixUnitaireHt().negate(),
                new BigDecimal("-100.00"),
                InvoiceItemReconciliationStatus.MISSING_ORDER_ITEM,
                poi.getIngredient() != null ? poi.getIngredient().getId() : null,
                poi.getIngredient() != null ? poi.getIngredient().getNom() : null,
                poi.getId(),
                false,
                "Item ordered but omitted from supplier invoice"
        );
    }

    /**
     * Reconciles invoice line items, mapping manual ingredient adjustments and linking purchase orders.
     *
     * @param invoiceId invoice identifier
     * @param request   reconciliation adjustments payload
     * @param user      acting manager
     * @return updated supplier invoice DTO
     */
    @Transactional
    public SupplierInvoiceDTO reconcileInvoice(Long invoiceId, SupplierInvoiceReconcileRequest request, User user) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.FACTUR_X_INVOICE_IMPORT);

        SupplierInvoice invoice = findInvoiceEntity(invoiceId);

        if (invoice.getStatus() == SupplierInvoiceStatus.APPLIED) {
            throw new BusinessException("Cannot modify an invoice that has already been applied into inventory");
        }

        linkPurchaseOrderIfRequested(invoice, request);
        if (request != null && request.reconciliationNotes() != null) {
            invoice.setReconciliationNotes(request.reconciliationNotes());
        }

        boolean hasVariances = applyAdjustments(invoice, request);

        invoice.setStatus(hasVariances ? SupplierInvoiceStatus.DISCREPANCY_CONFIRMED : SupplierInvoiceStatus.RECONCILED);
        invoice.setReviewedBy(user);
        invoice.setReviewedAt(timeService.now());

        SupplierInvoice saved = supplierInvoiceRepository.save(invoice);
        return SupplierInvoiceDTO.from(saved);
    }

    private void linkPurchaseOrderIfRequested(SupplierInvoice invoice, SupplierInvoiceReconcileRequest request) {
        if (request != null && request.purchaseOrderId() != null) {
            PurchaseOrder po = purchaseOrderRepository.findById(request.purchaseOrderId())
                    .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", request.purchaseOrderId()));
            invoice.setPurchaseOrder(po);
            if (invoice.getSupplier() == null && po.getSupplier() != null) {
                invoice.setSupplier(po.getSupplier());
            }
        }
    }

    private boolean applyAdjustments(SupplierInvoice invoice, SupplierInvoiceReconcileRequest request) {
        if (request == null || request.itemAdjustments() == null) {
            return false;
        }

        Map<Long, SupplierInvoiceItemReconcileAdjustment> adjMap = new HashMap<>();
        for (SupplierInvoiceItemReconcileAdjustment adj : request.itemAdjustments()) {
            adjMap.put(adj.itemId(), adj);
        }

        boolean hasVariances = false;
        for (SupplierInvoiceItem item : invoice.getItems()) {
            SupplierInvoiceItemReconcileAdjustment adj = adjMap.get(item.getId());
            if (adj != null) {
                applySingleItemAdjustment(item, adj);
            }
            if (item.getMatchedIngredient() == null) {
                hasVariances = true;
            }
        }
        return hasVariances;
    }

    private void applySingleItemAdjustment(SupplierInvoiceItem item, SupplierInvoiceItemReconcileAdjustment adj) {
        if (adj.matchedIngredientId() != null) {
            Ingredient ing = ingredientRepository.findById(adj.matchedIngredientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ingredient", "id", adj.matchedIngredientId()));
            item.setMatchedIngredient(ing);
        }
        if (adj.effectiveReceivedQuantity() != null) {
            item.setEffectiveReceivedQuantity(adj.effectiveReceivedQuantity());
        }
        if (adj.effectiveUnitPriceHt() != null) {
            item.setEffectiveUnitPriceHt(adj.effectiveUnitPriceHt());
        }
        if (adj.packagingCapacity() != null) {
            item.setSuggestedPackagingCapacity(adj.packagingCapacity());
        }
    }

    /**
     * Applies the validated supplier invoice into the inventory:
     * generates delivery receipts, replenishes stock quantities, and recalculates PAMP/WAC.
     *
     * @param invoiceId invoice identifier
     * @param user      acting manager
     * @return updated supplier invoice DTO
     */
    @Transactional
    public SupplierInvoiceDTO applyInvoice(Long invoiceId, User user) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.FACTUR_X_INVOICE_IMPORT);

        SupplierInvoice invoice = findInvoiceEntity(invoiceId);

        if (invoice.getStatus() == SupplierInvoiceStatus.APPLIED) {
            throw new BusinessException("Invoice " + invoice.getInvoiceNumber() + " has already been applied into inventory");
        }

        validateAllItemsMapped(invoice);

        LocalDateTime now = timeService.now();
        PurchaseOrder order = invoice.getPurchaseOrder();
        if (order == null) {
            order = createAutomatedPurchaseOrderFromInvoice(invoice, user, now);
            invoice.setPurchaseOrder(order);
        }

        PurchaseOrderDelivery delivery = createDeliveryHeader(invoice, order, user, now);
        Map<Long, PurchaseOrderItem> poItemsByIngredient = mapPoItemsByIngredient(order);

        for (SupplierInvoiceItem item : invoice.getItems()) {
            applyItemStockAndDelivery(item, delivery, invoice.getSupplier(), poItemsByIngredient);
        }

        purchaseOrderDeliveryRepository.save(delivery);
        updateOrderStatusAfterDelivery(order);

        invoice.setStatus(SupplierInvoiceStatus.APPLIED);
        invoice.setDelivery(delivery);
        invoice.setReviewedBy(user);
        invoice.setReviewedAt(now);

        SupplierInvoice updated = supplierInvoiceRepository.save(invoice);
        log.info("Supplier invoice {} applied into stock: delivery ID {}, order ID {}", invoice.getInvoiceNumber(), delivery.getId(), order.getId());

        return SupplierInvoiceDTO.from(updated);
    }

    private void validateAllItemsMapped(SupplierInvoice invoice) {
        for (SupplierInvoiceItem item : invoice.getItems()) {
            if (item.getMatchedIngredient() == null) {
                throw new BusinessException("Cannot apply invoice: line #" + item.getLineNumber() + " ('" + item.getDesignation() + "') must be mapped to an ingredient");
            }
        }
    }

    private PurchaseOrderDelivery createDeliveryHeader(SupplierInvoice invoice, PurchaseOrder order, User user, LocalDateTime now) {
        PurchaseOrderDelivery delivery = new PurchaseOrderDelivery();
        delivery.setPurchaseOrder(order);
        delivery.setDateReception(now);
        String blRef = invoice.getDeliveryNoteReference() != null && !invoice.getDeliveryNoteReference().isBlank()
                ? invoice.getDeliveryNoteReference()
                : invoice.getInvoiceNumber();
        delivery.setBonLivraisonRef(blRef);
        delivery.setReceivedBy(user);
        delivery.setNotes("Automated intake from supplier invoice " + invoice.getInvoiceNumber());
        return delivery;
    }

    private void applyItemStockAndDelivery(SupplierInvoiceItem item, PurchaseOrderDelivery delivery, Supplier supplier, Map<Long, PurchaseOrderItem> poItemsByIngredient) {
        Ingredient ingredient = item.getMatchedIngredient();
        BigDecimal receivedQty = item.getEffectiveReceivedQuantity();
        BigDecimal receivedPrice = item.getEffectiveUnitPriceHt();
        BigDecimal capacity = item.getSuggestedPackagingCapacity() != null ? item.getSuggestedPackagingCapacity() : BigDecimal.ONE;

        BigDecimal qtyStockReceived = receivedQty.multiply(capacity);
        BigDecimal unitStockPrice = receivedPrice.divide(capacity, 6, RoundingMode.HALF_UP);

        BigDecimal oldStock = ingredient.getQuantiteStock() != null ? ingredient.getQuantiteStock() : BigDecimal.ZERO;
        BigDecimal oldPamp = ingredient.getPrixUnitaire();

        BigDecimal newPamp = purchaseOrderService.calculateWeightedAverageCost(oldStock, oldPamp, qtyStockReceived, unitStockPrice);
        BigDecimal newStock = oldStock.add(qtyStockReceived);

        ingredient.setQuantiteStock(newStock);
        ingredient.setPrixUnitaire(newPamp);
        ingredient.setUnitCost(newPamp);
        if (ingredient.getDefaultSupplier() == null && supplier != null) {
            ingredient.setDefaultSupplier(supplier);
        }
        ingredientRepository.save(ingredient);

        PurchaseOrderDeliveryItem delItem = new PurchaseOrderDeliveryItem();
        delItem.setIngredient(ingredient);
        delItem.setQuantiteRecue(receivedQty);
        delItem.setPrixUnitaireHt(receivedPrice);
        delItem.setAncienPamp(oldPamp);
        delItem.setNouveauPamp(newPamp);
        delItem.setPurchaseUnit(item.getPackaging());
        delItem.setPackagingCapacity(capacity);
        delItem.setStockQuantityReceived(qtyStockReceived);
        delivery.addItem(delItem);

        PurchaseOrderItem poItem = poItemsByIngredient.get(ingredient.getId());
        if (poItem != null) {
            BigDecimal currentRec = poItem.getQuantiteRecue() != null ? poItem.getQuantiteRecue() : BigDecimal.ZERO;
            poItem.setQuantiteRecue(currentRec.add(receivedQty));
        }
    }

    private void updateOrderStatusAfterDelivery(PurchaseOrder order) {
        boolean allFulfilled = true;
        if (order.getItems() != null) {
            for (PurchaseOrderItem poi : order.getItems()) {
                if (poi.getQuantiteRecue() == null || poi.getQuantiteRecue().compareTo(poi.getQuantiteCommandee()) < 0) {
                    allFulfilled = false;
                    break;
                }
            }
        }
        order.setStatut(allFulfilled ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED);
        purchaseOrderRepository.save(order);
    }

    private PurchaseOrder createAutomatedPurchaseOrderFromInvoice(SupplierInvoice invoice, User user, LocalDateTime now) {
        PurchaseOrder po = new PurchaseOrder();
        po.setReference("PO-AUTO-" + invoice.getInvoiceNumber());
        po.setSupplier(invoice.getSupplier());
        po.setDateCommande(now);
        po.setDateLivraisonPrevue(now);
        po.setCreatedBy(user);
        po.setNotes("Generated automatically from supplier invoice " + invoice.getInvoiceNumber());
        po.setStatut(PurchaseOrderStatus.ORDERED);
        po.setTotalHt(invoice.getTotalHt());
        po.setTotalTva(invoice.getTotalVat());
        po.setTotalTtc(invoice.getTotalTtc());

        for (SupplierInvoiceItem item : invoice.getItems()) {
            PurchaseOrderItem poi = new PurchaseOrderItem();
            poi.setPurchaseOrder(po);
            poi.setIngredient(item.getMatchedIngredient());
            poi.setQuantiteCommandee(item.getEffectiveReceivedQuantity());
            poi.setQuantiteRecue(BigDecimal.ZERO);
            poi.setPrixUnitaireHt(item.getEffectiveUnitPriceHt());
            poi.setTauxTva(item.getVatRate());
            poi.setPurchaseUnit(item.getPackaging());
            poi.setPackagingCapacity(item.getSuggestedPackagingCapacity());
            po.addItem(poi);
        }

        return purchaseOrderRepository.save(po);
    }

    private SupplierInvoice findInvoiceEntity(Long id) {
        return supplierInvoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE_SUPPLIER_INVOICE, "id", id));
    }
}
