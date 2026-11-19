package com.bar.gestioncocktail.model;

/**
 * Reconciliation comparison status between an invoiced line item and the reference purchase order / stock ingredient.
 */
public enum InvoiceItemReconciliationStatus {

    /**
     * Quantities, unit costs, and product references match the purchase order within configured tolerances.
     */
    MATCHED,

    /**
     * The unit price invoiced deviates from the unit price contracted on the purchase order.
     */
    PRICE_VARIANCE,

    /**
     * The invoiced quantity differs from the quantity ordered or recorded on the delivery slip.
     */
    QUANTITY_VARIANCE,

    /**
     * Item present and billed on the supplier invoice but was not included in the original purchase order.
     */
    UNEXPECTED_ITEM,

    /**
     * Item ordered on the purchase order but completely omitted or missing from the supplier invoice.
     */
    MISSING_ORDER_ITEM,

    /**
     * Invoiced product cannot be mapped automatically to any known ingredient in the establishment catalog.
     */
    UNRECOGNIZED_INGREDIENT
}
