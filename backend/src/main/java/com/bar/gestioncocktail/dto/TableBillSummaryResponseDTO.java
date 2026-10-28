package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;

/**
 * Output DTO providing a live comprehensive breakdown of a table's bill for patron mobile self-checkout.
 * Details overall table orders, tax sub-totals, already recorded payments, remaining balance,
 * and individual consumptions associated with the active guest.
 *
 * @param tableId Table entity identifier
 * @param tableNumero Visible table number
 * @param ordersCount Number of active rounds/orders included
 * @param items Detailed list of drink items consumed at the table
 * @param totalHT Pre-tax subtotal
 * @param totalVAT Total VAT amount
 * @param totalTTC Total gross bill amount including taxes
 * @param alreadyPaidAmount Sum of all previously recorded payments for this session
 * @param remainingBalance Net balance remaining to settle (totalTTC - alreadyPaidAmount)
 * @param isFullySettled Whether the table addition is 100% paid
 * @param reglements Previously recorded settlement shares
 * @param myConsumptions Items ordered by the calling guest in the collaborative session
 * @param mySubTotal Subtotal for the calling guest's individual items
 * @param onlinePaymentEnabled Whether the online pay-at-table module is active
 * @param paymentProvider Configured gateway provider ('STRIPE' or 'SANDBOX')
 * @param stripePublishableKey Public Stripe key for Elements initialization (null in Sandbox)
 */
@Schema(description = "Live breakdown of a table's bill for mobile pay-at-table patron self-checkout")
public record TableBillSummaryResponseDTO(
        @Schema(description = "Table identifier", example = "4")
        Long tableId,

        @Schema(description = "Table number", example = "12")
        Integer tableNumero,

        @Schema(description = "Number of active orders on the bill", example = "2")
        int ordersCount,

        @Schema(description = "Itemized breakdown of consumed beverages")
        List<TableAdditionItemDTO> items,

        @Schema(description = "Pre-tax subtotal amount", example = "25.00")
        BigDecimal totalHT,

        @Schema(description = "Total VAT amount", example = "5.00")
        BigDecimal totalVAT,

        @Schema(description = "Total gross bill amount (TTC)", example = "30.00")
        BigDecimal totalTTC,

        @Schema(description = "Sum of already settled parts", example = "10.00")
        BigDecimal alreadyPaidAmount,

        @Schema(description = "Remaining balance to settle", example = "20.00")
        BigDecimal remainingBalance,

        @Schema(description = "Whether the table has reached zero remaining balance", example = "false")
        boolean isFullySettled,

        @Schema(description = "List of recorded payments/settlements for this bill")
        List<FactureReglementDTO> reglements,

        @Schema(description = "Items specifically ordered by the current patron")
        List<TableAdditionItemDTO> myConsumptions,

        @Schema(description = "Subtotal for the current patron's individual consumptions", example = "12.50")
        BigDecimal mySubTotal,

        @Schema(description = "Whether online payment module is active", example = "true")
        boolean onlinePaymentEnabled,

        @Schema(description = "Active online payment provider", example = "STRIPE")
        String paymentProvider,

        @Schema(description = "Stripe publishable key (pk_test_...)", example = "pk_test_sample")
        String stripePublishableKey
) {}
