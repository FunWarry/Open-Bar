package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO représentant un article individuel dans une commande publique.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Ligne d'article dans une commande publique")
public class PublicCommandeItemRequestDTO {

    /**
     * Identifiant du cocktail choisi.
     */
    @NotNull(message = "Le cocktail est obligatoire")
    @Schema(description = "ID du cocktail", example = "12")
    private Long cocktailId;

    /**
     * Identifiant optionnel de la variante sélectionnée.
     */
    @Schema(description = "ID optionnel de la variante", example = "3")
    private Long varianteId;

    /**
     * Quantité commandée (au moins 1).
     */
    @Min(value = 1, message = "La quantité doit être d'au moins 1")
    @Schema(description = "Quantité d'articles", example = "2")
    private int quantite = 1;

    /**
     * Remarques spécifiques pour cet article.
     */
    @Schema(description = "Remarques sur cet article", example = "Bien frais")
    private String notes;
}
