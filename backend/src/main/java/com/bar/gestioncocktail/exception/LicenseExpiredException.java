package com.bar.gestioncocktail.exception;

/**
 * Exception thrown when an order-taking operation is attempted after the establishment's
 * license and its 2-day grace period have expired.
 * Mapped to HTTP 402 Payment Required by {@link GlobalExceptionHandler}.
 */
public class LicenseExpiredException extends RuntimeException {

    /**
     * Constructs a new LicenseExpiredException with a clear English error message.
     *
     * @param message Explanation of the license expiration block
     */
    public LicenseExpiredException(String message) {
        super(message);
    }
}
