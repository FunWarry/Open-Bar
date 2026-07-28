package com.bar.gestioncocktail.exception;

/**
 * Exception levée lors d'une violation de règle métier (mappée vers HTTP 400 Bad Request par {@link GlobalExceptionHandler}).
 */
public class BusinessException extends RuntimeException {

    /**
     * Constructeur avec message d'erreur métier.
     *
     * @param message Message d'explication de l'erreur
     */
    public BusinessException(String message) {
        super(message);
    }
}
