package com.bar.gestioncocktail.exception;

/**
 * Exception thrown when a requested resource is not found in database (mapped to HTTP 404 Not Found by {@link GlobalExceptionHandler}).
 */
public class ResourceNotFoundException extends RuntimeException {

    /**
     * Constructs the exception with a direct message.
     *
     * @param message Error message
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }

    /**
     * Formats an exception for a resource identified by ID.
     *
     * @param resourceName Resource type name (e.g. "Order", "Table")
     * @param id Identifier of the resource
     */
    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " #" + id + " not found");
    }

    /**
     * Formats an exception for a resource identified by a specific field.
     *
     * @param resourceName Resource type name
     * @param fieldName Search field name
     * @param value Search value
     */
    public ResourceNotFoundException(String resourceName, String fieldName, Object value) {
        super(resourceName + " with " + fieldName + " = '" + value + "' not found");
    }
}
