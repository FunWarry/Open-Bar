package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
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
}
