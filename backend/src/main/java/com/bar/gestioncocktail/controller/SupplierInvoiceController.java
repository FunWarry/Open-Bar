package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.SupplierInvoiceRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.InvoiceReconciliationService;
import com.bar.gestioncocktail.service.SupplierInvoiceParserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

/**
 * REST controller for automated supplier invoice import (Factur-X & standard PDF),
 * electronic invoice compliance checks, purchase order reconciliation, and stock intake.
 */
@RestController
@RequestMapping("/api/purchases/invoices")
@Tag(name = "Supplier Invoices", description = "Digital supplier invoices, Factur-X parsing, purchase order reconciliation, and stock intake")
public class SupplierInvoiceController {

    private static final String INVOICE_PREFIX = "Invoice ";
    private static final String RESOURCE_SUPPLIER_INVOICE = "SupplierInvoice";

    private final SupplierInvoiceParserService supplierInvoiceParserService;
    private final InvoiceReconciliationService invoiceReconciliationService;
    private final SupplierInvoiceRepository supplierInvoiceRepository;
    private final UserRepository userRepository;

    /**
     * Constructs the SupplierInvoiceController with required dependencies.
     *
     * @param supplierInvoiceParserService invoice file parsing service
     * @param invoiceReconciliationService PO and inventory reconciliation service
     * @param supplierInvoiceRepository   invoice persistence repository
     * @param userRepository              user entity repository
     */
    public SupplierInvoiceController(
            SupplierInvoiceParserService supplierInvoiceParserService,
            InvoiceReconciliationService invoiceReconciliationService,
            SupplierInvoiceRepository supplierInvoiceRepository,
            UserRepository userRepository
    ) {
        this.supplierInvoiceParserService = supplierInvoiceParserService;
        this.invoiceReconciliationService = invoiceReconciliationService;
        this.supplierInvoiceRepository = supplierInvoiceRepository;
        this.userRepository = userRepository;
    }

    /**
     * Uploads and parses a digital supplier invoice (Factur-X hybrid PDF/XML or standard distributor PDF).
     *
     * @param file uploaded invoice file
     * @param auth authenticated security context
     * @return upload and parsing response DTO
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Upload and parse supplier invoice", description = "Parses Factur-X or PDF invoice, extracts lines, and checks compliance")
    @ApiResponse(responseCode = "201", description = "Invoice parsed and stored successfully")
    @ApiResponse(responseCode = "200", description = "Existing or duplicate invoice retrieved")
    @ApiResponse(responseCode = "400", description = "Invalid or unreadable invoice file")
    public ResponseEntity<SupplierInvoiceUploadResponseDTO> uploadInvoice(
            @Parameter(description = "Invoice file (PDF or XML)") @RequestParam("file") MultipartFile file,
            Authentication auth
    ) {
        SupplierInvoice invoice = supplierInvoiceParserService.parseInvoice(file);

        if (invoice.getFileChecksum() != null) {
            Optional<SupplierInvoice> existing = supplierInvoiceRepository.findByFileChecksum(invoice.getFileChecksum());
            if (existing.isPresent()) {
                SupplierInvoice existingEntity = existing.get();
                boolean isApplied = existingEntity.getStatus() == SupplierInvoiceStatus.APPLIED;
                String msg = isApplied
                        ? INVOICE_PREFIX + existingEntity.getInvoiceNumber() + " has already been imported and applied into inventory."
                        : INVOICE_PREFIX + existingEntity.getInvoiceNumber() + " was previously uploaded and is awaiting reconciliation.";
                return ResponseEntity.ok(new SupplierInvoiceUploadResponseDTO(
                        SupplierInvoiceDTO.from(existingEntity),
                        true,
                        msg,
                        List.of("Duplicate file detected (SHA-256 matched).")
                ));
            }
        }

        User user = resolveUser(auth);
        invoice.setReviewedBy(user);
        SupplierInvoice saved = supplierInvoiceRepository.save(invoice);

        List<String> warnings = invoice.getLegalComplianceStatus() == SupplierInvoiceComplianceStatus.WARNINGS
                ? List.of("Invoice has minor legal/tax compliance warnings.")
                : List.of();

        return ResponseEntity.status(HttpStatus.CREATED).body(new SupplierInvoiceUploadResponseDTO(
                SupplierInvoiceDTO.from(saved),
                false,
                INVOICE_PREFIX + saved.getInvoiceNumber() + " imported successfully.",
                warnings
        ));
    }

    /**
     * Retrieves all imported supplier invoices with optional status and supplier filtering.
     *
     * @param status     optional lifecycle status filter
     * @param supplierId optional supplier identifier filter
     * @return list of matching supplier invoices
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "List supplier invoices", description = "Retrieves all imported supplier invoices with optional filters")
    @ApiResponse(responseCode = "200", description = "Supplier invoices retrieved")
    public ResponseEntity<List<SupplierInvoiceDTO>> getAllInvoices(
            @Parameter(description = "Optional status filter") @RequestParam(required = false) SupplierInvoiceStatus status,
            @Parameter(description = "Optional supplier ID filter") @RequestParam(required = false) Long supplierId
    ) {
        List<SupplierInvoice> invoices;
        if (status != null) {
            invoices = supplierInvoiceRepository.findByStatusOrderByInvoiceDateDesc(status);
        } else if (supplierId != null) {
            invoices = supplierInvoiceRepository.findBySupplierIdOrderByInvoiceDateDesc(supplierId);
        } else {
            invoices = supplierInvoiceRepository.findAllByOrderByCreatedAtDesc();
        }

        return ResponseEntity.ok(invoices.stream().map(SupplierInvoiceDTO::from).toList());
    }

    /**
     * Retrieves a single supplier invoice by its identifier.
     *
     * @param id invoice identifier
     * @return supplier invoice DTO
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get invoice details", description = "Retrieves an invoice by its unique ID")
    @ApiResponse(responseCode = "200", description = "Invoice found")
    @ApiResponse(responseCode = "404", description = "Invoice not found")
    public ResponseEntity<SupplierInvoiceDTO> getInvoiceById(
            @Parameter(description = "Invoice identifier") @PathVariable Long id
    ) {
        SupplierInvoice invoice = supplierInvoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE_SUPPLIER_INVOICE, "id", id));
        return ResponseEntity.ok(SupplierInvoiceDTO.from(invoice));
    }

    /**
     * Computes a detailed reconciliation comparison diff between an invoice and candidate purchase orders.
     *
     * @param id              invoice identifier
     * @param purchaseOrderId optional target purchase order identifier
     * @return reconciliation snapshot diff
     */
    @GetMapping("/{id}/reconcile-preview")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Preview invoice reconciliation", description = "Compares invoice lines against purchase orders and highlights variances")
    @ApiResponse(responseCode = "200", description = "Reconciliation diff computed")
    @ApiResponse(responseCode = "404", description = "Invoice not found")
    public ResponseEntity<SupplierInvoiceReconciliationDTO> getReconciliationPreview(
            @Parameter(description = "Invoice identifier") @PathVariable Long id,
            @Parameter(description = "Optional Purchase Order ID") @RequestParam(required = false) Long purchaseOrderId
    ) {
        return ResponseEntity.ok(invoiceReconciliationService.getReconciliationPreview(id, purchaseOrderId));
    }

    /**
     * Saves reconciliation adjustments, linking the invoice to a purchase order and mapping ingredients.
     *
     * @param id      invoice identifier
     * @param request adjustments payload
     * @param auth    authenticated security context
     * @return updated supplier invoice DTO
     */
    @PostMapping("/{id}/reconcile")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Save reconciliation adjustments", description = "Associates invoice with purchase order and maps unlinked items")
    @ApiResponse(responseCode = "200", description = "Reconciliation adjustments saved")
    @ApiResponse(responseCode = "400", description = "Invalid payload")
    public ResponseEntity<SupplierInvoiceDTO> reconcileInvoice(
            @Parameter(description = "Invoice identifier") @PathVariable Long id,
            @Valid @RequestBody SupplierInvoiceReconcileRequest request,
            Authentication auth
    ) {
        User user = resolveUser(auth);
        return ResponseEntity.ok(invoiceReconciliationService.reconcileInvoice(id, request, user));
    }

    /**
     * Confirms the invoice and executes one-click inventory intake and PAMP / WAC recalculation.
     *
     * @param id   invoice identifier
     * @param auth authenticated security context
     * @return updated supplier invoice DTO
     */
    @PostMapping("/{id}/apply")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Apply invoice into inventory", description = "Generates delivery receipt, updates stock quantities and recalculates PAMP/WAC")
    @ApiResponse(responseCode = "200", description = "Invoice applied and stock updated")
    @ApiResponse(responseCode = "400", description = "Invoice cannot be applied")
    public ResponseEntity<SupplierInvoiceDTO> applyInvoice(
            @Parameter(description = "Invoice identifier") @PathVariable Long id,
            Authentication auth
    ) {
        User user = resolveUser(auth);
        return ResponseEntity.ok(invoiceReconciliationService.applyInvoice(id, user));
    }

    /**
     * Audits the French legal and e-invoicing compliance of the imported supplier invoice.
     *
     * @param id invoice identifier
     * @return compliance report DTO
     */
    @GetMapping("/{id}/compliance")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Audit invoice compliance", description = "Audits mandatory French mentions, SIREN, and VAT calculation consistency")
    @ApiResponse(responseCode = "200", description = "Compliance report generated")
    @ApiResponse(responseCode = "404", description = "Invoice not found")
    public ResponseEntity<SupplierInvoiceComplianceReportDTO> getComplianceReport(
            @Parameter(description = "Invoice identifier") @PathVariable Long id
    ) {
        SupplierInvoice invoice = supplierInvoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE_SUPPLIER_INVOICE, "id", id));
        return ResponseEntity.ok(supplierInvoiceParserService.auditFrenchCompliance(invoice));
    }

    /**
     * Downloads the raw embedded Factur-X XML data document if present.
     *
     * @param id invoice identifier
     * @return XML content with text/xml content-type
     */
    @GetMapping(value = "/{id}/download-xml", produces = MediaType.APPLICATION_XML_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Download Factur-X XML", description = "Downloads raw embedded Factur-X XML document")
    @ApiResponse(responseCode = "200", description = "XML content returned")
    @ApiResponse(responseCode = "404", description = "Invoice or embedded XML not found")
    public ResponseEntity<String> downloadXml(
            @Parameter(description = "Invoice identifier") @PathVariable Long id
    ) {
        SupplierInvoice invoice = supplierInvoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE_SUPPLIER_INVOICE, "id", id));
        if (invoice.getRawXmlContent() == null || invoice.getRawXmlContent().isBlank()) {
            throw new BusinessException("No embedded XML document found for invoice " + invoice.getInvoiceNumber());
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"factur-x-" + invoice.getInvoiceNumber() + ".xml\"")
                .contentType(MediaType.APPLICATION_XML)
                .body(invoice.getRawXmlContent());
    }

    /**
     * Deletes an unapplied supplier invoice.
     *
     * @param id invoice identifier
     * @return empty response
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Delete unapplied invoice", description = "Deletes draft or rejected supplier invoice")
    @ApiResponse(responseCode = "204", description = "Invoice deleted")
    @ApiResponse(responseCode = "400", description = "Cannot delete already applied invoice")
    public ResponseEntity<Void> deleteInvoice(
            @Parameter(description = "Invoice identifier") @PathVariable Long id
    ) {
        SupplierInvoice invoice = supplierInvoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE_SUPPLIER_INVOICE, "id", id));
        if (invoice.getStatus() == SupplierInvoiceStatus.APPLIED) {
            throw new BusinessException("Cannot delete invoice " + invoice.getInvoiceNumber() + " because it has already been applied into inventory");
        }
        supplierInvoiceRepository.delete(invoice);
        return ResponseEntity.noContent().build();
    }

    private User resolveUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return null;
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }
}
