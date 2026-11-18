package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Response payload returned after uploading and parsing a supplier invoice file.
 */
@Schema(description = "Upload and parsing result for a supplier invoice")
public record SupplierInvoiceUploadResponseDTO(
        SupplierInvoiceDTO invoice,
        boolean duplicate,
        String message,
        List<String> warnings
) {
}
