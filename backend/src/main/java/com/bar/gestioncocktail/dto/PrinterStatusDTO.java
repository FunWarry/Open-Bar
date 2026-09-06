package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Status DTO reporting currently configured ESC/POS network printers.
 *
 * @param directPrintingEnabled Whether direct network socket printing is enabled
 * @param barPrinterIp LAN IP address of the bar preparation printer
 * @param kitchenPrinterIp LAN IP address of the kitchen preparation printer
 * @param cashDeskPrinterIp LAN IP address of the cash desk receipt printer
 * @param printerPort Network TCP port (default 9100)
 */
@Schema(description = "Configured ESC/POS thermal printer settings and status")
public record PrinterStatusDTO(
    Boolean directPrintingEnabled,
    String barPrinterIp,
    String kitchenPrinterIp,
    String cashDeskPrinterIp,
    Integer printerPort
) {}
