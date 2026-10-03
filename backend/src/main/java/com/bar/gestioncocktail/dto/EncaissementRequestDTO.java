package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request payload for settling and closing a table's bill.
 *
 * @param modePaiement       Payment method (e.g. CARTE, ESPECES, TITRES_RESTAURANT, CHEQUES_VACANCES, VIREMENT, AUTRE, MIXTE_SPLIT)
 * @param pourboire          Optional tip amount in EUR
 * @param remiseMontant      Optional fixed discount amount in EUR
 * @param remisePourcentage  Optional percentage discount (0 to 100)
 * @param montantRecu        Optional cash amount received from the customer
 * @param notes              Optional payment notes or customer references
 * @param libererTable       Whether the table should be automatically freed upon full settlement (defaults to true)
 * @param commandeIds        Optional specific order IDs to settle (defaults to all active table orders)
 */
@Schema(description = "Request payload for table payment and settlement")
public record EncaissementRequestDTO(
    @NotBlank(message = "Payment method is mandatory")
    @Schema(description = "Payment method (CARTE, ESPECES, TITRES_RESTAURANT, CHEQUES_VACANCES, etc.)", example = "CARTE")
    String modePaiement,

    @PositiveOrZero(message = "Tip amount cannot be negative")
    @Schema(description = "Tip amount in EUR", example = "2.50")
    BigDecimal pourboire,

    @PositiveOrZero(message = "Discount amount cannot be negative")
    @Schema(description = "Fixed discount amount in EUR", example = "5.00")
    BigDecimal remiseMontant,

    @PositiveOrZero(message = "Discount percentage cannot be negative")
    @Schema(description = "Discount percentage (0 to 100)", example = "10.0")
    BigDecimal remisePourcentage,

    @PositiveOrZero(message = "Received amount cannot be negative")
    @Schema(description = "Cash amount received from customer", example = "50.00")
    BigDecimal montantRecu,

    @Schema(description = "Additional payment notes or remarks")
    String notes,

    @Schema(description = "Whether to automatically release the table after settlement", defaultValue = "true")
    Boolean libererTable,

    @Schema(description = "Specific order IDs to settle (optional)")
    List<Long> commandeIds,

    @Schema(description = "Payment terminal authorization code (if settled via TPE)", example = "AUTH-891023")
    String tpeAutorisation,

    @Schema(description = "Payment terminal identifier", example = "TPE-01")
    String tpeTerminalId,

    @Schema(description = "Payment card brand/scheme", example = "VISA")
    String tpeCardBrand,

    @Schema(description = "Masked card number PAN", example = "************4242")
    String tpeMaskedPan,

    @Schema(description = "TPE transaction sequence number / STAN", example = "000123")
    String tpeSequence
) {
    /**
     * Backwards-compatible 8-parameter constructor before TPE fields were added.
     */
    public EncaissementRequestDTO(
            String modePaiement,
            BigDecimal pourboire,
            BigDecimal remiseMontant,
            BigDecimal remisePourcentage,
            BigDecimal montantRecu,
            String notes,
            Boolean libererTable,
            List<Long> commandeIds
    ) {
        this(modePaiement, pourboire, remiseMontant, remisePourcentage, montantRecu, notes, libererTable, commandeIds, null, null, null, null, null);
    }

    /**
     * Helper returning whether the table should be released, defaulting to true if not specified.
     *
     * @return true if the table should be marked free
     */
    public boolean shouldLibererTable() {
        return !Boolean.FALSE.equals(libererTable);
    }
}

