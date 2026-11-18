package com.bar.gestioncocktail.model;

/**
 * Status of mandatory French legal and electronic invoicing compliance verification.
 */
public enum SupplierInvoiceComplianceStatus {

    /**
     * All mandatory French commercial and tax mentions are fully present and mathematically consistent.
     */
    COMPLIANT,

    /**
     * Minor non-blocking legal warnings identified (e.g. missing optional delivery note ref).
     */
    WARNINGS,

    /**
     * Blocking non-compliance detected (e.g. missing seller SIREN, duplicate number, invalid VAT calculation).
     */
    NON_COMPLIANT
}
