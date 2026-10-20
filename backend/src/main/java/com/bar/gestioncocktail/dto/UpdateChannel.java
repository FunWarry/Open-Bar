package com.bar.gestioncocktail.dto;

/**
 * Enumeration of release channels for system OTA updates.
 */
public enum UpdateChannel {
    /**
     * Official stable releases from master branch.
     */
    STABLE,

    /**
     * Pre-releases and beta builds from dev branch.
     */
    BETA
}
