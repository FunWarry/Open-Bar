package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TpeTransactionStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data Transfer Object representing the current or final status of a payment terminal transaction.
 *
 * @param transactionId      Unique tracking UUID generated for the transaction
 * @param status             Current lifecycle state of the card transaction
 * @param amount             Transaction amount in decimal currency
 * @param currencyCode       ISO currency code
 * @param authorizationCode  Authorization number returned by the terminal (when approved)
 * @param terminalId         Terminal identifier (TID)
 * @param cardBrand          Card brand/scheme (e.g. CB, VISA, MASTERCARD)
 * @param maskedPan          Masked card primary account number (e.g. **** **** **** 4242)
 * @param sequenceNumber     Transaction sequence number / STAN (Système de Télécollecte)
 * @param message            Informative status message or error explanation
 * @param timestamp          Timestamp of transaction event
 */
@Schema(description = "Payment terminal transaction response and status")
public record TpePaymentResponseDTO(
    @Schema(description = "Unique transaction tracking UUID", example = "550e8400-e29b-41d4-a716-446655440000")
    String transactionId,

    @Schema(description = "Transaction lifecycle status", example = "APPROVED")
    TpeTransactionStatus status,

    @Schema(description = "Charged amount", example = "15.50")
    BigDecimal amount,

    @Schema(description = "Currency code", example = "EUR")
    String currencyCode,

    @Schema(description = "Banking authorization code", example = "AUTH-892011")
    String authorizationCode,

    @Schema(description = "Terminal ID", example = "01")
    String terminalId,

    @Schema(description = "Card brand / scheme", example = "CB")
    String cardBrand,

    @Schema(description = "Masked card number", example = "************4242")
    String maskedPan,

    @Schema(description = "Transaction sequence number / STAN", example = "000123")
    String sequenceNumber,

    @Schema(description = "Status or failure message", example = "Payment approved")
    String message,

    @Schema(description = "Event timestamp")
    LocalDateTime timestamp
) {
    /**
     * Helper factory for creating an initial pending response.
     *
     * @param transactionId Tracking UUID
     * @param amount        Transaction amount
     * @param currencyCode  Currency code
     * @param terminalId    Terminal ID
     * @param message       Initial message
     * @return Initialized DTO in INITIATED status
     */
    public static TpePaymentResponseDTO initiated(String transactionId, BigDecimal amount, String currencyCode, String terminalId, String message) {
        return new TpePaymentResponseDTO(
            transactionId,
            TpeTransactionStatus.INITIATED,
            amount,
            currencyCode,
            null,
            terminalId,
            null,
            null,
            null,
            message,
            LocalDateTime.now(java.time.ZoneId.systemDefault())
        );
    }
}
