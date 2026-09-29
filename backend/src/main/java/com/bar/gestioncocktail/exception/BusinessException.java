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

    /**
     * Constructs the exception with a business error message and an underlying cause.
     *
     * @param message Explanatory error message
     * @param cause   Underlying root cause
     */
    public BusinessException(String message, Throwable cause) {
        super(message, cause);
    }
}
