package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PriceVariationDTO;
import com.bar.gestioncocktail.dto.PurchaseOrderCreateRequest;
import com.bar.gestioncocktail.dto.PurchaseOrderDTO;
import com.bar.gestioncocktail.dto.PurchaseOrderReceptionRequest;
import com.bar.gestioncocktail.model.PurchaseOrder;
import com.bar.gestioncocktail.model.PurchaseOrderStatus;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.PdfService;
import com.bar.gestioncocktail.service.PurchaseOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for supplier purchase orders, goods intake check-in (BL),
 * PDF generation, and ingredient price variation analytics.
 */
@RestController
@RequestMapping("/api/purchase-orders")
@Tag(name = "Purchase Orders", description = "Procurement, goods receipts and Weighted Average Cost (PAMP) recalculation")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;
    private final PdfService pdfService;
    private final UserRepository userRepository;

    /**
     * Constructs the PurchaseOrderController with required dependencies.
     *
     * @param purchaseOrderService purchase order management service
     * @param pdfService           PDF generation service
     * @param userRepository       user persistence repository
     */
    @Autowired
    public PurchaseOrderController(
            PurchaseOrderService purchaseOrderService,
            PdfService pdfService,
            UserRepository userRepository
    ) {
        this.purchaseOrderService = purchaseOrderService;
        this.pdfService = pdfService;
        this.userRepository = userRepository;
    }

    /**
     * Retrieves all purchase orders ordered by order date descending.
     *
     * @return list of purchase orders
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "List all purchase orders", description = "Retrieves all purchase orders with financial totals and status")
    @ApiResponse(responseCode = "200", description = "Purchase orders retrieved successfully")
    public ResponseEntity<List<PurchaseOrderDTO>> getAllPurchaseOrders() {
        return ResponseEntity.ok(purchaseOrderService.getAllPurchaseOrders());
    }

    /**
     * Retrieves purchase orders filtered by lifecycle status.
     *
     * @param status target lifecycle status (DRAFT, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED)
     * @return list of matching purchase orders
     */
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "List purchase orders by status", description = "Filters purchase orders by lifecycle status")
    @ApiResponse(responseCode = "200", description = "Matching purchase orders retrieved")
    public ResponseEntity<List<PurchaseOrderDTO>> getPurchaseOrdersByStatus(
            @Parameter(description = "Lifecycle status") @PathVariable PurchaseOrderStatus status
    ) {
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrdersByStatus(status));
    }

    /**
     * Retrieves a purchase order by its identifier.
     *
     * @param id purchase order ID
     * @return purchase order DTO
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get purchase order by ID", description = "Retrieves a purchase order with full line items")
    @ApiResponse(responseCode = "200", description = "Purchase order found")
    @ApiResponse(responseCode = "404", description = "Purchase order not found")
    public ResponseEntity<PurchaseOrderDTO> getPurchaseOrderById(
            @Parameter(description = "Purchase order ID") @PathVariable Long id
    ) {
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrderById(id));
    }

    /**
     * Creates a new purchase order draft.
     *
     * @param request creation payload
     * @param auth    current authenticated user context
     * @return created purchase order DTO
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create purchase order draft", description = "Generates a new purchase order with auto-increment reference")
    @ApiResponse(responseCode = "201", description = "Purchase order created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid payload")
    public ResponseEntity<PurchaseOrderDTO> createPurchaseOrder(
            @Valid @RequestBody PurchaseOrderCreateRequest request,
            Authentication auth
    ) {
        User user = resolveCurrentUser(auth);
        PurchaseOrderDTO created = purchaseOrderService.createPurchaseOrder(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing purchase order before it is received.
     *
     * @param id      purchase order ID
     * @param request update payload
     * @return updated purchase order DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update purchase order", description = "Modifies supplier, dates, or items of a draft/ordered purchase order")
    @ApiResponse(responseCode = "200", description = "Purchase order updated successfully")
    @ApiResponse(responseCode = "400", description = "Order cannot be edited in current status")
    public ResponseEntity<PurchaseOrderDTO> updatePurchaseOrder(
            @Parameter(description = "Purchase order ID") @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderCreateRequest request
    ) {
        return ResponseEntity.ok(purchaseOrderService.updatePurchaseOrder(id, request));
    }

    /**
     * Marks a draft purchase order as officially ordered with the supplier.
     *
     * @param id purchase order ID
     * @return updated purchase order DTO
     */
    @RequestMapping(value = {"/{id}/order", "/{id}/send"}, method = {RequestMethod.POST, RequestMethod.PATCH})
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Mark purchase order as ordered", description = "Transitions order from DRAFT to ORDERED")
    @ApiResponse(responseCode = "200", description = "Order marked as ordered")
    public ResponseEntity<PurchaseOrderDTO> markAsOrdered(
            @Parameter(description = "Purchase order ID") @PathVariable Long id
    ) {
        return ResponseEntity.ok(purchaseOrderService.markAsOrdered(id));
    }

    /**
     * Checks in incoming goods delivery against an active purchase order.
     * Replenishes active ingredient stocks and recalculates live Weighted Average Unit Cost (PAMP / WAC).
     *
     * @param id      purchase order ID
     * @param request reception intake payload
     * @param auth    current authenticated user context
     * @return updated purchase order DTO
     */
    @PostMapping("/{id}/reception")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Check in delivery intake (BL)", description = "Validates received quantities, replenishes stock, recalculates PAMP and logs delivery receipt")
    @ApiResponse(responseCode = "200", description = "Delivery intake checked in successfully")
    @ApiResponse(responseCode = "400", description = "Invalid reception data or order status")
    public ResponseEntity<PurchaseOrderDTO> receiveDelivery(
            @Parameter(description = "Purchase order ID") @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderReceptionRequest request,
            Authentication auth
    ) {
        User user = resolveCurrentUser(auth);
        return ResponseEntity.ok(purchaseOrderService.receiveDelivery(id, request, user));
    }

    /**
     * Cancels an order. Reverts stock quantities if partial/full delivery was already stocked.
     *
     * @param id     purchase order ID
     * @param reason cancellation reason memo
     * @param auth   current authenticated user context
     * @return updated purchase order DTO
     */
    @RequestMapping(value = "/{id}/cancel", method = {RequestMethod.POST, RequestMethod.PATCH})
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Cancel purchase order", description = "Cancels purchase order and applies compensatory stock adjustments if needed")
    @ApiResponse(responseCode = "200", description = "Purchase order cancelled")
    public ResponseEntity<PurchaseOrderDTO> cancelPurchaseOrder(
            @Parameter(description = "Purchase order ID") @PathVariable Long id,
            @RequestParam(value = "reason", required = false) String reason,
            Authentication auth
    ) {
        User user = resolveCurrentUser(auth);
        return ResponseEntity.ok(purchaseOrderService.cancelPurchaseOrder(id, reason, user));
    }

    /**
     * Generates and downloads the official A4 PDF purchase order / goods receipt recap.
     *
     * @param id purchase order ID
     * @return binary PDF file
     */
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Download purchase order PDF", description = "Generates official A4 PDF purchase order sheet with OpenPDF")
    @ApiResponse(responseCode = "200", description = "PDF generated successfully")
    public ResponseEntity<byte[]> downloadPurchaseOrderPdf(
            @Parameter(description = "Purchase order ID") @PathVariable Long id
    ) {
        PurchaseOrder order = purchaseOrderService.findOrderEntity(id);
        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(order);
        String fileName = "bon-commande-" + order.getReference() + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(pdfBytes);
    }

    /**
     * Retrieves historical price variations and incoming deliveries log.
     *
     * @param ingredientId optional filter by ingredient ID
     * @return list of price variations
     */
    @GetMapping("/price-variations")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get historical price variations", description = "Retrieves delivery log and Weighted Average Cost (PAMP) shifts over time")
    @ApiResponse(responseCode = "200", description = "Price variations retrieved")
    public ResponseEntity<List<PriceVariationDTO>> getPriceVariations(
            @Parameter(description = "Optional ingredient ID filter") @RequestParam(value = "ingredientId", required = false) Long ingredientId
    ) {
        return ResponseEntity.ok(purchaseOrderService.getPriceVariations(ingredientId));
    }

    private User resolveCurrentUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return null;
        }
        return userRepository.findByUsername(auth.getName())
                .or(() -> userRepository.findByEmail(auth.getName()))
                .orElse(null);
    }
}
