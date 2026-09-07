package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.service.TableCartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public REST controller for collaborative table cart operations.
 * <p>
 * Enables anonymous patrons seated at the same physical table to collaboratively view,
 * add, update, and submit drinks as a unified bar order.
 */
@RestController
@RequestMapping("/api/public/tables/{tableId}/cart")
@Tag(name = "Public Table Cart", description = "Collaborative multi-guest cart operations for table QR code ordering")
public class PublicTableCartController {

    private final TableCartService tableCartService;
    private final com.bar.gestioncocktail.service.EstablishmentConfigService establishmentConfigService;

    /**
     * Constructs the controller with the collaborative table cart service and establishment config service.
     *
     * @param tableCartService          Table cart service
     * @param establishmentConfigService Establishment config service
     */
    public PublicTableCartController(
            TableCartService tableCartService,
            com.bar.gestioncocktail.service.EstablishmentConfigService establishmentConfigService) {
        this.tableCartService = tableCartService;
        this.establishmentConfigService = establishmentConfigService;
    }

    /**
     * Retrieves the current collaborative cart state for a table.
     *
     * @param tableId Table identifier
     * @return Consolidated table cart
     */
    @GetMapping
    @Operation(summary = "Get collaborative table cart", description = "Retrieves all drinks added to the shared table cart by all seated guests.")
    @ApiResponse(responseCode = "200", description = "Table cart retrieved successfully")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<TableCartResponseDTO> getCart(
            @Parameter(description = "Table identifier", example = "5") @PathVariable Long tableId) {
        TableCartResponseDTO cart = tableCartService.getCart(tableId);
        return ResponseEntity.ok(cart);
    }

    /**
     * Adds an item to the collaborative table cart.
     *
     * @param tableId Table identifier
     * @param dto Item creation payload
     * @return Updated table cart
     */
    @PostMapping("/items")
    @Operation(summary = "Add item to shared cart", description = "Adds a new drink or increments an existing line in the collaborative table cart.")
    @ApiResponse(responseCode = "201", description = "Item added to cart")
    @ApiResponse(responseCode = "400", description = "Invalid request or drink unavailable")
    @ApiResponse(responseCode = "404", description = "Table or cocktail not found")
    public ResponseEntity<TableCartResponseDTO> addItem(
            @Parameter(description = "Table identifier", example = "5") @PathVariable Long tableId,
            @Valid @RequestBody TableCartItemRequestDTO dto) {
        if (!establishmentConfigService.isModuleEnabled(com.bar.gestioncocktail.model.EstablishmentModule.QR_CLIENT_ORDERING)) {
            throw new com.bar.gestioncocktail.exception.BusinessException("Customer QR ordering is currently disabled for this establishment.");
        }
        TableCartResponseDTO cart = tableCartService.addItem(tableId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(cart);
    }

    /**
     * Updates an item's quantity or preparation notes in the shared cart.
     *
     * @param tableId Table identifier
     * @param itemId Item identifier
     * @param dto Update payload
     * @return Updated table cart
     */
    @PutMapping("/items/{itemId}")
    @Operation(summary = "Update cart item", description = "Updates quantity (0 removes) or notes of an item in the shared table cart.")
    @ApiResponse(responseCode = "200", description = "Item updated successfully")
    @ApiResponse(responseCode = "404", description = "Table or cart item not found")
    public ResponseEntity<TableCartResponseDTO> updateItem(
            @Parameter(description = "Table identifier", example = "5") @PathVariable Long tableId,
            @Parameter(description = "Cart item identifier", example = "1") @PathVariable Long itemId,
            @Valid @RequestBody TableCartItemUpdateRequestDTO dto) {
        TableCartResponseDTO cart = tableCartService.updateItem(tableId, itemId, dto);
        return ResponseEntity.ok(cart);
    }

    /**
     * Removes an item from the shared table cart.
     *
     * @param tableId Table identifier
     * @param itemId Item identifier
     * @param guestSessionId Optional guest identifier requesting removal
     * @return Updated table cart
     */
    @DeleteMapping("/items/{itemId}")
    @Operation(summary = "Remove cart item", description = "Removes a specific drink line from the shared table cart.")
    @ApiResponse(responseCode = "200", description = "Item removed successfully")
    @ApiResponse(responseCode = "404", description = "Table or cart item not found")
    public ResponseEntity<TableCartResponseDTO> removeItem(
            @Parameter(description = "Table identifier", example = "5") @PathVariable Long tableId,
            @Parameter(description = "Cart item identifier", example = "1") @PathVariable Long itemId,
            @Parameter(description = "Optional guest session identifier") @RequestParam(required = false) String guestSessionId) {
        TableCartResponseDTO cart = tableCartService.removeItem(tableId, itemId, guestSessionId);
        return ResponseEntity.ok(cart);
    }

    /**
     * Clears all items from the shared table cart.
     *
     * @param tableId Table identifier
     * @return Empty table cart
     */
    @DeleteMapping
    @Operation(summary = "Clear shared cart", description = "Clears all drinks from the collaborative table cart.")
    @ApiResponse(responseCode = "200", description = "Table cart cleared")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<TableCartResponseDTO> clearCart(
            @Parameter(description = "Table identifier", example = "5") @PathVariable Long tableId) {
        TableCartResponseDTO cart = tableCartService.clearCart(tableId);
        return ResponseEntity.ok(cart);
    }

    /**
     * Locks and submits the collaborative table cart into an official order sent to the bar.
     *
     * @param tableId Table identifier
     * @param dto Submit request payload
     * @return Created public order response
     */
    @PostMapping("/submit")
    @Operation(summary = "Lock and submit shared order", description = "Consolidates all drinks in the shared table cart into a single order dispatched to the bar.")
    @ApiResponse(responseCode = "201", description = "Order created and dispatched to the bar")
    @ApiResponse(responseCode = "400", description = "Cart is empty or insufficient stock")
    @ApiResponse(responseCode = "403", description = "Session token invalid or expired")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<PublicCommandeResponseDTO> submitCart(
            @Parameter(description = "Table identifier", example = "5") @PathVariable Long tableId,
            @Valid @RequestBody TableCartSubmitRequestDTO dto) {
        if (!establishmentConfigService.isModuleEnabled(com.bar.gestioncocktail.model.EstablishmentModule.QR_CLIENT_ORDERING)) {
            throw new com.bar.gestioncocktail.exception.BusinessException("Customer QR ordering is currently disabled for this establishment.");
        }
        PublicCommandeResponseDTO order = tableCartService.submitCart(tableId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }
}
