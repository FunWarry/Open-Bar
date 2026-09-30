package com.bar.gestioncocktail.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * Data Transfer Objects representing the cocktail flavor and ingredient chord connection wheel graph.
 */
public final class CocktailWheelDTO {

    private CocktailWheelDTO() {
        // Utility container
    }

    /**
     * Category taxonomy descriptor on the connection wheel perimeter.
     *
     * @param label       English group label
     * @param labelFr     French group label
     * @param shortName   Short display code in English
     * @param shortNameFr Short display code in French
     * @param color       Hex color code
     */
    public record CategoryDTO(
            String label,
            String labelFr,
            @JsonProperty("short") String shortName,
            String shortFr,
            String color
    ) {}

    /**
     * Ingredient node element positioned on the circular chord ring.
     *
     * @param id          Unique normalized ingredient identifier
     * @param label       Display name of the ingredient
     * @param group       Mixology category family key
     * @param subgroup    Optional subcategory taxonomy
     * @param sourceIndex Zero-based ordering index
     * @param count       Total cocktail recipe count containing this ingredient
     */
    public record NodeDTO(
            String id,
            String label,
            String group,
            String subgroup,
            int sourceIndex,
            int count
    ) {}

    /**
     * Ingredient co-occurrence ribbon edge connecting two ingredients.
     *
     * @param a     Identifier of first ingredient
     * @param b     Identifier of second ingredient
     * @param count Number of distinct cocktail recipes containing both ingredients
     */
    public record EdgeDTO(
            String a,
            String b,
            int count
    ) {}

    /**
     * Complete chord diagram dataset for the connection wheel.
     *
     * @param categories Category metadata keyed by category ID
     * @param nodes      Array of connected ingredient nodes
     * @param edges      Array of ingredient co-occurrence links
     */
    public record ConnectionWheelDTO(
            Map<String, CategoryDTO> categories,
            List<NodeDTO> nodes,
            List<EdgeDTO> edges
    ) {}
}
