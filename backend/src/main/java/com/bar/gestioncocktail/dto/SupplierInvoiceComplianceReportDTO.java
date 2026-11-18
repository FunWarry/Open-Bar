package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.SupplierInvoiceComplianceStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Report detailing French legal and electronic invoicing compliance findings for an imported supplier invoice.
 */
@Schema(description = "French legal and e-invoicing compliance audit report")
public record SupplierInvoiceComplianceReportDTO(
        SupplierInvoiceComplianceStatus status,
        boolean hasMandatoryLegalMentions,
        boolean hasValidSiren,
        boolean hasValidVatBreakdown,
        boolean isMathConsistent,
        List<String> complianceIssues,
        List<String> complianceWarnings
) {
}
