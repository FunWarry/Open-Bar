package com.bar.gestioncocktail.exception;

/**
 * Exception thrown on business rule violations (mapped to HTTP 400 Bad Request by {@link GlobalExceptionHandler}).
 */
public class BusinessException extends RuntimeException {

    /**
     * Constructs the exception with a business error message.
     *
     * @param message Explanatory error message
     */
    public BusinessException(String message) {
        super(message);
    }
}
