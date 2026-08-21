package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EncaissementRequestDTO;
import com.bar.gestioncocktail.dto.FactureItemRequestDTO;
import com.bar.gestioncocktail.dto.FactureRequestDTO;
import com.bar.gestioncocktail.dto.FactureResponseDTO;
import com.bar.gestioncocktail.dto.MergeFacturesRequestDTO;
import com.bar.gestioncocktail.dto.SplitAdditionRequest;
import com.bar.gestioncocktail.dto.SplitEgalRequest;
import com.bar.gestioncocktail.dto.SplitResultDTO;
import com.bar.gestioncocktail.dto.TableAdditionResponseDTO;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.service.FactureService;
import com.bar.gestioncocktail.service.PdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * REST controller for managing invoices, payments, bill splitting, and PDF exports.
 */
@RestController
@RequestMapping("/api/factures")
@Tag(name = "Invoices", description = "Invoice management, payments, bill splitting (split), table checkout, and PDF generation")
public class FactureController {
    private final FactureService factureService;
    private final PdfService pdfService;

    /**
     * Constructs the controller with invoice and PDF service dependencies.
     *
     * @param factureService Invoice management service
     * @param pdfService     PDF export and generation service
     */
    public FactureController(FactureService factureService, PdfService pdfService) {
        this.factureService = factureService;
        this.pdfService = pdfService;
    }

    /**
     * Lists all invoices.
     *
     * @return List of registered invoices
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "List all invoices (SERVEUR/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Invoices retrieved")
    public ResponseEntity<List<FactureResponseDTO>> getAllFactures() {
        return ResponseEntity.ok(factureService.getAllFactures().stream()
                .map(FactureResponseDTO::from).toList());
    }

    /**
     * Creates a new invoice.
     *
     * @param request Invoice data to create
     * @return DTO of the created invoice
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Create an invoice (SERVEUR/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Invoice created successfully")
    public ResponseEntity<FactureResponseDTO> createFacture(@Valid @RequestBody FactureRequestDTO request) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.createFacture(request.toEntity())));
    }

    /**
     * Updates an existing invoice.
     *
     * @param id      Invoice identifier
     * @param request Updated data
     * @return Updated invoice DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Update an invoice (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Invoice updated")
    public ResponseEntity<FactureResponseDTO> updateFacture(
            @Parameter(description = "Invoice ID") @PathVariable Long id,
            @Valid @RequestBody FactureRequestDTO request) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.updateFacture(id, request.toEntity())));
    }

    /**
     * Deletes an invoice.
     *
     * @param id Invoice identifier
     * @return HTTP 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete an invoice (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Invoice deleted")
    public ResponseEntity<Void> deleteFacture(@Parameter(description = "Invoice ID") @PathVariable Long id) {
        factureService.deleteFacture(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Retrieves an invoice by its identifier.
     *
     * @param id Invoice identifier
     * @return Found invoice DTO
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Get invoice by ID")
    @ApiResponse(responseCode = "200", description = "Invoice found")
    @ApiResponse(responseCode = "404", description = "Invoice not found")
    public ResponseEntity<FactureResponseDTO> getFactureById(
            @Parameter(description = "Invoice ID") @PathVariable Long id) {
        return factureService.getFactureById(id)
                .map(FactureResponseDTO::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Retrieves invoices attached to a table.
     *
     * @param tableId Table identifier
     * @return List of table invoices
     */
    @GetMapping("/table/{tableId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "List invoices for a table")
    @ApiResponse(responseCode = "200", description = "Table invoices retrieved")
    public ResponseEntity<List<FactureResponseDTO>> getFacturesByTable(
            @Parameter(description = "Table ID") @PathVariable Long tableId) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(factureService.getFacturesByTable(table).stream()
                .map(FactureResponseDTO::from).toList());
    }

    /**
     * Calculates the detailed bill breakdown for a table with active delivered orders.
     *
     * @param tableId Table identifier
     * @return DTO containing item breakdown, pre-tax subtotal, VAT breakdown, and total TTC
     */
    @GetMapping("/table/{tableId}/addition")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Get table bill summary", description = "Calculates complete table bill breakdown (items, pre-tax subtotal, VAT breakdown, total TTC).")
    @ApiResponse(responseCode = "200", description = "Bill summary calculated successfully")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<TableAdditionResponseDTO> getTableAddition(
            @Parameter(description = "Table ID") @PathVariable Long tableId) {
        return ResponseEntity.ok(factureService.getTableAddition(tableId));
    }

    /**
     * Validates table checkout: generates official invoice, settles orders, and frees the table.
     *
     * @param tableId Table identifier
     * @param request Checkout request payload (payment method, tip, discount, freeTable flag)
     * @return Generated and settled official invoice DTO
     */
    @PostMapping("/table/{tableId}/encaisser")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Settle and checkout table", description = "Records table payment, issues official invoice, marks orders as settled, and frees table.")
    @ApiResponse(responseCode = "200", description = "Table checked out and invoice issued successfully")
    @ApiResponse(responseCode = "400", description = "Validation error or no active orders")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<FactureResponseDTO> encaisserTable(
            @Parameter(description = "Table ID") @PathVariable Long tableId,
            @Valid @RequestBody EncaissementRequestDTO request) {
        return ResponseEntity.ok(factureService.encaisserTable(tableId, request));
    }

    /**
     * Filters invoices within a date range.
     *
     * @param debut Start date and time
     * @param fin   End date and time
     * @return List of matching invoices
     */
    @GetMapping("/date")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "List invoices in date range")
    @ApiResponse(responseCode = "200", description = "Invoices retrieved")
    public ResponseEntity<List<FactureResponseDTO>> getFacturesByDate(
            @RequestParam LocalDateTime debut,
            @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(factureService.getFacturesByDate(debut, fin).stream()
                .map(FactureResponseDTO::from).toList());
    }

    /**
     * Adds an item line to an invoice.
     *
     * @param id      Invoice identifier
     * @param request Invoice item payload
     * @return Updated invoice DTO
     */
    @PostMapping("/{id}/items")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Add an item line to an invoice")
    @ApiResponse(responseCode = "200", description = "Item line added")
    public ResponseEntity<FactureResponseDTO> ajouterItem(
            @Parameter(description = "Invoice ID") @PathVariable Long id,
            @Valid @RequestBody FactureItemRequestDTO request) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.ajouterItem(id, request.toEntity())));
    }

    /**
     * Removes an item line from an invoice.
     *
     * @param id     Invoice identifier
     * @param itemId Invoice item identifier
     * @return Updated invoice DTO
     */
    @DeleteMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Remove an item line from an invoice")
    @ApiResponse(responseCode = "200", description = "Item line removed")
    public ResponseEntity<FactureResponseDTO> retirerItem(
            @Parameter(description = "Invoice ID") @PathVariable Long id,
            @Parameter(description = "Invoice Item ID") @PathVariable Long itemId) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.retirerItem(id, itemId)));
    }

    /**
     * Records settlement payment for an invoice with payment method.
     *
     * @param id           Invoice identifier
     * @param modePaiement Payment method (e.g. CARTE, ESPECES, TICKETS_RESTO)
     * @param pourboire    Optional tip amount
     * @return Settled invoice DTO
     */
    @PostMapping("/{id}/regler")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Record invoice payment settlement", description = "Marks invoice as settled and liberates table when appropriate.")
    @ApiResponse(responseCode = "200", description = "Settlement completed")
    public ResponseEntity<FactureResponseDTO> reglerFacture(
            @Parameter(description = "Invoice ID") @PathVariable Long id,
            @Parameter(description = "Payment method (CARTE, ESPECES, etc.)") @RequestParam String modePaiement,
            @Parameter(description = "Optional tip amount") @RequestParam(required = false) BigDecimal pourboire) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.reglerFacture(id, modePaiement, pourboire)));
    }

    /**
     * Generates and downloads the invoice receipt in PDF format.
     *
     * @param id Invoice identifier
     * @return Binary PDF file as byte array
     */
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Download invoice as PDF", description = "Generates a PDF document compliant with legal standards (VAT, SIRET, sequential numbering).")
    @ApiResponse(responseCode = "200", description = "PDF generated")
    @ApiResponse(responseCode = "404", description = "Invoice not found")
    public ResponseEntity<byte[]> downloadFacturePdf(
            @Parameter(description = "Invoice ID") @PathVariable Long id) {
        Facture facture = factureService.getFactureById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + id));
        byte[] pdf = pdfService.generateFacturePdf(facture);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"facture-" + id + ".pdf\"")
                .body(pdf);
    }

    /**
     * Splits an invoice into equal parts among N guests.
     *
     * @param id      Invoice identifier
     * @param request DTO specifying number of guests
     * @return Breakdown results
     */
    @PostMapping("/{id}/split/egal")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Split bill equally", description = "Calculates equal subtotal per guest.")
    @ApiResponse(responseCode = "200", description = "Equal split calculated")
    public ResponseEntity<List<SplitResultDTO>> splitEgal(
            @PathVariable Long id,
            @RequestBody SplitEgalRequest request) {
        return ResponseEntity.ok(factureService.splitEgal(id, request.nombreConvives()));
    }

    /**
     * Splits an invoice based on specific item selection per guest.
     *
     * @param id      Invoice identifier
     * @param request DTO describing item assignments per guest
     * @return Detailed split results
     */
    @PostMapping("/{id}/split/selection")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Split bill by item selection", description = "Enables each guest to pay for their specific selected items.")
    @ApiResponse(responseCode = "200", description = "Custom split calculated")
    public ResponseEntity<List<SplitResultDTO>> splitParSelection(
            @PathVariable Long id,
            @RequestBody SplitAdditionRequest request) {
        return ResponseEntity.ok(factureService.splitParSelection(id, request));
    }

    /**
     * Persists an individual guest settlement share for an invoice.
     *
     * @param id      Invoice identifier
     * @param request Payload containing guest payment details and assigned items
     * @return Saved settlement DTO
     */
    @PostMapping("/{id}/split/encaisser")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Record individual split share payment", description = "Saves guest payment details, items consumed, and tips. Marks invoice settled if completed.")
    @ApiResponse(responseCode = "200", description = "Split share settlement recorded")
    public ResponseEntity<com.bar.gestioncocktail.dto.FactureReglementDTO> encaisserPart(
            @PathVariable Long id,
            @Valid @RequestBody com.bar.gestioncocktail.dto.EncaisserPartRequest request) {
        return ResponseEntity.ok(factureService.encaisserPart(id, request));
    }

    /**
     * Retrieves all recorded split share settlements for an invoice.
     *
     * @param id Invoice identifier
     * @return List of settlement records
     */
    @GetMapping("/{id}/reglements")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Get all recorded split settlements", description = "Returns full breakdown of guest payments and itemized receipts for this invoice.")
    @ApiResponse(responseCode = "200", description = "Settlement records retrieved")
    public ResponseEntity<List<com.bar.gestioncocktail.dto.FactureReglementDTO>> getReglements(@PathVariable Long id) {
        return ResponseEntity.ok(factureService.getReglementsByFactureId(id));
    }

    /**
     * Merges multiple invoices into a single combined invoice.
     *
     * @param request DTO containing list of invoice IDs to merge
     * @return Newly merged invoice DTO
     */
    @PostMapping("/merge")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Merge multiple invoices into one", description = "Combines several sub-bills or table checks.")
    @ApiResponse(responseCode = "200", description = "Invoices merged")
    public ResponseEntity<FactureResponseDTO> fusionnerFactures(@Valid @RequestBody MergeFacturesRequestDTO request) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.fusionnerFactures(request)));
    }

    @GetMapping(value = "/export/csv", produces = "text/csv;charset=UTF-8")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Export invoices to CSV (Accounting)", description = "Generates Excel-compatible UTF-8 BOM CSV file for accounting.")
    @ApiResponse(responseCode = "200", description = "CSV file generated")
    public ResponseEntity<String> exportCSV(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        LocalDateTime from = dateFrom != null ? LocalDateTime.parse(dateFrom + "T00:00:00") : null;
        LocalDateTime to = dateTo != null ? LocalDateTime.parse(dateTo + "T23:59:59") : null;
        String csvContent = factureService.exportCSV(from, to);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"export_factures.csv\"")
                .body(csvContent);
    }

    @GetMapping("/vat-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Monthly VAT declaration summary", description = "Calculates multi-rate VAT summary for a given month (e.g. 2026-06).")
    @ApiResponse(responseCode = "200", description = "VAT summary generated")
    public ResponseEntity<com.bar.gestioncocktail.dto.VatMonthlySummaryDTO> getVatSummary(@RequestParam String month) {
        return ResponseEntity.ok(factureService.getVatMonthlySummary(month));
    }

    @PostMapping("/{id}/avoir")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create cancellation credit note", description = "Issues a legal credit note (avoir) to cancel a finalized invoice.")
    @ApiResponse(responseCode = "200", description = "Credit note created")
    public ResponseEntity<com.bar.gestioncocktail.model.AvoirCredit> createAvoir(
            @PathVariable Long id,
            @RequestParam(required = false) String motif) {
        return ResponseEntity.ok(factureService.annulerFactureWithAvoir(id, motif));
    }

    @GetMapping("/{id}/verify-integrity")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Verify legal PDF integrity", description = "Verifies the archived PDF SHA-256 hash against recorded hash.")
    @ApiResponse(responseCode = "200", description = "Integrity verification result")
    public ResponseEntity<java.util.Map<String, Object>> verifyIntegrity(@PathVariable Long id) {
        Facture facture = factureService.getFactureById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + id));
        byte[] pdfBytes = pdfService.generateFacturePdf(facture);
        return ResponseEntity.ok(factureService.verifyIntegrity(id, pdfBytes));
    }

    @GetMapping("/daily-recap")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Daily financial closing recap (Z-Report)", description = "Calculates revenue, average ticket, payment methods breakdown, and VAT distribution for a given date.")
    @ApiResponse(responseCode = "200", description = "Daily recap generated")
    public ResponseEntity<com.bar.gestioncocktail.dto.DailyRecapDTO> getDailyRecap(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
        return ResponseEntity.ok(factureService.getDailyRecap(date));
    }

    @GetMapping("/daily-recap/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Download daily cash closing recap PDF", description = "Generates A4 PDF document meeting accounting standards for daily register closing.")
    @ApiResponse(responseCode = "200", description = "Daily recap PDF generated")
    public ResponseEntity<byte[]> downloadDailyRecapPdf(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
        com.bar.gestioncocktail.dto.DailyRecapDTO recap = factureService.getDailyRecap(date);
        byte[] pdf = pdfService.generateDailyRecapPdf(recap);
        String fileName = "recap-caisse-" + recap.date() + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(pdf);
    }
}
