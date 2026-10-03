package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Data Transfer Object representing a cocktail template in the preconfigured base library.
 *
 * @param id                     Unique library identifier (e.g. "lib_1")
 * @param nom                    Display name of the cocktail
 * @param description            Descriptive narrative or brief history
 * @param categorie              Beverage category (e.g. "ALCOOLISE", "SANS_ALCOOL", "SHOT")
 * @param libraryCategory        Library grouping ("IBA_CLASSICS", "TROPICAL", "SPIRIT_FORWARD", "MOCKTAILS", "SHOOTERS", "CONTEMPORARY")
 * @param baseSpirit             Dominant base spirit ("GIN", "VODKA", "RUM", "TEQUILA", "WHISKEY", "NON_ALCOHOLIC", "OTHER")
 * @param ibaOfficial            Whether this recipe is an official IBA classic
 * @param prix                   Default suggested selling price in establishment currency
 * @param alcoholLevel           Estimated Alcohol By Volume (ABV) percentage
 * @param isMocktail             True if alcohol-free beverage
 * @param isVegan                True if recipe does not contain animal products
 * @param isGlutenFree           True if recipe is free of gluten-containing ingredients
 * @param glassware              Recommended glassware type name
 * @param glasswareImage         URL or asset path for glassware illustration
 * @param imageUrl               Image or photography preview URL
 * @param flavorProfiles         List of flavor profile tags (FRUITY, SWEET, SOUR, BITTER, SPICY, HERBAL, SMOKY)
 * @param allergens              List of EU declaration allergens (LAIT, OEUF, GLUTEN, etc.)
 * @param preparationTimeSeconds Estimated mixology preparation time in seconds
 * @param tags                   Descriptive metadata tags
 * @param ingredients            Itemized ingredient list with measure and cost estimates
 * @param recipeSteps            Step-by-step mixology action steps
 * @param instructions           Summary preparation instructions text
 * @param popularityScore        Popularity ranking score from 1 to 100
 * @param isPopular              Whether this is an iconic or top-famous cocktail
 * @param variantFamily          Family grouping name for cocktail variations (e.g. "Margarita", "Mojito", "Sour")
 * @param variationOf            Canonical base cocktail recipe name if this is a recipe variation
 */
public record CocktailLibraryItemDTO(
        String id,
        String nom,
        String description,
        String categorie,
        String libraryCategory,
        String baseSpirit,
        boolean ibaOfficial,
        BigDecimal prix,
        BigDecimal alcoholLevel,
        boolean isMocktail,
        boolean isVegan,
        boolean isGlutenFree,
        String glassware,
        String glasswareImage,
        String imageUrl,
        List<String> flavorProfiles,
        List<String> allergens,
        Integer preparationTimeSeconds,
        List<String> tags,
        List<CocktailLibraryIngredientDTO> ingredients,
        List<CocktailLibraryRecipeStepDTO> recipeSteps,
        String instructions,
        Integer popularityScore,
        boolean isPopular,
        String variantFamily,
        String variationOf
) {

    /**
     * Itemized ingredient record in a library cocktail recipe.
     *
     * @param nom          Name of the ingredient
     * @param quantite     Proportional quantity
     * @param unite        Unit of measure (cl, ml, dash, u)
     * @param degreAlcool  Alcohol percentage (ABV)
     * @param coutUnitaire Estimated unit purchase cost
     * @param allergens    Allergen flags
     * @param isVegan      Vegan status
     */
    public record CocktailLibraryIngredientDTO(
            String nom,
            BigDecimal quantite,
            String unite,
            String category,
            BigDecimal degreAlcool,
            BigDecimal coutUnitaire,
            List<String> allergens,
            boolean isVegan
    ) {}

    /**
     * Sequential mixology step in a library recipe.
     *
     * @param stepOrder       Sequential step order index
     * @param stepType        Step type ("INGREDIENT" or "CUSTOM_TEXT")
     * @param actionTitle     Action title (e.g. "AJOUTER_INGREDIENT", "SHAKER", "VERSER")
     * @param ingredientNom   Linked ingredient name if INGREDIENT step
     * @param quantite        Quantity used in this step
     * @param unite           Unit of measure
     * @param customText      Text instruction or explanation
     * @param durationSeconds Duration in seconds for timer
     */
    public record CocktailLibraryRecipeStepDTO(
            Integer stepOrder,
            String stepType,
            String actionTitle,
            String ingredientNom,
            BigDecimal quantite,
            String unite,
            String customText,
            Integer durationSeconds
    ) {}
}
