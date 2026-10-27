package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Output DTO returned upon confirmed online payment settlement.
 *
 * @param transactionId Unique transaction reference
 * @param factureId Settled invoice ID
 * @param reglementId Recorded payment share ID
 * @param status Final transaction status ('SUCCEEDED')
 * @param amount Base settled amount
 * @param tip Tip amount
 * @param totalCharged Total charged amount
 * @param remainingBalance Net balance left to settle on the table addition
 * @param isFullySettled Whether the table addition is now 100% paid
 * @param isTableLiberated Whether the table was liberated upon settlement
 * @param receiptPdfUrl Public URL for downloading the legal PDF receipt
 */
@Schema(description = "Confirmation and settlement summary after successful online mobile payment")
public record PaymentSuccessResponseDTO(
        @Schema(description = "Transaction reference", example = "pi_3Nxyz123456789")
        String transactionId,

        @Schema(description = "Associated invoice ID", example = "42")
        Long factureId,

        @Schema(description = "Associated payment settlement share ID", example = "88")
        Long reglementId,

        @Schema(description = "Transaction status", example = "SUCCEEDED")
        String status,

        @Schema(description = "Amount settled", example = "15.00")
        BigDecimal amount,

        @Schema(description = "Tip amount", example = "2.00")
        BigDecimal tip,

        @Schema(description = "Total charged", example = "17.00")
        BigDecimal totalCharged,

        @Schema(description = "Remaining balance on table bill", example = "0.00")
        BigDecimal remainingBalance,

        @Schema(description = "Whether the total table bill is 100% paid", example = "true")
        boolean isFullySettled,

        @Schema(description = "Whether the physical table was marked free", example = "true")
        boolean isTableLiberated,

        @Schema(description = "Direct PDF receipt download endpoint")
        String receiptPdfUrl
) {}
