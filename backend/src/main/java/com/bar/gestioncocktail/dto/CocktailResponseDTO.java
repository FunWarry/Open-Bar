package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Response DTO describing a cocktail, pricing, ingredients, and variants.
 *
 * @param id Unique cocktail identifier
 * @param nom Commercial drink title
 * @param description Detailed description
 * @param prix Price including taxes in EUR
 * @param categorie Category (ALCOOLISE, SANS_ALCOOL, SHOT, APERITIF, DIGESTIF, SPECIAL)
 * @param disponible General availability flag
 * @param saisonnier Indicates whether the drink is seasonal
 * @param dateDebutSaison Season start date
 * @param dateFinSaison Season end date
 * @param moisDebut Season start month (1-12)
 * @param moisFin Season end month (1-12)
 * @param disponibleAujourdhui Availability calculation including seasonal schedule
 * @param instructions Preparation instructions for bartender
 * @param imageUrl Photo URL
 * @param ingredients List of recipe ingredients
 * @param variantes List of available variants
 * @param createdAt Creation timestamp
 * @param updatedAt Modification timestamp
 */
@Schema(description = "Complete DTO representation of a cocktail")
public record CocktailResponseDTO(
    Long id,
    String nom,
    String description,
    BigDecimal prix,
    CocktailCategorie categorie,
    boolean disponible,
    boolean saisonnier,
    LocalDateTime dateDebutSaison,
    LocalDateTime dateFinSaison,
    Integer moisDebut,
    Integer moisFin,
    boolean disponibleAujourdhui,
    String instructions,
    String imageUrl,
    List<CocktailIngredientResponseDTO> ingredients,
    List<CocktailVarianteResponseDTO> variantes,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Converts a {@link Cocktail} entity into a response DTO.
     *
     * @param c Source cocktail entity
     * @return Corresponding response DTO
     */
    public static CocktailResponseDTO from(Cocktail c) {
        List<CocktailIngredientResponseDTO> ings = c.getIngredients() != null
            ? c.getIngredients().stream().map(CocktailIngredientResponseDTO::from).toList()
            : Collections.emptyList();
        List<CocktailVarianteResponseDTO> vars = c.getVariantes() != null
            ? c.getVariantes().stream().map(CocktailVarianteResponseDTO::from).toList()
            : Collections.emptyList();
        return new CocktailResponseDTO(
            c.getId(), c.getNom(), c.getDescription(), c.getPrix(), c.getCategorie(),
            c.isDisponible(), c.isSaisonnier(), c.getDateDebutSaison(), c.getDateFinSaison(),
            c.getMoisDebut(), c.getMoisFin(), c.isDisponibleAujourdhui(),
            c.getInstructions(), c.getImageUrl(), ings, vars, c.getCreatedAt(), c.getUpdatedAt()
        );
    }
}
