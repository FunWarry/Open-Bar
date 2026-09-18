package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.model.BarTabStatus;
import com.bar.gestioncocktail.service.BarTabService;
import com.bar.gestioncocktail.service.FactureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller managing bar tabs (customer running ledgers), orders bound directly to tabs,
 * table-to-tab order transfers, and tab settlements.
 */
@RestController
@RequestMapping("/api/bar-tabs")
@Tag(name = "Bar Tabs", description = "Customer running ledgers, orders bound to tabs, table transfers, and tab bill checkout")
public class BarTabController {

    private final BarTabService barTabService;
    private final FactureService factureService;

    /**
     * Constructs the controller with dependencies.
     *
     * @param barTabService  Service managing bar tab business operations
     * @param factureService Service managing billing and invoicing
     */
    public BarTabController(BarTabService barTabService, FactureService factureService) {
        this.barTabService = barTabService;
        this.factureService = factureService;
    }

    /**
     * Retrieves all bar tabs, optionally filtered by status.
     *
     * @param statut Optional filter by tab status (ACTIVE, SETTLED, TRANSFERRED, CANCELLED)
     * @return List of bar tab summaries
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "List bar tabs", description = "Retrieves all bar tabs, optionally filtered by status (defaults to ACTIVE)")
    @ApiResponse(responseCode = "200", description = "Bar tabs retrieved successfully")
    public List<BarTabResponseDTO> getAllTabs(
            @Parameter(description = "Filter by tab status") @RequestParam(required = false) BarTabStatus statut) {
        if (statut == null) {
            return barTabService.getActiveTabs();
        }
        return barTabService.getTabsByStatus(statut);
    }

    /**
     * Retrieves the detailed summary of a specific bar tab including its orders and consolidated items.
     *
     * @param id Bar tab unique identifier
     * @return Detailed bar tab DTO
     */
    @GetMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get bar tab details", description = "Retrieves full details, orders, and item ledger for a bar tab")
    @ApiResponse(responseCode = "200", description = "Bar tab details retrieved successfully")
    @ApiResponse(responseCode = "404", description = "Bar tab not found")
    public ResponseEntity<BarTabDetailResponseDTO> getTabById(
            @Parameter(description = "Bar tab ID") @PathVariable Long id) {
        return ResponseEntity.ok(barTabService.getTabDetails(id));
    }

    /**
     * Opens a new bar tab for a customer.
     *
     * @param request Bar tab creation payload
     * @return Created bar tab summary
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Open a new bar tab", description = "Creates and activates a new customer bar tab")
    @ApiResponse(responseCode = "201", description = "Bar tab created successfully")
    public ResponseEntity<BarTabResponseDTO> createTab(
            @Valid @RequestBody BarTabCreateRequest request) {
        BarTabResponseDTO created = barTabService.createTab(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing bar tab's metadata (notes, client reference, deposit amount).
     *
     * @param id      Bar tab unique identifier
     * @param request Update payload
     * @return Updated bar tab summary
     */
    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Update bar tab metadata", description = "Updates notes, reference, or deposit for an active bar tab")
    @ApiResponse(responseCode = "200", description = "Bar tab updated successfully")
    @ApiResponse(responseCode = "404", description = "Bar tab not found")
    public ResponseEntity<BarTabResponseDTO> updateTab(
            @Parameter(description = "Bar tab ID") @PathVariable Long id,
            @Valid @RequestBody BarTabUpdateRequest request) {
        return ResponseEntity.ok(barTabService.updateTab(id, request));
    }

    /**
     * Adds an order directly to a bar tab.
     *
     * @param id      Bar tab unique identifier
     * @param request Order creation payload
     * @return Created order summary
     */
    @PostMapping("/{id:\\d+}/orders")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Add order to bar tab", description = "Creates a new order directly assigned to the specified bar tab")
    @ApiResponse(responseCode = "201", description = "Order created and attached to bar tab")
    @ApiResponse(responseCode = "404", description = "Bar tab not found")
    public ResponseEntity<CommandeResponseDTO> addOrderToTab(
            @Parameter(description = "Bar tab ID") @PathVariable Long id,
            @Valid @RequestBody CommandeRequestDTO request) {
        CommandeResponseDTO order = barTabService.addOrderToTab(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    /**
     * Transfers orders from a physical table to a bar tab.
     *
     * @param id      Bar tab unique identifier
     * @param request Transfer parameters including table ID and order IDs
     * @return Updated bar tab summary
     */
    @PostMapping("/{id:\\d+}/transfer-from-table")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Transfer table orders to bar tab", description = "Migrates active orders from a physical table into an active bar tab")
    @ApiResponse(responseCode = "200", description = "Orders transferred successfully to bar tab")
    @ApiResponse(responseCode = "404", description = "Table or bar tab not found")
    public ResponseEntity<BarTabResponseDTO> transferFromTable(
            @Parameter(description = "Target bar tab ID") @PathVariable Long id,
            @Valid @RequestBody BarTabTransferRequest request) {
        return ResponseEntity.ok(barTabService.transferOrdersFromTable(id, request));
    }

    /**
     * Transfers an active bar tab's orders onto a physical table.
     *
     * @param id      Bar tab unique identifier
     * @param request Transfer parameters including target table ID
     * @return Updated bar tab summary
     */
    @PostMapping("/{id:\\d+}/transfer-to-table")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Transfer bar tab to table", description = "Migrates all active orders from a bar tab to a physical table")
    @ApiResponse(responseCode = "200", description = "Bar tab orders transferred to table")
    @ApiResponse(responseCode = "404", description = "Target table or bar tab not found")
    public ResponseEntity<BarTabResponseDTO> transferToTable(
            @Parameter(description = "Source bar tab ID") @PathVariable Long id,
            @Valid @RequestBody BarTabTransferRequest request) {
        return ResponseEntity.ok(barTabService.transferTabToTable(id, request));
    }

    /**
     * Transfers a single order between a bar tab and another destination.
     *
     * @param id      Bar tab unique identifier
     * @param request Order transfer parameters
     * @return Updated bar tab summary
     */
    @PostMapping("/{id:\\d+}/transfer-order")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Transfer single order", description = "Moves a single order into or out of a bar tab")
    @ApiResponse(responseCode = "200", description = "Order transferred successfully")
    @ApiResponse(responseCode = "404", description = "Order or bar tab not found")
    public ResponseEntity<BarTabResponseDTO> transferSingleOrder(
            @Parameter(description = "Bar tab ID") @PathVariable Long id,
            @Valid @RequestBody BarTabOrderTransferRequest request) {
        return ResponseEntity.ok(barTabService.transferSingleOrder(id, request));
    }

    /**
     * Cancels an active bar tab if it contains no un-cancelled orders or if force-cancelled.
     *
     * @param id     Bar tab unique identifier
     * @param reason Optional cancellation reason
     * @return Cancelled bar tab summary
     */
    @PostMapping("/{id:\\d+}/cancel")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Cancel bar tab", description = "Cancels an active bar tab")
    @ApiResponse(responseCode = "200", description = "Bar tab cancelled successfully")
    @ApiResponse(responseCode = "404", description = "Bar tab not found")
    public ResponseEntity<BarTabResponseDTO> cancelTab(
            @Parameter(description = "Bar tab ID") @PathVariable Long id,
            @Parameter(description = "Cancellation reason") @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(barTabService.cancelTab(id, reason));
    }

    /**
     * Computes and retrieves the bill breakdown for the specified bar tab.
     *
     * @param id Bar tab unique identifier
     * @return Detailed bill breakdown
     */
    @GetMapping("/{id:\\d+}/addition")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get bar tab addition", description = "Calculates the bill breakdown, items, and tax totals for a bar tab")
    @ApiResponse(responseCode = "200", description = "Bill breakdown calculated successfully")
    @ApiResponse(responseCode = "404", description = "Bar tab not found")
    public ResponseEntity<TableAdditionResponseDTO> getTabAddition(
            @Parameter(description = "Bar tab ID") @PathVariable Long id) {
        return ResponseEntity.ok(factureService.getTabAddition(id));
    }

    /**
     * Settles and issues an invoice for a bar tab.
     *
     * @param id      Bar tab unique identifier
     * @param request Payment and checkout details
     * @return Generated invoice response DTO
     */
    @PostMapping("/{id:\\d+}/encaisser")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Settle bar tab", description = "Settles, invoices, and closes the customer bar tab")
    @ApiResponse(responseCode = "200", description = "Bar tab settled and invoiced successfully")
    @ApiResponse(responseCode = "404", description = "Bar tab not found")
    public ResponseEntity<FactureResponseDTO> encaisserTab(
            @Parameter(description = "Bar tab ID") @PathVariable Long id,
            @Valid @RequestBody EncaissementRequestDTO request) {
        return ResponseEntity.ok(factureService.encaisserTab(id, request));
    }
}
