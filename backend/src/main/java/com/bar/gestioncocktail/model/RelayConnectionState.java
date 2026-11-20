package com.bar.gestioncocktail.model;

/**
 * Operational connection states for the outbound Cloud Relay reverse tunnel.
 */
public enum RelayConnectionState {
    /** Tunnel is intentionally disconnected or disabled. */
    DISCONNECTED,
    /** Tunnel handshake to the Cloud Relay gateway is in progress. */
    CONNECTING,
    /** Persistent WebSocket tunnel is open and actively routing traffic. */
    CONNECTED,
    /** Tunnel lost connectivity and is waiting for exponential backoff retry. */
    RECONNECTING,
    /** Local simulator mode active (dev/test/demo without external relay). */
    SIMULATED,
    /** Tunnel encountered a non-recoverable or authentication error. */
    ERROR
}
