package com.bar.gestioncocktail.dto.relay;

/**
 * Control and data frame types multiplexed across the persistent outbound Cloud Relay WebSocket tunnel.
 */
public enum RelayFrameType {
    /** Initial establishment registration frame sent upon WebSocket connection. */
    REGISTER,
    /** Acknowledgement frame returned by the Cloud Relay gateway with assigned public host metadata. */
    REGISTER_ACK,
    /** Proxied inbound HTTP request sent from the Cloud Relay gateway to the local OpenBar backend. */
    HTTP_REQUEST,
    /** HTTP response returned by the local OpenBar backend back through the tunnel. */
    HTTP_RESPONSE,
    /** Opens a bridged STOMP/WebSocket stream over the tunnel. */
    WS_OPEN,
    /** Forwards a STOMP/WebSocket text or binary frame over an active stream. */
    WS_FRAME,
    /** Closes a bridged STOMP/WebSocket stream. */
    WS_CLOSE,
    /** Heartbeat probe frame. */
    PING,
    /** Heartbeat acknowledgement frame. */
    PONG,
    /** Graceful tunnel termination notice. */
    DISCONNECT
}
