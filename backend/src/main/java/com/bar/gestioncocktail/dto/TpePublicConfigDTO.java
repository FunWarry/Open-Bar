package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Public configuration information for staff dashboards about available payment terminals.
 *
 * @param enabled          Whether electronic payment terminal module and hardware integration are enabled
 * @param simulatorEnabled Whether TPE simulator mode is currently active
 * @param barIpConfigured  Whether Bar counter terminal IP is configured
 * @param floorIpConfigured Whether Floor waiter terminal IP is configured
 * @param port             Target TCP port
 * @param terminalId       Terminal identifier
 * @param timeoutSeconds   Transaction timeout in seconds
 */
@Schema(description = "Public payment terminal configuration for staff workstations")
public record TpePublicConfigDTO(
    @Schema(description = "Whether TPE integration is active", example = "true")
    boolean enabled,

    @Schema(description = "Whether simulator mode is enabled", example = "false")
    boolean simulatorEnabled,

    @Schema(description = "Whether BAR terminal is configured", example = "true")
    boolean barIpConfigured,

    @Schema(description = "Whether FLOOR terminal is configured", example = "false")
    boolean floorIpConfigured,

    @Schema(description = "Concert communication TCP port", example = "8888")
    int port,

    @Schema(description = "Terminal identifier", example = "01")
    String terminalId,

    @Schema(description = "Transaction timeout in seconds", example = "45")
    int timeoutSeconds
) {}
