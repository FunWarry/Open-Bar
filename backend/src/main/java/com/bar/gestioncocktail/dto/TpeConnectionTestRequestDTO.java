package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TpeTerminalRole;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Request payload for testing TCP socket connectivity to a physical payment terminal.
 *
 * @param role Target station role (BAR or FLOOR) if testing configured role IP
 * @param ip   Direct IP override for testing uncommitted form inputs
 * @param port Direct TCP port override
 */
@Schema(description = "Request payload for testing TPE terminal connectivity")
public record TpeConnectionTestRequestDTO(
    @Schema(description = "Target terminal role", example = "BAR")
    TpeTerminalRole role,

    @Schema(description = "Direct IP address to test", example = "tpe.local")
    String ip,

    @Schema(description = "Direct TCP port to test", example = "8888")
    Integer port
) {}
