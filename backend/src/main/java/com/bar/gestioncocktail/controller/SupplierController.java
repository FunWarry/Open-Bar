package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.SupplierCreateRequest;
import com.bar.gestioncocktail.dto.SupplierDTO;
import com.bar.gestioncocktail.service.SupplierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for beverage and produce supplier management.
 */
@RestController
@RequestMapping("/api/suppliers")
@Tag(name = "Suppliers", description = "Beverage and produce supplier directory endpoints")
public class SupplierController {

    private final SupplierService supplierService;

    /**
     * Constructs the SupplierController with required dependencies.
     *
     * @param supplierService supplier business service
     */
    @Autowired
    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    /**
     * Retrieves all suppliers.
     *
     * @return list of suppliers
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "List all suppliers", description = "Retrieves all suppliers ordered by company name")
    @ApiResponse(responseCode = "200", description = "Suppliers retrieved successfully")
    public ResponseEntity<List<SupplierDTO>> getAllSuppliers() {
        return ResponseEntity.ok(supplierService.getAllSuppliers());
    }

    /**
     * Retrieves only active suppliers.
     *
     * @return list of active suppliers
     */
    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "List active suppliers", description = "Retrieves active suppliers available for purchasing")
    @ApiResponse(responseCode = "200", description = "Active suppliers retrieved successfully")
    public ResponseEntity<List<SupplierDTO>> getActiveSuppliers() {
        return ResponseEntity.ok(supplierService.getActiveSuppliers());
    }

    /**
     * Searches suppliers by keyword.
     *
     * @param q search query string
     * @return list of matching suppliers
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Search suppliers", description = "Filters suppliers by name, contact, or email keyword")
    @ApiResponse(responseCode = "200", description = "Matching suppliers retrieved")
    public ResponseEntity<List<SupplierDTO>> searchSuppliers(
            @Parameter(description = "Keyword to search") @RequestParam(value = "q", required = false) String q
    ) {
        return ResponseEntity.ok(supplierService.searchSuppliers(q));
    }

    /**
     * Retrieves a supplier by its identifier.
     *
     * @param id supplier identifier
     * @return supplier DTO
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Get supplier by ID", description = "Retrieves a single supplier by unique identifier")
    @ApiResponse(responseCode = "200", description = "Supplier found")
    @ApiResponse(responseCode = "404", description = "Supplier not found")
    public ResponseEntity<SupplierDTO> getSupplierById(
            @Parameter(description = "Supplier ID") @PathVariable Long id
    ) {
        return ResponseEntity.ok(supplierService.getSupplierById(id));
    }

    /**
     * Creates a new supplier.
     *
     * @param request creation payload
     * @return created supplier DTO
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create supplier", description = "Registers a new beverage or produce supplier")
    @ApiResponse(responseCode = "201", description = "Supplier created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid payload")
    public ResponseEntity<SupplierDTO> createSupplier(@Valid @RequestBody SupplierCreateRequest request) {
        SupplierDTO created = supplierService.createSupplier(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing supplier.
     *
     * @param id      supplier identifier
     * @param request update payload
     * @return updated supplier DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update supplier", description = "Updates company details and terms for an existing supplier")
    @ApiResponse(responseCode = "200", description = "Supplier updated successfully")
    @ApiResponse(responseCode = "404", description = "Supplier not found")
    public ResponseEntity<SupplierDTO> updateSupplier(
            @Parameter(description = "Supplier ID") @PathVariable Long id,
            @Valid @RequestBody SupplierCreateRequest request
    ) {
        return ResponseEntity.ok(supplierService.updateSupplier(id, request));
    }

    /**
     * Deactivates a supplier (soft-delete).
     *
     * @param id supplier identifier
     * @return no content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Deactivate supplier", description = "Sets supplier active flag to false")
    @ApiResponse(responseCode = "204", description = "Supplier deactivated")
    @ApiResponse(responseCode = "404", description = "Supplier not found")
    public ResponseEntity<Void> deleteSupplier(
            @Parameter(description = "Supplier ID") @PathVariable Long id
    ) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Runs migration of legacy free-text supplier names on ingredients.
     *
     * @return HTTP 200 OK
     */
    @PostMapping("/migrate-legacy")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Migrate legacy supplier names", description = "Converts free-text supplier strings to entities")
    @ApiResponse(responseCode = "200", description = "Migration executed successfully")
    public ResponseEntity<Void> migrateLegacySuppliers() {
        supplierService.migrateLegacyFournisseurNames();
        return ResponseEntity.ok().build();
    }
}
