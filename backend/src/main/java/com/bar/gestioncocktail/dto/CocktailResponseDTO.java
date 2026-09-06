package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.FlavorProfile;
import com.bar.gestioncocktail.model.VatRate;
import com.bar.gestioncocktail.service.UnitConversionService;
import com.bar.gestioncocktail.model.PreparationStation;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Response DTO describing a cocktail, pricing, ingredients, variants, flavor profiles, dietary tags, and margin analytics.
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
 * @param recipeSteps List of chronological recipe steps
 * @param glassware Serving glassware details
 * @param flavorProfiles Set of flavor profile tags (FRUITY, SMOKY, etc.)
 * @param alcoholLevel Alcohol by volume percentage (ABV)
 * @param isMocktail True if drink is non-alcoholic mocktail
 * @param isVegan True if drink is vegan friendly
 * @param isGlutenFree True if drink is gluten-free
 * @param station Workstation responsible for preparation (BAR, KITCHEN, SNACK)
 * @param recipeCost Total unit recipe cost of goods sold (COGS) in EUR
 * @param sellingPriceHT Selling price excluding VAT in EUR
 * @param grossMargin Gross profit margin amount in EUR
 * @param grossMarginPercentage Gross profit margin percentage
 * @param createdAt Creation timestamp
 * @param updatedAt Modification timestamp
 */
@Schema(description = "Complete DTO representation of a cocktail with financial margins and COGS")
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
    List<CocktailRecipeStepResponseDTO> recipeSteps,
    GlasswareResponseDTO glassware,
    Set<FlavorProfile> flavorProfiles,
    BigDecimal alcoholLevel,
    boolean isMocktail,
    boolean isVegan,
    boolean isGlutenFree,
    PreparationStation station,
    BigDecimal recipeCost,
    BigDecimal sellingPriceHT,
    BigDecimal grossMargin,
    BigDecimal grossMarginPercentage,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    private static final MathContext MC = new MathContext(10, RoundingMode.HALF_UP);

    /**
     * Backward-compatible 29-parameter constructor without station.
     */
    public CocktailResponseDTO(
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
        List<CocktailRecipeStepResponseDTO> recipeSteps,
        GlasswareResponseDTO glassware,
        Set<FlavorProfile> flavorProfiles,
        BigDecimal alcoholLevel,
        boolean isMocktail,
        boolean isVegan,
        boolean isGlutenFree,
        BigDecimal recipeCost,
        BigDecimal sellingPriceHT,
        BigDecimal grossMargin,
        BigDecimal grossMarginPercentage,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(
            id, nom, description, prix, categorie, disponible, saisonnier,
            dateDebutSaison, dateFinSaison, moisDebut, moisFin, disponibleAujourdhui,
            instructions, imageUrl, ingredients, variantes, recipeSteps, glassware,
            flavorProfiles, alcoholLevel, isMocktail, isVegan, isGlutenFree,
            PreparationStation.BAR,
            recipeCost, sellingPriceHT, grossMargin, grossMarginPercentage,
            createdAt, updatedAt
        );
    }

    /**
     * Backward-compatible 25-parameter constructor without margin fields.
     */
    public CocktailResponseDTO(
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
        List<CocktailRecipeStepResponseDTO> recipeSteps,
        GlasswareResponseDTO glassware,
        Set<FlavorProfile> flavorProfiles,
        BigDecimal alcoholLevel,
        boolean isMocktail,
        boolean isVegan,
        boolean isGlutenFree,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(
            id, nom, description, prix, categorie, disponible, saisonnier,
            dateDebutSaison, dateFinSaison, moisDebut, moisFin, disponibleAujourdhui,
            instructions, imageUrl, ingredients, variantes, recipeSteps, glassware,
            flavorProfiles, alcoholLevel, isMocktail, isVegan, isGlutenFree,
            PreparationStation.BAR,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            createdAt, updatedAt
        );
    }

    /**
     * Backward-compatible constructor without glassware or flavor/dietary fields.
     */
    public CocktailResponseDTO(
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
        List<CocktailRecipeStepResponseDTO> recipeSteps,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(
            id, nom, description, prix, categorie, disponible, saisonnier,
            dateDebutSaison, dateFinSaison, moisDebut, moisFin, disponibleAujourdhui,
            instructions, imageUrl, ingredients, variantes, recipeSteps, null,
            Collections.emptySet(), BigDecimal.ZERO, false, true, true,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            createdAt, updatedAt
        );
    }

    /**
     * Backward-compatible constructor without flavor/dietary fields.
     */
    public CocktailResponseDTO(
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
        List<CocktailRecipeStepResponseDTO> recipeSteps,
        GlasswareResponseDTO glassware,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(
            id, nom, description, prix, categorie, disponible, saisonnier,
            dateDebutSaison, dateFinSaison, moisDebut, moisFin, disponibleAujourdhui,
            instructions, imageUrl, ingredients, variantes, recipeSteps, glassware,
            Collections.emptySet(), BigDecimal.ZERO, false, true, true,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            createdAt, updatedAt
        );
    }

    /**
     * Converts a {@link Cocktail} entity into a response DTO with calculated margin analytics.
     *
     * @param c Source cocktail entity
     * @return Corresponding response DTO
     */
    public static CocktailResponseDTO from(Cocktail c) {
        if (c == null) {
            return null;
        }

        List<CocktailIngredientResponseDTO> ings = extractIngredients(c);
        List<CocktailVarianteResponseDTO> vars = extractVariantes(c);
        List<CocktailRecipeStepResponseDTO> steps = extractRecipeSteps(c);
        GlasswareResponseDTO glassDto = GlasswareResponseDTO.from(c.getGlassware());
        Set<FlavorProfile> flavors = extractFlavors(c);

        BigDecimal recipeCost = calculateRecipeCost(c);
        BigDecimal prixTTC = c.getPrix() != null ? c.getPrix() : BigDecimal.ZERO;
        VatRate vatRate = c.getVatRate() != null ? c.getVatRate() : VatRate.TWENTY;
        BigDecimal rateDivisor = BigDecimal.ONE.add(vatRate.getRate());
        BigDecimal sellingPriceHT = prixTTC.divide(rateDivisor, 2, RoundingMode.HALF_UP);
        BigDecimal grossMargin = sellingPriceHT.subtract(recipeCost).setScale(2, RoundingMode.HALF_UP);
        BigDecimal grossMarginPercentage = calculateMarginPercentage(grossMargin, sellingPriceHT);

        return new CocktailResponseDTO(
            c.getId(), c.getNom(), c.getDescription(), c.getPrix(), c.getCategorie(),
            c.isDisponible(), c.isSaisonnier(), c.getDateDebutSaison(), c.getDateFinSaison(),
            c.getMoisDebut(), c.getMoisFin(), c.isDisponibleAujourdhui(),
            c.getInstructions(), c.getImageUrl(), ings, vars, steps, glassDto,
            flavors,
            c.getAlcoholLevel() != null ? c.getAlcoholLevel() : BigDecimal.ZERO,
            c.isMocktail(),
            c.isVegan(),
            c.isGlutenFree(),
            c.getStation() != null ? c.getStation() : PreparationStation.BAR,
            recipeCost,
            sellingPriceHT,
            grossMargin,
            grossMarginPercentage,
            c.getCreatedAt(),
            c.getUpdatedAt()
        );
    }

    private static List<CocktailIngredientResponseDTO> extractIngredients(Cocktail c) {
        if (c.getIngredients() == null) {
            return Collections.emptyList();
        }
        try {
            return c.getIngredients().stream().map(CocktailIngredientResponseDTO::from).toList();
        } catch (Exception _) {
            return Collections.emptyList();
        }
    }

    private static List<CocktailVarianteResponseDTO> extractVariantes(Cocktail c) {
        if (c.getVariantes() == null) {
            return Collections.emptyList();
        }
        try {
            return c.getVariantes().stream().map(CocktailVarianteResponseDTO::from).toList();
        } catch (Exception _) {
            return Collections.emptyList();
        }
    }

    private static List<CocktailRecipeStepResponseDTO> extractRecipeSteps(Cocktail c) {
        if (c.getRecipeSteps() == null) {
            return Collections.emptyList();
        }
        try {
            return c.getRecipeSteps().stream().map(CocktailRecipeStepResponseDTO::from).toList();
        } catch (Exception _) {
            return Collections.emptyList();
        }
    }

    private static Set<FlavorProfile> extractFlavors(Cocktail c) {
        if (c.getFlavorProfiles() == null) {
            return Collections.emptySet();
        }
        try {
            return new HashSet<>(c.getFlavorProfiles());
        } catch (Exception _) {
            return Collections.emptySet();
        }
    }

    private static BigDecimal calculateRecipeCost(Cocktail c) {
        if (c.getIngredients() == null || c.getIngredients().isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal recipeCost = BigDecimal.ZERO;
        for (CocktailIngredient ci : c.getIngredients()) {
            recipeCost = recipeCost.add(calculateIngredientLineCost(ci));
        }
        return recipeCost.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal calculateIngredientLineCost(CocktailIngredient ci) {
        if (ci == null || ci.getIngredient() == null) {
            return BigDecimal.ZERO;
        }
        String rUnit = ci.getUnite();
        if (rUnit == null || rUnit.isBlank()) {
            rUnit = ci.getIngredient().getUniteMesure();
        }
        return UnitConversionService.calculateCost(
            ci.getQuantite(),
            rUnit,
            ci.getIngredient().getPrixUnitaire(),
            ci.getIngredient().getUniteMesure()
        );
    }

    private static BigDecimal calculateMarginPercentage(BigDecimal grossMargin, BigDecimal sellingPriceHT) {
        if (sellingPriceHT.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return grossMargin.multiply(BigDecimal.valueOf(100), MC).divide(sellingPriceHT, 2, RoundingMode.HALF_UP);
    }
}
