package com.bar.gestioncocktail.model;

/**
 * Lifecycle states of an electronic card payment transaction dispatched to a physical TPE.
 */
public enum TpeTransactionStatus {
    /**
     * Transaction initiated and dispatched to the terminal.
     */
    INITIATED,

    /**
     * Terminal is awaiting customer card presentation, insertion, or contactless tap.
     */
    WAITING_CARD,

    /**
     * Card presented; PIN entry or bank authorization in progress.
     */
    PROCESSING,

    /**
     * Card transaction successfully authorized and settled.
     */
    APPROVED,

    /**
     * Transaction declined by terminal or issuing bank.
     */
    DECLINED,

    /**
     * Transaction explicitly cancelled by customer, merchant, or staff.
     */
    CANCELLED,

    /**
     * Terminal socket communication error or timeout.
     */
    ERROR
}
