package com.bar.gestioncocktail.model;

/**
 * Classification of physical cash movements occurring in the cash drawer during daily operations.
 */
public enum CashMovementType {

    /**
     * Cash deposit into the drawer (e.g. coin rolls or small banknote replenishment from the safe).
     */
    CASH_IN,

    /**
     * Cash skim/drop out of the drawer transferred to the safe to reduce robbery risk during busy periods.
     */
    CASH_DROP,

    /**
     * Petty cash expense paid out directly from the till (e.g. emergency market purchase, courier tip, taxi).
     */
    PAID_OUT
}
