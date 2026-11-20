package com.bar.gestioncocktail.dto.relay;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Result of an on-demand Cloud Relay connectivity, subdomain, and custom CNAME verification probe.
 *
 * @param success           Whether the diagnostic probe succeeded
 * @param latencyMs         Measured round-trip latency in milliseconds
 * @param status            Machine-readable status code (OK, SIMULATED_OK, MISCONFIGURED, UNREACHABLE)
 * @param message           Human-readable diagnostic summary
 * @param resolvedPublicUrl Effective public URL validated
 * @param dnsVerified       Whether custom domain / subdomain resolution passed check
 * @param tlsReady          Whether TLS termination on the public endpoint is valid/expected
 */
@Schema(description = "Diagnostic result for Cloud Relay tunnel connectivity and custom domain resolution")
public record CloudRelayDiagnosticDTO(
        boolean success,
        long latencyMs,
        String status,
        String message,
        String resolvedPublicUrl,
        boolean dnsVerified,
        boolean tlsReady
) {
}
