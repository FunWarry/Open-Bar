package com.bar.gestioncocktail.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " #" + id + " introuvable");
    }

    public ResourceNotFoundException(String resourceName, String fieldName, Object value) {
        super(resourceName + " avec " + fieldName + " = '" + value + "' introuvable");
    }
}
