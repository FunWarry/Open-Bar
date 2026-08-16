package com.bar.gestioncocktail.exception;

/**
 * Exception thrown when an ingredient's stock is insufficient to fulfill an order.
 */
public class StockInsuffisantException extends BusinessException {

    /**
     * Constructs the exception with an out-of-stock message.
     *
     * @param message Message describing missing stock
     */
    public StockInsuffisantException(String message) {
        super(message);
    }
}
