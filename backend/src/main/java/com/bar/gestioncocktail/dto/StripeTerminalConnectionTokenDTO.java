package com.bar.gestioncocktail.dto;

/**
 * Response DTO containing a short-lived Stripe Terminal ConnectionToken secret
 * for pairing smart Android readers (e.g. WisePOS E) or running in dev simulator mode.
 *
 * @param secret     Stripe Terminal connection token secret
 * @param simulator  True when running in local dev/demo simulator fallback
 * @param readerId   Configured Stripe Terminal reader ID if set
 * @param locationId Configured Stripe Terminal location ID if set
 */
public record StripeTerminalConnectionTokenDTO(
        String secret,
        boolean simulator,
        String readerId,
        String locationId
) {
}
