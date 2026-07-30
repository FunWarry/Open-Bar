package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.EstablishmentConfig;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.Instant;
import java.util.List;

/**
 * Centralized service for application time and timezone resolution.
 * Configured dynamically via establishment settings or falling back to system default.
 */
@Service
public class TimeService {

    private final EstablishmentConfigService establishmentConfigService;
    private volatile ZoneId cachedZoneId;

    /**
     * Constructor for {@link TimeService}.
     *
     * @param establishmentConfigService service providing establishment configuration
     */
    public TimeService(EstablishmentConfigService establishmentConfigService) {
        this.establishmentConfigService = establishmentConfigService;
    }

    /**
     * Clears the cached timezone forcing re-resolution on next access.
     */
    public void clearCache() {
        this.cachedZoneId = null;
    }

    /**
     * Resolves the configured {@link ZoneId}.
     * Falls back to {@link ZoneId#systemDefault()} if set to "SYSTEM", blank, or invalid.
     *
     * @return active {@link ZoneId}
     */
    public ZoneId getZoneId() {
        if (cachedZoneId != null) {
            return cachedZoneId;
        }

        if (establishmentConfigService != null) {
            try {
                EstablishmentConfig config = establishmentConfigService.getConfig();
                if (config != null && config.getTimeZone() != null) {
                    String tz = config.getTimeZone().trim();
                    if (!tz.isBlank() && !"SYSTEM".equalsIgnoreCase(tz)) {
                        cachedZoneId = ZoneId.of(tz);
                        return cachedZoneId;
                    }
                }
            } catch (Exception _) {
                // Fallback gracefully to system default zone if config lookup fails
            }
        }
        cachedZoneId = ZoneId.systemDefault();
        return cachedZoneId;
    }


    /**
     * Obtains a {@link Clock} using the configured zone.
     *
     * @return {@link Clock} using configured time zone
     */
    public Clock getClock() {
        return Clock.system(getZoneId());
    }

    /**
     * Obtains the current {@link LocalDateTime} in the configured zone.
     *
     * @return current {@link LocalDateTime}
     */
    public LocalDateTime now() {
        return LocalDateTime.now(getZoneId());
    }

    /**
     * Obtains the current {@link LocalDate} in the configured zone.
     *
     * @return current {@link LocalDate}
     */
    public LocalDate today() {
        return LocalDate.now(getZoneId());
    }

    /**
     * Obtains current {@link Instant} using the active clock.
     *
     * @return current {@link Instant}
     */
    public Instant nowInstant() {
        return Instant.now(getClock());
    }

    /**
     * Returns a list of commonly used timezone IDs for configuration selection.
     *
     * @return list of timezone strings
     */
    public List<String> getAvailableTimeZones() {
        return List.of(
            "SYSTEM",
            "Europe/Paris",
            "Europe/London",
            "Europe/Berlin",
            "Europe/Madrid",
            "Europe/Rome",
            "Europe/Brussels",
            "America/New_York",
            "America/Chicago",
            "America/Los_Angeles",
            "Asia/Tokyo",
            "Asia/Dubai",
            "UTC"
        );
    }
}
