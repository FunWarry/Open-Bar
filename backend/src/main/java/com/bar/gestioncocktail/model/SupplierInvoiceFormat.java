package com.bar.gestioncocktail.model;

/**
 * Format and digital source standard of an imported supplier invoice.
 */
public enum SupplierInvoiceFormat {

    /**
     * French & European hybrid standard PDF containing an embedded XML data file (EN 16931 / ZUGFeRD 2.x).
     */
    FACTUR_X,

    /**
     * Standard non-structured PDF invoice parsed using text heuristics and distributor layouts.
     */
    STANDARD_PDF,

    /**
     * Direct structured electronic invoice XML document (Factur-X / CII or UBL 2.1).
     */
    XML_DIRECT
}
