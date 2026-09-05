package com.bar.gestioncocktail.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when an action or order placement is attempted with an invalid, expired, or closed table session token.
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class InvalidTableSessionException extends RuntimeException {

    /**
     * Constructs the exception with an explanatory English error message.
     *
     * @param message Detailed reason for rejection
     */
    public InvalidTableSessionException(String message) {
        super(message);
    }
}
