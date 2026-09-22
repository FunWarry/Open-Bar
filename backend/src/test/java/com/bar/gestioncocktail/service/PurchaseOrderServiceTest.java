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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PurchaseOrderService} verifying ordering, reception check-in,
 * order status transitions, and weighted average unit cost (PAMP) recalculations.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PurchaseOrderService Unit Tests")
class PurchaseOrderServiceTest {

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseOrderDeliveryRepository purchaseOrderDeliveryRepository;

    @Mock
    private PurchaseOrderDeliveryItemRepository purchaseOrderDeliveryItemRepository;

    @Mock
    private SupplierRepository supplierRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private TimeService timeService;

    @InjectMocks
    private PurchaseOrderService purchaseOrderService;

    private Supplier sampleSupplier;
    private Ingredient sampleRhum;
    private PurchaseOrder sampleOrder;
    private PurchaseOrderItem sampleItem;

    @BeforeEach
    void setUp() {
        sampleSupplier = new Supplier();
        sampleSupplier.setId(1L);
        sampleSupplier.setNom("Distillerie des Alpes");

        sampleRhum = new Ingredient();
        sampleRhum.setId(10L);
        sampleRhum.setNom("Rhum Blanc");
        sampleRhum.setUniteMesure("L");
        sampleRhum.setQuantiteStock(new BigDecimal("10.00"));
        sampleRhum.setPrixUnitaire(new BigDecimal("12.00")); // PAMP initial = 12.00 €
        sampleRhum.setUnitCost(new BigDecimal("12.00"));
        sampleRhum.setCodeBarre("3256220148521");

        sampleOrder = new PurchaseOrder();
        sampleOrder.setId(100L);
        sampleOrder.setReference("CMD-2026-001");
        sampleOrder.setSupplier(sampleSupplier);
        sampleOrder.setStatut(PurchaseOrderStatus.ORDERED);
        sampleOrder.setDateCommande(LocalDateTime.now().minusDays(1));
        sampleOrder.setTotalHt(new BigDecimal("120.00"));
        sampleOrder.setTotalTva(new BigDecimal("24.00"));
        sampleOrder.setTotalTtc(new BigDecimal("144.00"));

        sampleItem = new PurchaseOrderItem();
        sampleItem.setId(1001L);
        sampleItem.setPurchaseOrder(sampleOrder);
        sampleItem.setIngredient(sampleRhum);
        sampleItem.setQuantiteCommandee(new BigDecimal("10.00"));
        sampleItem.setQuantiteRecue(BigDecimal.ZERO);
        sampleItem.setPrixUnitaireHt(new BigDecimal("12.00"));
        sampleItem.setTauxTva(new BigDecimal("20.00"));

        sampleOrder.setItems(new ArrayList<>(List.of(sampleItem)));

        lenient().when(timeService.now()).thenReturn(LocalDateTime.of(2026, java.time.Month.SEPTEMBER, 22, 10, 0));
    }

    @Nested
    @DisplayName("Create Purchase Order")
    class CreateOrderTests {

        @Test
        @DisplayName("Should create purchase order with calculated totals and line items")
        void shouldCreatePurchaseOrderSuccessfully() {
            PurchaseOrderItemRequest itemReq = new PurchaseOrderItemRequest(
                    10L,
                    new BigDecimal("12.00"),
                    new BigDecimal("15.00"),
                    new BigDecimal("20.00")
            );
            PurchaseOrderCreateRequest request = new PurchaseOrderCreateRequest(
                    1L,
                    LocalDateTime.now().plusDays(2),
                    "Urgent weekend restock",
                    List.of(itemReq)
            );

            when(supplierRepository.findById(1L)).thenReturn(Optional.of(sampleSupplier));
            when(ingredientRepository.findById(10L)).thenReturn(Optional.of(sampleRhum));
            when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> {
                PurchaseOrder po = invocation.getArgument(0);
                po.setId(200L);
                return po;
            });

            PurchaseOrderDTO result = purchaseOrderService.createPurchaseOrder(request, null);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(200L);
            assertThat(result.supplierId()).isEqualTo(1L);
            assertThat(result.reference()).startsWith("BC-");
            assertThat(result.statut()).isEqualTo(PurchaseOrderStatus.DRAFT);
            assertThat(result.totalHt()).isEqualByComparingTo("180.00");
            assertThat(result.totalTva()).isEqualByComparingTo("36.00");
            assertThat(result.totalTtc()).isEqualByComparingTo("216.00");
            verify(purchaseOrderRepository).save(any(PurchaseOrder.class));
        }

        @Test
        @DisplayName("Should throw BusinessException when order contains no items")
        void shouldThrowBusinessExceptionWhenItemsEmpty() {
            PurchaseOrderCreateRequest request = new PurchaseOrderCreateRequest(
                    1L, LocalDateTime.now().plusDays(2), null, List.of()
            );

            assertThatThrownBy(() -> purchaseOrderService.createPurchaseOrder(request, null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Purchase order must contain at least one line item");
        }
    }

    @Nested
    @DisplayName("Status Transitions")
    class StatusTransitionsTests {

        @Test
        @DisplayName("Should mark draft order as ordered")
        void shouldMarkDraftOrderAsOrdered() {
            sampleOrder.setStatut(PurchaseOrderStatus.DRAFT);
            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));
            when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PurchaseOrderDTO result = purchaseOrderService.markAsOrdered(100L);

            assertThat(result.statut()).isEqualTo(PurchaseOrderStatus.ORDERED);
        }

        @Test
        @DisplayName("Should cancel purchase order successfully")
        void shouldCancelOrderSuccessfully() {
            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));
            when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PurchaseOrderDTO result = purchaseOrderService.cancelPurchaseOrder(100L, "Supplier out of stock", null);

            assertThat(result.statut()).isEqualTo(PurchaseOrderStatus.CANCELLED);
        }

        @Test
        @DisplayName("Should throw BusinessException when attempting to cancel already cancelled order")
        void shouldThrowBusinessExceptionWhenCancellingAlreadyCancelledOrder() {
            sampleOrder.setStatut(PurchaseOrderStatus.CANCELLED);
            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));

            assertThatThrownBy(() -> purchaseOrderService.cancelPurchaseOrder(100L, null, null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Purchase order is already cancelled");
        }
    }

    @Nested
    @DisplayName("Delivery Reception and PAMP Recalculation")
    class DeliveryReceptionTests {

        @Test
        @DisplayName("Should receive delivery, update stock, log delivery receipt and recalculate PAMP correctly")
        void shouldReceiveDeliveryAndRecalculatePamp() {
            // Initial Rhum state: Stock = 10 L, PAMP = 12.00 €
            // Delivery: 20 L @ 15.00 € HT
            // Total cost = (10 * 12.00) + (20 * 15.00) = 120.00 + 300.00 = 420.00 €
            // New Stock = 30 L
            // New PAMP = 420.00 / 30 = 14.00 €

            PurchaseOrderReceptionItemRequest receptionItem = new PurchaseOrderReceptionItemRequest(
                    1001L,
                    new BigDecimal("20.00"),
                    new BigDecimal("15.00")
            );
            PurchaseOrderReceptionRequest receptionRequest = new PurchaseOrderReceptionRequest(
                    "BL-98765",
                    "Complete delivery in perfect condition",
                    List.of(receptionItem)
            );

            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));
            when(purchaseOrderDeliveryRepository.save(any(PurchaseOrderDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PurchaseOrderDTO result = purchaseOrderService.receiveDelivery(100L, receptionRequest, null);

            assertThat(result).isNotNull();
            assertThat(result.statut()).isEqualTo(PurchaseOrderStatus.RECEIVED);

            // Rhum stock updated to 30 L and PAMP updated to 14.00 €
            assertThat(sampleRhum.getQuantiteStock()).isEqualByComparingTo("30.00");
            assertThat(sampleRhum.getPrixUnitaire()).isEqualByComparingTo("14.00");
            assertThat(sampleRhum.getUnitCost()).isEqualByComparingTo("14.00");

            verify(ingredientRepository).save(sampleRhum);
            verify(purchaseOrderDeliveryRepository).save(any(PurchaseOrderDelivery.class));
        }

        @Test
        @DisplayName("Should set PAMP directly to delivered price when initial stock is zero or negative")
        void shouldSetPampDirectlyWhenInitialStockZero() {
            sampleRhum.setQuantiteStock(BigDecimal.ZERO);
            sampleRhum.setPrixUnitaire(BigDecimal.ZERO);
            sampleRhum.setUnitCost(BigDecimal.ZERO);

            PurchaseOrderReceptionItemRequest receptionItem = new PurchaseOrderReceptionItemRequest(
                    1001L,
                    new BigDecimal("10.00"),
                    new BigDecimal("18.50")
            );
            PurchaseOrderReceptionRequest receptionRequest = new PurchaseOrderReceptionRequest(
                    "BL-001",
                    null,
                    List.of(receptionItem)
            );

            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));
            when(purchaseOrderDeliveryRepository.save(any(PurchaseOrderDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PurchaseOrderDTO result = purchaseOrderService.receiveDelivery(100L, receptionRequest, null);

            assertThat(result).isNotNull();
            assertThat(sampleRhum.getQuantiteStock()).isEqualByComparingTo("10.00");
            assertThat(sampleRhum.getPrixUnitaire()).isEqualByComparingTo("18.50");
            assertThat(sampleRhum.getUnitCost()).isEqualByComparingTo("18.50");
        }

        @Test
        @DisplayName("Should throw BusinessException when receiving delivery on order not in ORDERED status")
        void shouldThrowBusinessExceptionWhenOrderNotOrdered() {
            sampleOrder.setStatut(PurchaseOrderStatus.CANCELLED);
            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));

            PurchaseOrderReceptionRequest receptionRequest = new PurchaseOrderReceptionRequest(
                    "BL-111", null, List.of(new PurchaseOrderReceptionItemRequest(1001L, BigDecimal.TEN, null))
            );

            assertThatThrownBy(() -> purchaseOrderService.receiveDelivery(100L, receptionRequest, null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot receive delivery for order in status: CANCELLED");
        }
    }

    @Nested
    @DisplayName("Query Orders")
    class QueryOrdersTests {

        @Test
        @DisplayName("Should retrieve all purchase orders")
        void shouldRetrieveAllPurchaseOrders() {
            when(purchaseOrderRepository.findAllByOrderByDateCommandeDesc()).thenReturn(List.of(sampleOrder));

            List<PurchaseOrderDTO> orders = purchaseOrderService.getAllPurchaseOrders();

            assertThat(orders).hasSize(1);
            assertThat(orders.get(0).id()).isEqualTo(100L);
            verify(establishmentConfigService).checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        }

        @Test
        @DisplayName("Should retrieve purchase orders by status")
        void shouldRetrieveOrdersByStatus() {
            when(purchaseOrderRepository.findByStatutOrderByDateCommandeDesc(PurchaseOrderStatus.ORDERED))
                    .thenReturn(List.of(sampleOrder));

            List<PurchaseOrderDTO> orders = purchaseOrderService.getPurchaseOrdersByStatus(PurchaseOrderStatus.ORDERED);

            assertThat(orders).hasSize(1);
            assertThat(orders.get(0).statut()).isEqualTo(PurchaseOrderStatus.ORDERED);
        }

        @Test
        @DisplayName("Should retrieve order by ID")
        void shouldRetrieveOrderById() {
            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));

            PurchaseOrderDTO dto = purchaseOrderService.getPurchaseOrderById(100L);

            assertThat(dto).isNotNull();
            assertThat(dto.id()).isEqualTo(100L);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when order does not exist")
        void shouldThrowWhenOrderNotFound() {
            when(purchaseOrderRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> purchaseOrderService.getPurchaseOrderById(999L))
                    .isInstanceOf(com.bar.gestioncocktail.exception.ResourceNotFoundException.class)
                    .hasMessageContaining("Purchase order not found with ID: 999");
        }
    }

    @Nested
    @DisplayName("Stock Reversion and Variations")
    class StockReversionAndVariationsTests {

        @Test
        @DisplayName("Should revert stock when cancelling a partially received order")
        void shouldRevertStockWhenCancellingPartiallyReceivedOrder() {
            sampleOrder.setStatut(PurchaseOrderStatus.PARTIALLY_RECEIVED);
            sampleItem.setQuantiteRecue(new BigDecimal("5.00"));
            sampleRhum.setQuantiteStock(new BigDecimal("15.00"));

            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(sampleOrder));
            when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PurchaseOrderDTO result = purchaseOrderService.cancelPurchaseOrder(100L, "Cancelled remainder", null);

            assertThat(result.statut()).isEqualTo(PurchaseOrderStatus.CANCELLED);
            assertThat(sampleRhum.getQuantiteStock()).isEqualByComparingTo("10.00");
            verify(ingredientRepository).save(sampleRhum);
        }

        @Test
        @DisplayName("Should retrieve price variations for all ingredients and single ingredient")
        void shouldRetrievePriceVariations() {
            PurchaseOrderDelivery delivery = new PurchaseOrderDelivery();
            delivery.setDateReception(LocalDateTime.now());
            delivery.setBonLivraisonRef("BL-100");

            PurchaseOrderDeliveryItem item = new PurchaseOrderDeliveryItem();
            item.setId(50L);
            item.setDelivery(delivery);
            item.setIngredient(sampleRhum);
            item.setQuantiteRecue(new BigDecimal("10.00"));
            item.setPrixUnitaireHt(new BigDecimal("15.00"));
            item.setAncienPamp(new BigDecimal("12.00"));
            item.setNouveauPamp(new BigDecimal("13.50"));

            when(purchaseOrderDeliveryItemRepository.findAllByOrderByDeliveryDateReceptionDesc())
                    .thenReturn(List.of(item));
            when(purchaseOrderDeliveryItemRepository.findByIngredientIdOrderByDeliveryDateReceptionDesc(10L))
                    .thenReturn(List.of(item));

            List<PriceVariationDTO> all = purchaseOrderService.getPriceVariations(null);
            List<PriceVariationDTO> single = purchaseOrderService.getPriceVariations(10L);

            assertThat(all).hasSize(1);
            assertThat(single).hasSize(1);
            assertThat(single.get(0).ingredientId()).isEqualTo(10L);
        }

        @Test
        @DisplayName("Should handle calculateWeightedAverageCost edge cases")
        void shouldHandlePampEdgeCases() {
            BigDecimal res1 = purchaseOrderService.calculateWeightedAverageCost(BigDecimal.TEN, new BigDecimal("12.00"), BigDecimal.ONE, null);
            assertThat(res1).isEqualByComparingTo("12.00");

            BigDecimal res2 = purchaseOrderService.calculateWeightedAverageCost(BigDecimal.TEN, new BigDecimal("12.00"), BigDecimal.ZERO, new BigDecimal("15.00"));
            assertThat(res2).isEqualByComparingTo("12.00");

            BigDecimal res3 = purchaseOrderService.calculateWeightedAverageCost(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.TEN, new BigDecimal("15.00"));
            assertThat(res3).isEqualByComparingTo("15.00");
        }

        @Test
        @DisplayName("Should update draft purchase order successfully")
        void shouldUpdateDraftPurchaseOrder() {
            PurchaseOrder order = new PurchaseOrder();
            order.setId(100L);
            order.setStatut(PurchaseOrderStatus.DRAFT);
            order.setSupplier(sampleSupplier);
            order.setItems(new ArrayList<>());

            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(order));
            when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(inv -> inv.getArgument(0));
            when(ingredientRepository.findById(10L)).thenReturn(Optional.of(sampleRhum));

            PurchaseOrderItemRequest itemReq = new PurchaseOrderItemRequest(10L, new BigDecimal("5.00"), new BigDecimal("14.00"), new BigDecimal("20.00"), "Bottle 70cl", new BigDecimal("70.00"));
            PurchaseOrderCreateRequest updateReq = new PurchaseOrderCreateRequest(1L, LocalDateTime.now().plusDays(3), "Updated instructions", List.of(itemReq));

            PurchaseOrderDTO updated = purchaseOrderService.updatePurchaseOrder(100L, updateReq);

            assertThat(updated).isNotNull();
            assertThat(order.getNotes()).isEqualTo("Updated instructions");
            verify(purchaseOrderRepository).save(order);
        }

        @Test
        @DisplayName("Should throw BusinessException when updating received or cancelled purchase order")
        void shouldThrowWhenUpdatingReceivedOrCancelledOrder() {
            PurchaseOrder order = new PurchaseOrder();
            order.setId(100L);
            order.setStatut(PurchaseOrderStatus.RECEIVED);
            order.setSupplier(sampleSupplier);

            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(order));

            PurchaseOrderCreateRequest updateReq = new PurchaseOrderCreateRequest(1L, null, "Notes", List.of());

            assertThatThrownBy(() -> purchaseOrderService.updatePurchaseOrder(100L, updateReq))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot modify a purchase order in RECEIVED status");
        }

        @Test
        @DisplayName("Should update supplier on purchase order when new supplier ID is provided")
        void shouldUpdateSupplierOnPurchaseOrder() {
            PurchaseOrder order = new PurchaseOrder();
            order.setId(100L);
            order.setStatut(PurchaseOrderStatus.DRAFT);
            order.setSupplier(sampleSupplier);
            order.setItems(new ArrayList<>());

            Supplier newSupplier = new Supplier();
            newSupplier.setId(2L);
            newSupplier.setNom("Distillerie des Alpes");

            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(order));
            when(supplierRepository.findById(2L)).thenReturn(Optional.of(newSupplier));
            when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(inv -> inv.getArgument(0));

            PurchaseOrderCreateRequest updateReq = new PurchaseOrderCreateRequest(2L, null, "New supplier", List.of());

            PurchaseOrderDTO result = purchaseOrderService.updatePurchaseOrder(100L, updateReq);

            assertThat(result).isNotNull();
            assertThat(order.getSupplier().getId()).isEqualTo(2L);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when updating with unknown supplier ID")
        void shouldThrowWhenUpdatingWithUnknownSupplier() {
            PurchaseOrder order = new PurchaseOrder();
            order.setId(100L);
            order.setStatut(PurchaseOrderStatus.DRAFT);
            order.setSupplier(sampleSupplier);

            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(order));
            when(supplierRepository.findById(999L)).thenReturn(Optional.empty());

            PurchaseOrderCreateRequest updateReq = new PurchaseOrderCreateRequest(999L, null, "Unknown supplier", List.of());

            assertThatThrownBy(() -> purchaseOrderService.updatePurchaseOrder(100L, updateReq))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Supplier not found with ID: 999");
        }

        @Test
        @DisplayName("Should throw BusinessException when markAsOrdered is called on non-draft order")
        void shouldThrowWhenMarkAsOrderedOnNonDraft() {
            PurchaseOrder order = new PurchaseOrder();
            order.setId(100L);
            order.setStatut(PurchaseOrderStatus.ORDERED);
            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(order));

            assertThatThrownBy(() -> purchaseOrderService.markAsOrdered(100L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Only DRAFT purchase orders can be marked as ORDERED");
        }

        @Test
        @DisplayName("Should throw BusinessException when receiving delivery on order in DRAFT status")
        void shouldThrowWhenReceivingDeliveryOnDraft() {
            PurchaseOrder order = new PurchaseOrder();
            order.setId(100L);
            order.setStatut(PurchaseOrderStatus.DRAFT);
            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(order));

            PurchaseOrderReceptionRequest req = new PurchaseOrderReceptionRequest("BL-1", "Notes", List.of(new PurchaseOrderReceptionItemRequest(10L, BigDecimal.ONE, BigDecimal.TEN)));

            assertThatThrownBy(() -> purchaseOrderService.receiveDelivery(100L, req, null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot receive delivery for order in status: DRAFT");
        }

        @Test
        @DisplayName("Should throw BusinessException when reception request has empty items or all zero quantities")
        void shouldThrowWhenReceptionItemsAreEmptyOrZero() {
            PurchaseOrder order = new PurchaseOrder();
            order.setId(100L);
            order.setStatut(PurchaseOrderStatus.ORDERED);
            when(purchaseOrderRepository.findById(100L)).thenReturn(Optional.of(order));

            PurchaseOrderReceptionRequest emptyReq = new PurchaseOrderReceptionRequest("BL-1", "Notes", List.of());
            assertThatThrownBy(() -> purchaseOrderService.receiveDelivery(100L, emptyReq, null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Delivery check-in must specify at least one received item");

            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setId(200L);
            item.setPurchaseOrder(order);
            item.setIngredient(sampleRhum);
            item.setQuantiteCommandee(BigDecimal.TEN);
            item.setQuantiteRecue(BigDecimal.ZERO);
            item.setPrixUnitaireHt(BigDecimal.TEN);
            order.setItems(List.of(item));

            PurchaseOrderReceptionRequest zeroReq = new PurchaseOrderReceptionRequest("BL-1", "Notes", List.of(new PurchaseOrderReceptionItemRequest(200L, BigDecimal.ZERO, BigDecimal.TEN)));
            assertThatThrownBy(() -> purchaseOrderService.receiveDelivery(100L, zeroReq, null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Delivery check-in must have at least one item with received quantity > 0");
        }

        @Test
        @DisplayName("Should filter purchase orders by status")
        void shouldFilterPurchaseOrdersByStatus() {
            PurchaseOrder order = new PurchaseOrder();
            order.setId(100L);
            order.setStatut(PurchaseOrderStatus.ORDERED);
            order.setSupplier(sampleSupplier);
            order.setItems(List.of());

            when(purchaseOrderRepository.findByStatutOrderByDateCommandeDesc(PurchaseOrderStatus.ORDERED))
                    .thenReturn(List.of(order));

            List<PurchaseOrderDTO> results = purchaseOrderService.getPurchaseOrdersByStatus(PurchaseOrderStatus.ORDERED);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).statut()).isEqualTo(PurchaseOrderStatus.ORDERED);
        }
    }
}
