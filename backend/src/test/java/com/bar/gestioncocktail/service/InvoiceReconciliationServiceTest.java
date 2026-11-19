package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link InvoiceReconciliationService} verifying automated 3-way matching,
 * variance detection between supplier invoice and purchase order, and 1-click stock intake with PAMP/WAC recalculation.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("InvoiceReconciliationService Unit Tests")
class InvoiceReconciliationServiceTest {

    @Mock
    private SupplierInvoiceRepository supplierInvoiceRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseOrderDeliveryRepository purchaseOrderDeliveryRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private PurchaseOrderService purchaseOrderService;

    @Mock
    private TimeService timeService;

    @InjectMocks
    private InvoiceReconciliationService reconciliationService;

    private Supplier supplier;
    private SupplierInvoice invoice;
    private SupplierInvoiceItem invoiceItem1;
    private SupplierInvoiceItem invoiceItem2;
    private PurchaseOrder purchaseOrder;
    private PurchaseOrderItem poItem1;
    private Ingredient rumIngredient;
    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("manager");

        supplier = new Supplier();
        supplier.setId(10L);
        supplier.setNom("Distributeur Boissons");

        rumIngredient = new Ingredient();
        rumIngredient.setId(100L);
        rumIngredient.setNom("Rhum Diplomatico Reserva");
        rumIngredient.setQuantiteStock(new BigDecimal("5.0"));
        rumIngredient.setPrixUnitaire(new BigDecimal("30.00"));

        invoice = new SupplierInvoice();
        invoice.setId(1L);
        invoice.setInvoiceNumber("FA-2026-5501");
        invoice.setSupplier(supplier);
        invoice.setSupplierNameRaw("Distributeur Boissons");
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setStatus(SupplierInvoiceStatus.PENDING_REVIEW);
        invoice.setFormat(SupplierInvoiceFormat.FACTUR_X);
        invoice.setLegalComplianceStatus(SupplierInvoiceComplianceStatus.COMPLIANT);
        invoice.setTotalHt(new BigDecimal("330.00"));
        invoice.setTotalTtc(new BigDecimal("396.00"));

        invoiceItem1 = new SupplierInvoiceItem();
        invoiceItem1.setId(11L);
        invoiceItem1.setLineNumber(1);
        invoiceItem1.setDesignation("Rhum Diplomatico Reserva Exclusiva 70cl");
        invoiceItem1.setQuantityInvoiced(new BigDecimal("10"));
        invoiceItem1.setUnitPriceHt(new BigDecimal("31.00")); // price hike from 30.00 to 31.00
        invoiceItem1.setLineTotalHt(new BigDecimal("310.00"));
        invoiceItem1.setMatchedIngredient(rumIngredient);
        invoiceItem1.setReconciliationStatus(InvoiceItemReconciliationStatus.MATCHED);
        invoice.addItem(invoiceItem1);

        Ingredient limeIngredient = new Ingredient();
        limeIngredient.setId(101L);
        limeIngredient.setNom("Citron Vert");
        limeIngredient.setQuantiteStock(new BigDecimal("10.0"));
        limeIngredient.setPrixUnitaire(new BigDecimal("10.00"));

        invoiceItem2 = new SupplierInvoiceItem();
        invoiceItem2.setId(12L);
        invoiceItem2.setLineNumber(2);
        invoiceItem2.setDesignation("Article Inconnu Promo");
        invoiceItem2.setQuantityInvoiced(new BigDecimal("2"));
        invoiceItem2.setUnitPriceHt(new BigDecimal("10.00"));
        invoiceItem2.setLineTotalHt(new BigDecimal("20.00"));
        invoiceItem2.setMatchedIngredient(limeIngredient);
        invoiceItem2.setReconciliationStatus(InvoiceItemReconciliationStatus.UNEXPECTED_ITEM);
        invoice.addItem(invoiceItem2);

        purchaseOrder = new PurchaseOrder();
        purchaseOrder.setId(200L);
        purchaseOrder.setReference("PO-2026-0042");
        purchaseOrder.setSupplier(supplier);
        purchaseOrder.setStatut(PurchaseOrderStatus.ORDERED);
        purchaseOrder.setTotalHt(new BigDecimal("300.00"));

        poItem1 = new PurchaseOrderItem();
        poItem1.setId(501L);
        poItem1.setPurchaseOrder(purchaseOrder);
        poItem1.setIngredient(rumIngredient);
        poItem1.setQuantiteCommandee(new BigDecimal("10"));
        poItem1.setPrixUnitaireHt(new BigDecimal("30.00"));
        purchaseOrder.setItems(new ArrayList<>(List.of(poItem1)));
    }

    @Nested
    @DisplayName("Reconciliation Preview & Diff Calculations")
    class ReconciliationPreviewTests {

        @Test
        @DisplayName("Should detect price variance between invoice and purchase order")
        void shouldDetectPriceVariance() {
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            when(purchaseOrderRepository.findById(200L)).thenReturn(Optional.of(purchaseOrder));

            SupplierInvoiceReconciliationDTO preview = reconciliationService.getReconciliationPreview(1L, 200L);

            assertThat(preview).isNotNull();
            assertThat(preview.selectedPurchaseOrderId()).isEqualTo(200L);
            assertThat(preview.lines()).hasSize(2);

            ReconciliationLineDiffDTO diffLine1 = preview.lines().getFirst();
            assertThat(diffLine1.invoiceItemId()).isEqualTo(11L);
            assertThat(diffLine1.status()).isEqualTo(InvoiceItemReconciliationStatus.PRICE_VARIANCE);
            assertThat(diffLine1.unitPriceInvoiced()).isEqualByComparingTo(new BigDecimal("31.00"));
            assertThat(diffLine1.unitPriceOrdered()).isEqualByComparingTo(new BigDecimal("30.00"));
            assertThat(diffLine1.priceVariancePercent()).isGreaterThan(BigDecimal.ZERO);

            ReconciliationLineDiffDTO diffLine2 = preview.lines().get(1);
            assertThat(diffLine2.invoiceItemId()).isEqualTo(12L);
            assertThat(diffLine2.status()).isEqualTo(InvoiceItemReconciliationStatus.UNEXPECTED_ITEM);
        }

        @Test
        @DisplayName("Should automatically link candidate PO if none specified")
        void shouldAutoLinkCandidatePo() {
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            when(purchaseOrderRepository.findBySupplierIdOrderByDateCommandeDesc(10L))
                    .thenReturn(List.of(purchaseOrder));

            SupplierInvoiceReconciliationDTO preview = reconciliationService.getReconciliationPreview(1L, null);

            assertThat(preview).isNotNull();
            assertThat(preview.selectedPurchaseOrderId()).isEqualTo(200L);
        }

        @Test
        @DisplayName("Should detect missing ordered item when purchase order item is not on invoice")
        void shouldDetectMissingOrderedItem() {
            Ingredient vodka = new Ingredient();
            vodka.setId(102L);
            vodka.setNom("Vodka Grey Goose");

            PurchaseOrderItem poItem2 = new PurchaseOrderItem();
            poItem2.setId(502L);
            poItem2.setPurchaseOrder(purchaseOrder);
            poItem2.setIngredient(vodka);
            poItem2.setQuantiteCommandee(new BigDecimal("5"));
            poItem2.setPrixUnitaireHt(new BigDecimal("25.00"));
            purchaseOrder.getItems().add(poItem2);

            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            when(purchaseOrderRepository.findById(200L)).thenReturn(Optional.of(purchaseOrder));

            SupplierInvoiceReconciliationDTO preview = reconciliationService.getReconciliationPreview(1L, 200L);

            assertThat(preview.lines()).anyMatch(line ->
                    line.status() == InvoiceItemReconciliationStatus.MISSING_ORDER_ITEM
                    && "Vodka Grey Goose".equals(line.designation())
            );
        }

        @Test
        @DisplayName("Should return empty candidate orders when invoice supplier is null")
        void shouldReturnEmptyCandidateOrdersWhenSupplierIsNull() {
            invoice.setSupplier(null);
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));

            SupplierInvoiceReconciliationDTO preview = reconciliationService.getReconciliationPreview(1L, null);

            assertThat(preview).isNotNull();
            assertThat(preview.candidatePurchaseOrders()).isEmpty();
        }

        @Test
        @DisplayName("Should match candidate order by invoice order reference")
        void shouldMatchCandidateOrderByOrderReference() {
            invoice.setOrderReference("PO-2026-0042");
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            when(purchaseOrderRepository.findBySupplierIdOrderByDateCommandeDesc(10L))
                    .thenReturn(List.of(purchaseOrder));

            SupplierInvoiceReconciliationDTO preview = reconciliationService.getReconciliationPreview(1L, null);

            assertThat(preview.selectedPurchaseOrderId()).isEqualTo(200L);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when invoice does not exist")
        void shouldThrowWhenInvoiceNotFound() {
            when(supplierInvoiceRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> reconciliationService.getReconciliationPreview(999L, null))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");
        }
    }

    @Nested
    @DisplayName("Save Reconciliation Draft")
    class SaveDraftTests {

        @Test
        @DisplayName("Should update invoice status, notes and ingredient mappings on draft save")
        void shouldUpdateInvoiceOnDraftSave() {
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            when(purchaseOrderRepository.findById(200L)).thenReturn(Optional.of(purchaseOrder));
            when(ingredientRepository.findById(100L)).thenReturn(Optional.of(rumIngredient));
            when(supplierInvoiceRepository.save(any(SupplierInvoice.class))).thenAnswer(i -> i.getArgument(0));

            SupplierInvoiceReconcileRequest request = new SupplierInvoiceReconcileRequest(
                    200L,
                    "Price hike negotiated with sales rep",
                    List.of(
                            new SupplierInvoiceItemReconcileAdjustment(11L, 100L, null, new BigDecimal("10"), new BigDecimal("31.00"), BigDecimal.ONE)
                    )
            );

            SupplierInvoiceDTO updated = reconciliationService.reconcileInvoice(1L, request, testUser);

            assertThat(updated).isNotNull();
            assertThat(updated.reconciliationNotes()).isEqualTo("Price hike negotiated with sales rep");
            assertThat(updated.purchaseOrderId()).isEqualTo(200L);
            verify(supplierInvoiceRepository).save(invoice);
        }

        @Test
        @DisplayName("Should throw BusinessException when attempting to reconcile an already applied invoice")
        void shouldThrowWhenReconcilingAppliedInvoice() {
            invoice.setStatus(SupplierInvoiceStatus.APPLIED);
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));

            assertThatThrownBy(() -> reconciliationService.reconcileInvoice(1L, null, testUser))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("already been applied");
        }

        @Test
        @DisplayName("Should assign supplier from PO if invoice supplier was initially null")
        void shouldAssignSupplierFromPoWhenInvoiceSupplierNull() {
            invoice.setSupplier(null);
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            when(purchaseOrderRepository.findById(200L)).thenReturn(Optional.of(purchaseOrder));
            when(supplierInvoiceRepository.save(any(SupplierInvoice.class))).thenAnswer(i -> i.getArgument(0));

            SupplierInvoiceReconcileRequest request = new SupplierInvoiceReconcileRequest(200L, "Linked PO", List.of());
            SupplierInvoiceDTO updated = reconciliationService.reconcileInvoice(1L, request, testUser);

            assertThat(updated).isNotNull();
            assertThat(invoice.getSupplier()).isEqualTo(supplier);
        }

        @Test
        @DisplayName("Should handle null request and null itemAdjustments gracefully")
        void shouldHandleNullRequest() {
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            when(supplierInvoiceRepository.save(any(SupplierInvoice.class))).thenAnswer(i -> i.getArgument(0));

            SupplierInvoiceDTO updated = reconciliationService.reconcileInvoice(1L, null, testUser);

            assertThat(updated).isNotNull();
        }
    }

    @Nested
    @DisplayName("1-Click Stock Intake & WAC Recalculation")
    class ApplyReconciliationTests {

        @Test
        @DisplayName("Should intake stock, recalculate WAC and create delivery record")
        void shouldIntakeStockAndRecalculateWac() {
            when(timeService.now()).thenReturn(LocalDateTime.of(2026, Month.MARCH, 18, 14, 0));
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            invoice.setPurchaseOrder(purchaseOrder);
            invoiceItem2.setMatchedIngredient(rumIngredient); // map item 2 so all items are mapped
            when(purchaseOrderService.calculateWeightedAverageCost(any(), any(), any(), any()))
                    .thenReturn(new BigDecimal("30.67"));
            when(purchaseOrderDeliveryRepository.save(any(PurchaseOrderDelivery.class))).thenAnswer(i -> {
                PurchaseOrderDelivery pod = i.getArgument(0);
                pod.setId(888L);
                return pod;
            });
            when(supplierInvoiceRepository.save(any(SupplierInvoice.class))).thenAnswer(i -> i.getArgument(0));

            SupplierInvoiceDTO result = reconciliationService.applyInvoice(1L, testUser);

            assertThat(result).isNotNull();
            assertThat(result.status()).isEqualTo(SupplierInvoiceStatus.APPLIED);

            // Prior stock was 5.0, delivered items increased stock
            assertThat(rumIngredient.getQuantiteStock()).isGreaterThan(new BigDecimal("5.0"));

            verify(ingredientRepository, atLeastOnce()).save(rumIngredient);
            verify(purchaseOrderDeliveryRepository).save(any(PurchaseOrderDelivery.class));
            verify(supplierInvoiceRepository).save(invoice);
        }

        @Test
        @DisplayName("Should throw BusinessException when invoice was already applied")
        void shouldThrowWhenInvoiceAlreadyApplied() {
            invoice.setStatus(SupplierInvoiceStatus.APPLIED);
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));

            assertThatThrownBy(() -> reconciliationService.applyInvoice(1L, testUser))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("already been applied");
        }

        @Test
        @DisplayName("Should throw BusinessException when attempting to apply invoice with unmapped items")
        void shouldThrowWhenApplyingWithUnmappedItems() {
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            invoiceItem2.setMatchedIngredient(null); // Unmapped item!

            assertThatThrownBy(() -> reconciliationService.applyInvoice(1L, testUser))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("must be mapped to an ingredient");
        }

        @Test
        @DisplayName("Should create automated purchase order when applying invoice without prior PO")
        void shouldCreateAutomatedPoWhenApplyingInvoiceWithoutPo() {
            when(timeService.now()).thenReturn(LocalDateTime.of(2026, Month.MARCH, 18, 14, 0));
            invoice.setPurchaseOrder(null);
            invoiceItem2.setMatchedIngredient(rumIngredient);
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> {
                PurchaseOrder po = i.getArgument(0);
                po.setId(999L);
                return po;
            });
            when(purchaseOrderDeliveryRepository.save(any(PurchaseOrderDelivery.class))).thenAnswer(i -> {
                PurchaseOrderDelivery pod = i.getArgument(0);
                pod.setId(888L);
                return pod;
            });
            when(supplierInvoiceRepository.save(any(SupplierInvoice.class))).thenAnswer(i -> i.getArgument(0));

            SupplierInvoiceDTO result = reconciliationService.applyInvoice(1L, testUser);

            assertThat(result).isNotNull();
            assertThat(result.status()).isEqualTo(SupplierInvoiceStatus.APPLIED);
            verify(purchaseOrderRepository, atLeastOnce()).save(any(PurchaseOrder.class));
        }

        @Test
        @DisplayName("Should record delivery note reference and packaging capacity on stock apply")
        void shouldRecordDeliveryNoteReferenceAndPackagingCapacity() {
            when(timeService.now()).thenReturn(LocalDateTime.of(2026, Month.MARCH, 18, 14, 0));
            invoice.setPurchaseOrder(purchaseOrder);
            invoice.setDeliveryNoteReference("BL-2026-999");
            invoiceItem1.setSuggestedPackagingCapacity(new BigDecimal("6"));
            invoiceItem2.setMatchedIngredient(rumIngredient);
            rumIngredient.setDefaultSupplier(null);

            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));
            when(purchaseOrderService.calculateWeightedAverageCost(any(), any(), any(), any()))
                    .thenReturn(new BigDecimal("30.00"));
            when(purchaseOrderDeliveryRepository.save(any(PurchaseOrderDelivery.class))).thenAnswer(i -> {
                PurchaseOrderDelivery pod = i.getArgument(0);
                pod.setId(889L);
                return pod;
            });
            when(supplierInvoiceRepository.save(any(SupplierInvoice.class))).thenAnswer(i -> i.getArgument(0));

            SupplierInvoiceDTO result = reconciliationService.applyInvoice(1L, testUser);

            assertThat(result).isNotNull();
            assertThat(rumIngredient.getDefaultSupplier()).isEqualTo(supplier);
            verify(purchaseOrderDeliveryRepository).save(argThat(pod -> "BL-2026-999".equals(pod.getBonLivraisonRef())));
        }
    }
}
