package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * DTO de réponse décrivant un cocktail, son tarif, ses ingrédients et ses variantes.
 *
 * @param id Identifiant unique du cocktail
 * @param nom Intitulé commercial
 * @param description Description détaillée
 * @param prix Prix TTC en Euros
 * @param categorie Catégorie (ALCOOLISE, SANS_ALCOOL, SHOT, APERITIF, DIGESTIF, SPECIAL)
 * @param disponible Disponibilité générale
 * @param saisonnier Indique si la boisson est saisonnière
 * @param dateDebutSaison Date de début de saison
 * @param dateFinSaison Date de fin de saison
 * @param moisDebut Mois de début (1-12)
 * @param moisFin Mois de fin (1-12)
 * @param disponibleAujourdhui Calcul de disponibilité incluant le calendrier de saison
 * @param instructions Conseils de préparation pour le barman
 * @param imageUrl URL de la photo
 * @param ingredients Liste des ingrédients composants la recette
 * @param variantes Déclinaisons disponibles
 * @param createdAt Date de création
 * @param updatedAt Date de modification
 */
@Schema(description = "Représentation DTO complète d'un cocktail")
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
     * Convertit une entité {@link Cocktail} en DTO de réponse.
     *
     * @param c L'entité cocktail source
     * @return Le DTO correspondant
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
