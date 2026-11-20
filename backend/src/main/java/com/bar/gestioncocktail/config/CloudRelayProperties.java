package com.bar.gestioncocktail.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Externalized configuration properties for the OpenBar outbound Cloud Relay tunnel
 * and per-venue subdomain / custom domain routing ({@code openbar.relay.*}).
 */
@ConfigurationProperties(prefix = "openbar.relay")
public class CloudRelayProperties {

    /** Whether automatic outbound tunnel connection on startup is enabled globally. */
    private boolean enabled = false;

    /** Remote Cloud Relay gateway WebSocket URL. */
    private String relayUrl = "wss://relay.open-bar.eu/ws/tunnel";

    /** Base public domain used for per-venue subdomains (e.g. {@code <slug>.open-bar.eu}). */
    private String baseDomain = "open-bar.eu";

    /** Enables local in-memory tunnel simulation for dev/test/demo environments without external relay. */
    private boolean simulatorEnabled = false;

    /** Initial exponential backoff delay in milliseconds before reconnect attempts. */
    private long reconnectInitialDelayMs = 1000L;

    /** Maximum exponential backoff delay in milliseconds between reconnect attempts. */
    private long reconnectMaxDelayMs = 60000L;

    /** Heartbeat ping interval in milliseconds over the persistent tunnel WebSocket. */
    private long heartbeatIntervalMs = 15000L;

    /** Local loopback base URL targeted when dispatching tunneled HTTP requests. */
    private String localTargetUrl = "http://127.0.0.1:8080";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getRelayUrl() {
        return relayUrl;
    }

    public void setRelayUrl(String relayUrl) {
        this.relayUrl = relayUrl;
    }

    public String getBaseDomain() {
        return baseDomain;
    }

    public void setBaseDomain(String baseDomain) {
        this.baseDomain = baseDomain;
    }

    public boolean isSimulatorEnabled() {
        return simulatorEnabled;
    }

    public void setSimulatorEnabled(boolean simulatorEnabled) {
        this.simulatorEnabled = simulatorEnabled;
    }

    public long getReconnectInitialDelayMs() {
        return reconnectInitialDelayMs;
    }

    public void setReconnectInitialDelayMs(long reconnectInitialDelayMs) {
        this.reconnectInitialDelayMs = reconnectInitialDelayMs;
    }

    public long getReconnectMaxDelayMs() {
        return reconnectMaxDelayMs;
    }

    public void setReconnectMaxDelayMs(long reconnectMaxDelayMs) {
        this.reconnectMaxDelayMs = reconnectMaxDelayMs;
    }

    public long getHeartbeatIntervalMs() {
        return heartbeatIntervalMs;
    }

    public void setHeartbeatIntervalMs(long heartbeatIntervalMs) {
        this.heartbeatIntervalMs = heartbeatIntervalMs;
    }

    public String getLocalTargetUrl() {
        return localTargetUrl;
    }

    public void setLocalTargetUrl(String localTargetUrl) {
        this.localTargetUrl = localTargetUrl;
    }
}
