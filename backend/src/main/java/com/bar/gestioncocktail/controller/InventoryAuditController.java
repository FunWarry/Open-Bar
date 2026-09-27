package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.BatchUpdateItemCountsDTO;
import com.bar.gestioncocktail.dto.CreateInventoryAuditSessionDTO;
import com.bar.gestioncocktail.dto.InventoryAuditItemResponseDTO;
import com.bar.gestioncocktail.dto.InventoryAuditSessionResponseDTO;
import com.bar.gestioncocktail.dto.InventoryVarianceSummaryDTO;
import com.bar.gestioncocktail.dto.UpdateInventoryAuditItemCountDTO;
import com.bar.gestioncocktail.service.InventoryAuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller exposing endpoints for periodic physical inventory audits,
 * storage room counting sheets, theoretical vs actual variance analysis, and shrinkage adjustments.
 */
@RestController
@RequestMapping("/api/inventory-audits")
@Tag(name = "Inventory Audit", description = "Periodic physical stock audits, counting sheets, and shrinkage reconciliation endpoints")
public class InventoryAuditController {

    private final InventoryAuditService inventoryAuditService;

    /**
     * Constructs the inventory audit controller.
     *
     * @param inventoryAuditService Service handling inventory audit business logic
     */
    public InventoryAuditController(InventoryAuditService inventoryAuditService) {
        this.inventoryAuditService = inventoryAuditService;
    }

    /**
     * Creates a new periodic physical stock inventory audit session in DRAFT status.
     *
     * @param request Session parameters (title, location scope, category filter)
     * @param authentication Security authentication context
     * @return Created inventory audit session DTO
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(
            summary = "Create physical inventory audit session (ADMIN/MANAGER)",
            description = "Initializes a new inventory audit session in DRAFT state and snapshots current theoretical stock levels."
    )
    @ApiResponse(responseCode = "201", description = "Inventory audit session created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid payload parameters")
    public ResponseEntity<InventoryAuditSessionResponseDTO> createSession(
            @Valid @RequestBody CreateInventoryAuditSessionDTO request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        InventoryAuditSessionResponseDTO created = inventoryAuditService.createSession(request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Retrieves all recorded inventory audit sessions.
     *
     * @return List of inventory audit session summaries
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(
            summary = "List all inventory audit sessions (ADMIN/MANAGER/BARMAN)",
            description = "Retrieves all audit sessions ordered chronologically descending."
    )
    @ApiResponse(responseCode = "200", description = "List of audit sessions retrieved")
    public ResponseEntity<List<InventoryAuditSessionResponseDTO>> getAllSessions() {
        return ResponseEntity.ok(inventoryAuditService.getAllSessions());
    }

    /**
     * Retrieves detailed information and counting line items for a specific audit session.
     *
     * @param id Identifier of the audit session
     * @return Detailed audit session response DTO
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(
            summary = "Get inventory audit session details (ADMIN/MANAGER/BARMAN)",
            description = "Retrieves the session metadata, progress, and all ingredient counting lines."
    )
    @ApiResponse(responseCode = "200", description = "Audit session details retrieved")
    @ApiResponse(responseCode = "404", description = "Audit session not found")
    public ResponseEntity<InventoryAuditSessionResponseDTO> getSessionById(
            @Parameter(description = "Inventory audit session ID") @PathVariable Long id) {
        return ResponseEntity.ok(inventoryAuditService.getSessionById(id));
    }

    /**
     * Transitions an inventory audit session from DRAFT to IN_PROGRESS.
     *
     * @param id Identifier of the audit session
     * @param authentication Security context
     * @return Updated audit session response DTO
     */
    @PostMapping("/{id}/start")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(
            summary = "Start inventory counting session (ADMIN/MANAGER)",
            description = "Transitions the session status from DRAFT to IN_PROGRESS and begins active counting."
    )
    @ApiResponse(responseCode = "200", description = "Audit session started successfully")
    @ApiResponse(responseCode = "400", description = "Session cannot be started from current status")
    @ApiResponse(responseCode = "404", description = "Audit session not found")
    public ResponseEntity<InventoryAuditSessionResponseDTO> startSession(
            @Parameter(description = "Inventory audit session ID") @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(inventoryAuditService.startSession(id, username));
    }

    /**
     * Updates physical counts recorded for an audited line item at a designated storage location.
     *
     * @param id Identifier of the audit session
     * @param itemId Identifier of the line item
     * @param request Count update payload
     * @param authentication Security context
     * @return Updated line item response DTO
     */
    @PutMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(
            summary = "Update physical count for an item (ADMIN/MANAGER/BARMAN)",
            description = "Updates full container count and partial volume for an ingredient line at a storage location."
    )
    @ApiResponse(responseCode = "200", description = "Item count updated successfully")
    @ApiResponse(responseCode = "400", description = "Invalid count payload or session locked")
    @ApiResponse(responseCode = "404", description = "Session or line item not found")
    public ResponseEntity<InventoryAuditItemResponseDTO> updateItemCount(
            @Parameter(description = "Inventory audit session ID") @PathVariable Long id,
            @Parameter(description = "Audit line item ID") @PathVariable Long itemId,
            @Valid @RequestBody UpdateInventoryAuditItemCountDTO request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(inventoryAuditService.updateItemCount(id, itemId, request, username));
    }

    /**
     * Batch updates multiple inventory sheet count entries in a single request.
     *
     * @param id Identifier of the audit session
     * @param request Batch update payload
     * @param authentication Security context
     * @return Updated audit session response DTO
     */
    @PostMapping("/{id}/items/batch")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(
            summary = "Batch update item counts (ADMIN/MANAGER/BARMAN)",
            description = "Applies bulk count updates across multiple ingredients and storage locations."
    )
    @ApiResponse(responseCode = "200", description = "Batch counts applied successfully")
    @ApiResponse(responseCode = "400", description = "Invalid batch payload or session locked")
    @ApiResponse(responseCode = "404", description = "Audit session not found")
    public ResponseEntity<InventoryAuditSessionResponseDTO> batchUpdateCounts(
            @Parameter(description = "Inventory audit session ID") @PathVariable Long id,
            @Valid @RequestBody BatchUpdateItemCountsDTO request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(inventoryAuditService.batchUpdateCounts(id, request, username));
    }

    /**
     * Finalizes an audit session, aligns active system stock with physical counts, and registers compensating movements.
     *
     * @param id Identifier of the audit session
     * @param authentication Security context
     * @param servletRequest HTTP servlet request for client IP tracking
     * @return Finalized audit session response DTO
     */
    @PostMapping("/{id}/finalize")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(
            summary = "Finalize inventory audit and adjust stock (ADMIN/MANAGER)",
            description = "Locks the audit, updates inventory stock balances, and records compensating shrinkage movements."
    )
    @ApiResponse(responseCode = "200", description = "Audit finalized and stock balances reconciled")
    @ApiResponse(responseCode = "400", description = "Session already finalized or cancelled")
    @ApiResponse(responseCode = "404", description = "Audit session not found")
    public ResponseEntity<InventoryAuditSessionResponseDTO> finalizeSession(
            @Parameter(description = "Inventory audit session ID") @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        String username = authentication != null ? authentication.getName() : null;
        String ipAddress = servletRequest != null ? servletRequest.getRemoteAddr() : null;
        return ResponseEntity.ok(inventoryAuditService.finalizeSession(id, username, ipAddress));
    }

    /**
     * Cancels an audit session without adjusting inventory balances.
     *
     * @param id Identifier of the audit session
     * @param authentication Security context
     * @return Updated audit session response DTO
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(
            summary = "Cancel inventory audit (ADMIN/MANAGER)",
            description = "Abandons the audit session without modifying active inventory."
    )
    @ApiResponse(responseCode = "200", description = "Audit session cancelled")
    @ApiResponse(responseCode = "400", description = "Session already finalized")
    @ApiResponse(responseCode = "404", description = "Audit session not found")
    public ResponseEntity<InventoryAuditSessionResponseDTO> cancelSession(
            @Parameter(description = "Inventory audit session ID") @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(inventoryAuditService.cancelSession(id, username));
    }

    /**
     * Retrieves aggregated variance, shrinkage, and surplus metrics for an audit session.
     *
     * @param id Identifier of the audit session
     * @return Variance summary metrics DTO
     */
    @GetMapping("/{id}/summary")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(
            summary = "Get audit variance and shrinkage summary (ADMIN/MANAGER/BARMAN)",
            description = "Calculates total shrinkage, surplus, and breakdowns across categories and storage locations."
    )
    @ApiResponse(responseCode = "200", description = "Variance summary retrieved")
    @ApiResponse(responseCode = "404", description = "Audit session not found")
    public ResponseEntity<InventoryVarianceSummaryDTO> getVarianceSummary(
            @Parameter(description = "Inventory audit session ID") @PathVariable Long id) {
        return ResponseEntity.ok(inventoryAuditService.getVarianceSummary(id));
    }

    /**
     * Exports the inventory audit variance matrix as an A4 PDF document.
     *
     * @param id Identifier of the audit session
     * @return PDF binary stream
     */
    @GetMapping("/{id}/export/pdf")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(
            summary = "Export inventory audit report to PDF (ADMIN/MANAGER/BARMAN)",
            description = "Generates a printable A4 PDF document containing session KPIs, variance matrix, and signatures block."
    )
    @ApiResponse(responseCode = "200", description = "PDF report generated")
    @ApiResponse(responseCode = "404", description = "Audit session not found")
    public ResponseEntity<byte[]> exportPdf(
            @Parameter(description = "Inventory audit session ID") @PathVariable Long id) {
        byte[] pdfBytes = inventoryAuditService.exportPdf(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "inventaire-audit-" + id + ".pdf");
        headers.setContentLength(pdfBytes.length);
        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    /**
     * Exports the inventory audit variance matrix as an RFC-4180 CSV file for accounting.
     *
     * @param id Identifier of the audit session
     * @return CSV binary stream
     */
    @GetMapping("/{id}/export/csv")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(
            summary = "Export inventory audit variance to CSV (ADMIN/MANAGER/BARMAN)",
            description = "Exports a structured semicolon-delimited CSV spreadsheet of the audit items and discrepancies."
    )
    @ApiResponse(responseCode = "200", description = "CSV spreadsheet generated")
    @ApiResponse(responseCode = "404", description = "Audit session not found")
    public ResponseEntity<byte[]> exportCsv(
            @Parameter(description = "Inventory audit session ID") @PathVariable Long id) {
        byte[] csvBytes = inventoryAuditService.exportCsv(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDispositionFormData("attachment", "inventaire-audit-" + id + ".csv");
        headers.setContentLength(csvBytes.length);
        return new ResponseEntity<>(csvBytes, headers, HttpStatus.OK);
    }
}
