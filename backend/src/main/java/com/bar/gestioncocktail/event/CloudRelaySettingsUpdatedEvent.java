package com.bar.gestioncocktail.event;

/**
 * Application event published whenever establishment settings affecting the Cloud Relay tunnel
 * or white-label domain mapping are updated.
 */
public record CloudRelaySettingsUpdatedEvent(boolean cloudRelayEnabled, String venueSlug, String customDomain) {
}
