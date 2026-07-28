package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CocktailVariante;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request DTO for adding an item (cocktail line) to an order.
 *
 * @param cocktailId    Identifier of the cocktail to order
 * @param varianteId    Optional identifier of the selected variant
 * @param quantite      Quantity ordered (min 1)
 * @param prixUnitaire  Unit price at time of order
 * @param notes         Optional item notes
 * @param prioritaire   Whether this item should be prepared first
 */
public record CommandeItemRequestDTO(
    @NotNull(message = "Le cocktail est obligatoire")
    Long cocktailId,

    Long varianteId,

    @Min(value = 1, message = "La quantité doit être d'au moins 1")
    int quantite,

    @NotNull(message = "Le prix unitaire est obligatoire")
    @DecimalMin(value = "0.0", inclusive = false, message = "Le prix unitaire doit être supérieur à 0")
    BigDecimal prixUnitaire,

    String notes,
    boolean prioritaire
) {
    /**
     * Converts this DTO into a {@link CommandeItem} JPA entity.
     *
     * @return A new {@link CommandeItem} entity instance
     */
    public CommandeItem toEntity() {
        CommandeItem item = new CommandeItem();
        if (cocktailId != null) {
            Cocktail cocktail = new Cocktail();
            cocktail.setId(cocktailId);
            item.setCocktail(cocktail);
        }
        if (varianteId != null) {
            CocktailVariante variante = new CocktailVariante();
            variante.setId(varianteId);
            item.setVariante(variante);
        }
        item.setQuantite(quantite);
        item.setPrixUnitaire(prixUnitaire);
        item.setNotes(notes);
        item.setPrioritaire(prioritaire);
        return item;
    }
}
