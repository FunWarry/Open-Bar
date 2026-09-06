package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.PrinterRole;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for testing direct network socket connectivity to a thermal receipt printer.
 *
 * @param ip Network IPv4 address or hostname
 * @param port TCP raw printer port (default 9100)
 * @param role Printer role simulation (BAR, KITCHEN, CASH_DESK)
 */
@Schema(description = "Payload for testing direct socket connection to an ESC/POS printer")
public record PrinterConnectionTestRequest(
    @NotBlank(message = "Printer IP is required")
    @Size(max = 100, message = "Printer IP cannot exceed 100 characters")
    String ip,

    @Min(value = 1, message = "Printer port must be at least 1")
    @Max(value = 65535, message = "Printer port cannot exceed 65535")
    Integer port,

    PrinterRole role
) {
    /**
     * Secondary constructor defaulting role to BAR.
     *
     * @param ip Network IPv4 address
     * @param port TCP raw printer port
     */
    public PrinterConnectionTestRequest(String ip, Integer port) {
        this(ip, port, PrinterRole.BAR);
    }
}
