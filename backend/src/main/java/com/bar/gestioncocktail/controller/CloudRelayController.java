package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.relay.CloudRelayDiagnosticDTO;
import com.bar.gestioncocktail.dto.relay.CloudRelayStatusDTO;
import com.bar.gestioncocktail.service.relay.CloudRelayTunnelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller managing outbound Cloud Relay reverse tunnel lifecycle, diagnostics,
 * and configurable multi-tier remote access status.
 */
@RestController
@RequestMapping("/api/admin/cloud-relay")
@Tag(name = "Cloud Relay Tunnel", description = "Outbound reverse tunnel status, diagnostics, and connection lifecycle management")
public class CloudRelayController {

    private final CloudRelayTunnelService tunnelService;

    /**
     * Constructs CloudRelayController with the tunnel lifecycle service.
     *
     * @param tunnelService Outbound Cloud Relay tunnel service
     */
    public CloudRelayController(CloudRelayTunnelService tunnelService) {
        this.tunnelService = tunnelService;
    }

    /**
     * Retrieves live Cloud Relay tunnel status, public URL, latency metrics, and access policies.
     *
     * @return {@link CloudRelayStatusDTO}
     */
    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get Cloud Relay tunnel status", description = "Returns live connection state, resolved subdomain/custom domain URL, and access policy flags.")
    @ApiResponse(responseCode = "200", description = "Status retrieved")
    public ResponseEntity<CloudRelayStatusDTO> getStatus() {
        return ResponseEntity.ok(tunnelService.getStatus());
    }

    /**
     * Initiates or forces reconnection of the outbound Cloud Relay tunnel.
     *
     * @return Updated {@link CloudRelayStatusDTO}
     */
    @PostMapping("/connect")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Connect Cloud Relay tunnel", description = "Starts or restarts the persistent outbound reverse tunnel to the Cloud Relay gateway.")
    @ApiResponse(responseCode = "200", description = "Connection triggered")
    public ResponseEntity<CloudRelayStatusDTO> connect() {
        return ResponseEntity.ok(tunnelService.connect());
    }

    /**
     * Gracefully closes the outbound Cloud Relay tunnel.
     *
     * @return Updated {@link CloudRelayStatusDTO}
     */
    @PostMapping("/disconnect")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Disconnect Cloud Relay tunnel", description = "Gracefully closes the outbound reverse tunnel and terminates bridged streams.")
    @ApiResponse(responseCode = "200", description = "Disconnected")
    public ResponseEntity<CloudRelayStatusDTO> disconnect() {
        return ResponseEntity.ok(tunnelService.disconnect());
    }

    /**
     * Runs connectivity, subdomain, and optional custom CNAME DNS diagnostics.
     *
     * @return {@link CloudRelayDiagnosticDTO}
     */
    @PostMapping("/test")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Run Cloud Relay diagnostics", description = "Verifies subdomain configuration, optional custom domain DNS resolution, and tunnel health.")
    @ApiResponse(responseCode = "200", description = "Diagnostics completed")
    public ResponseEntity<CloudRelayDiagnosticDTO> runDiagnostics() {
        return ResponseEntity.ok(tunnelService.runDiagnostics());
    }

    /**
     * Simulates an internet outage in simulator mode to test graceful offline fallback UI.
     *
     * @return Updated {@link CloudRelayStatusDTO}
     */
    @PostMapping("/simulator/disconnect")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Simulate tunnel outage", description = "Simulates a local internet outage when simulator mode is enabled.")
    @ApiResponse(responseCode = "200", description = "Simulated disconnect active")
    public ResponseEntity<CloudRelayStatusDTO> simulateDisconnect() {
        return ResponseEntity.ok(tunnelService.simulateDisconnect());
    }

    /**
     * Restores the simulated tunnel back to connected state.
     *
     * @return Updated {@link CloudRelayStatusDTO}
     */
    @PostMapping("/simulator/reconnect")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Restore simulated tunnel", description = "Restores tunnel connectivity from simulated outage state.")
    @ApiResponse(responseCode = "200", description = "Simulated tunnel restored")
    public ResponseEntity<CloudRelayStatusDTO> simulateReconnect() {
        return ResponseEntity.ok(tunnelService.simulateReconnect());
    }
}
