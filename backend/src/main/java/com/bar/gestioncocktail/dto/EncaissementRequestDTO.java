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
    @NotBlank(message = "Le mode de paiement est obligatoire")
    @Schema(description = "Mode de paiement (CARTE, ESPECES, TITRES_RESTAURANT, CHEQUES_VACANCES, etc.)", example = "CARTE")
    String modePaiement,

    @PositiveOrZero(message = "Le pourboire ne peut pas être négatif")
    @Schema(description = "Montant du pourboire en euros", example = "2.50")
    BigDecimal pourboire,

    @PositiveOrZero(message = "La remise ne peut pas être négative")
    @Schema(description = "Montant fixe de remise en euros", example = "5.00")
    BigDecimal remiseMontant,

    @PositiveOrZero(message = "Le pourcentage de remise ne peut pas être négatif")
    @Schema(description = "Pourcentage de remise (0 à 100)", example = "10.0")
    BigDecimal remisePourcentage,

    @PositiveOrZero(message = "Le montant reçu ne peut pas être négatif")
    @Schema(description = "Montant en espèces reçu", example = "50.00")
    BigDecimal montantRecu,

    @Schema(description = "Notes ou remarques complémentaires")
    String notes,

    @Schema(description = "Indique s'il faut libérer la table après l'encaissement", defaultValue = "true")
    Boolean libererTable,

    @Schema(description = "Identifiants spécifiques des commandes à encaisser (optionnel)")
    List<Long> commandeIds
) {
    /**
     * Helper returning whether the table should be released, defaulting to true if not specified.
     *
     * @return true if the table should be marked free
     */
    public boolean shouldLibererTable() {
        return libererTable == null || Boolean.TRUE.equals(libererTable);
    }
}
