package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

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
