package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.model.PurchaseOrder;
import com.bar.gestioncocktail.model.PurchaseOrderStatus;
import com.bar.gestioncocktail.model.Supplier;
import com.bar.gestioncocktail.service.PdfService;
import com.bar.gestioncocktail.service.PurchaseOrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PurchaseOrderController}.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PurchaseOrderController Unit Tests")
class PurchaseOrderControllerTest {

    @Mock
    private PurchaseOrderService purchaseOrderService;

    @Mock
    private PdfService pdfService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private PurchaseOrderController purchaseOrderController;

    private PurchaseOrderDTO sampleOrderDto;
    private PurchaseOrder sampleOrder;

    @BeforeEach
    void setUp() {
        sampleOrderDto = new PurchaseOrderDTO(
                10L,
                "CMD-2026-001",
                1L,
                "Distillerie des Alpes",
                LocalDateTime.now().minusDays(1),
                LocalDateTime.now().plusDays(2),
                null,
                PurchaseOrderStatus.ORDERED,
                "Restock",
                new BigDecimal("200.00"),
                new BigDecimal("40.00"),
                new BigDecimal("240.00"),
                "admin",
                List.of(),
                LocalDateTime.now().minusDays(1),
                LocalDateTime.now()
        );

        sampleOrder = new PurchaseOrder();
        sampleOrder.setId(10L);
        sampleOrder.setReference("CMD-2026-001");
        Supplier supplier = new Supplier("Distillerie des Alpes");
        supplier.setId(1L);
        sampleOrder.setSupplier(supplier);
        sampleOrder.setStatut(PurchaseOrderStatus.ORDERED);
    }

    @Test
    @DisplayName("getAllPurchaseOrders - returns list with HTTP 200")
    void getAllPurchaseOrders_returnsList() {
        when(purchaseOrderService.getAllPurchaseOrders()).thenReturn(List.of(sampleOrderDto));

        ResponseEntity<List<PurchaseOrderDTO>> response = purchaseOrderController.getAllPurchaseOrders();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().getFirst().reference()).isEqualTo("CMD-2026-001");
        verify(purchaseOrderService).getAllPurchaseOrders();
    }

    @Test
    @DisplayName("getPurchaseOrderById - returns order DTO with HTTP 200")
    void getPurchaseOrderById_returnsOrder() {
        when(purchaseOrderService.getPurchaseOrderById(10L)).thenReturn(sampleOrderDto);

        ResponseEntity<PurchaseOrderDTO> response = purchaseOrderController.getPurchaseOrderById(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(sampleOrderDto);
        verify(purchaseOrderService).getPurchaseOrderById(10L);
    }

    @Test
    @DisplayName("getPurchaseOrdersByStatus - returns filtered orders with HTTP 200")
    void getPurchaseOrdersByStatus_returnsList() {
        when(purchaseOrderService.getPurchaseOrdersByStatus(PurchaseOrderStatus.ORDERED)).thenReturn(List.of(sampleOrderDto));

        ResponseEntity<List<PurchaseOrderDTO>> response = purchaseOrderController.getPurchaseOrdersByStatus(PurchaseOrderStatus.ORDERED);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        verify(purchaseOrderService).getPurchaseOrdersByStatus(PurchaseOrderStatus.ORDERED);
    }

    @Test
    @DisplayName("createPurchaseOrder - delegates to service and returns HTTP 201")
    void createPurchaseOrder_createsAndReturns201() {
        PurchaseOrderCreateRequest request = new PurchaseOrderCreateRequest(
                1L, LocalDateTime.now().plusDays(2), "Urgent", List.of()
        );
        when(purchaseOrderService.createPurchaseOrder(any(PurchaseOrderCreateRequest.class), any())).thenReturn(sampleOrderDto);

        ResponseEntity<PurchaseOrderDTO> response = purchaseOrderController.createPurchaseOrder(request, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isEqualTo(sampleOrderDto);
        verify(purchaseOrderService).createPurchaseOrder(request, null);
    }

    @Test
    @DisplayName("markAsOrdered - marks draft as ordered and returns HTTP 200")
    void markAsOrdered_updatesAndReturns200() {
        when(purchaseOrderService.markAsOrdered(10L)).thenReturn(sampleOrderDto);

        ResponseEntity<PurchaseOrderDTO> response = purchaseOrderController.markAsOrdered(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(purchaseOrderService).markAsOrdered(10L);
    }

    @Test
    @DisplayName("receiveDelivery - delegates intake to service and returns updated order DTO")
    void receiveDelivery_returnsUpdatedOrder() {
        PurchaseOrderReceptionRequest request = new PurchaseOrderReceptionRequest("BL-12345", "Delivery OK", List.of());
        when(purchaseOrderService.receiveDelivery(eq(10L), any(PurchaseOrderReceptionRequest.class), any())).thenReturn(sampleOrderDto);

        ResponseEntity<PurchaseOrderDTO> response = purchaseOrderController.receiveDelivery(10L, request, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(sampleOrderDto);
        verify(purchaseOrderService).receiveDelivery(10L, request, null);
    }

    @Test
    @DisplayName("downloadPurchaseOrderPdf - generates PDF and returns application/pdf byte stream")
    void downloadPurchaseOrderPdf_returnsPdfStream() {
        byte[] pdfBytes = new byte[]{1, 2, 3, 4};
        when(purchaseOrderService.findOrderEntity(10L)).thenReturn(sampleOrder);
        when(pdfService.generatePurchaseOrderPdf(sampleOrder)).thenReturn(pdfBytes);

        ResponseEntity<byte[]> response = purchaseOrderController.downloadPurchaseOrderPdf(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PDF);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).contains("attachment; filename=\"bon-commande-CMD-2026-001.pdf\"");
        assertThat(response.getBody()).isEqualTo(pdfBytes);
        verify(pdfService).generatePurchaseOrderPdf(sampleOrder);
    }
}
