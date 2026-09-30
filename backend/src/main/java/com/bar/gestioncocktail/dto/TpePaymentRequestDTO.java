package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TpeTerminalRole;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request payload for dispatching a payment transaction to a physical or simulated TPE.
 *
 * @param montant       Transaction amount to charge in decimal currency units (e.g. 12.50)
 * @param currencyCode  3-letter ISO currency code (defaults to EUR)
 * @param terminalRole  Target terminal station role (BAR or FLOOR)
 * @param terminalIp    Optional direct IP override for testing or ad-hoc routing
 * @param terminalPort  Optional direct TCP port override
 * @param reference     Transaction business reference (e.g. order tracking or table reference)
 */
@Schema(description = "Request payload for dispatching a payment to a physical or simulated TPE terminal")
public record TpePaymentRequestDTO(
    @NotNull(message = "Payment amount is mandatory")
    @DecimalMin(value = "0.01", message = "Payment amount must be greater than zero")
    @Schema(description = "Payment amount to charge", example = "15.50")
    BigDecimal montant,

    @Schema(description = "Currency code ISO-4217", example = "EUR", defaultValue = "EUR")
    String currencyCode,

    @Schema(description = "Terminal station role", example = "BAR", defaultValue = "BAR")
    TpeTerminalRole terminalRole,

    @Schema(description = "Optional custom terminal IP override", example = "terminal-bar.local")
    String terminalIp,

    @Schema(description = "Optional custom terminal TCP port override", example = "8888")
    Integer terminalPort,

    @Schema(description = "Invoice or business reference for transaction matching", example = "TAB-12")
    String reference
) {
    /**
     * Helper to resolve the effective currency code, defaulting to EUR.
     *
     * @return 3-letter currency code
     */
    public String resolveCurrencyCode() {
        return (currencyCode != null && !currencyCode.isBlank()) ? currencyCode.trim().toUpperCase() : "EUR";
    }

    /**
     * Helper to resolve the target terminal role, defaulting to BAR.
     *
     * @return TpeTerminalRole
     */
    public TpeTerminalRole resolveRole() {
        return terminalRole != null ? terminalRole : TpeTerminalRole.BAR;
    }
}
