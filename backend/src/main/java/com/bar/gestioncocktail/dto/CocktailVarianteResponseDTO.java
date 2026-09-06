package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.model.CocktailVarianteIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.VatRate;
import com.bar.gestioncocktail.service.UnitConversionService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Response DTO representing a cocktail variant with its customized ingredients, mixology steps, and financial margin metadata.
 *
 * @param id                        Variant identifier
 * @param cocktailId                Parent cocktail identifier
 * @param nom                       Variant name
 * @param description               Variant description
 * @param prixSupplement            Additional surcharge price
 * @param multiplicateurIngredient  Ingredient dosage multiplier
 * @param disponible                Availability status
 * @param instructions              Preparation instructions
 * @param ingredients               List of customized ingredients for this variant
 * @param recipeSteps               Complete ordered list of mixology recipe steps for this variant
 * @param recipeCost                Total recipe cost of goods sold (COGS) in EUR
 * @param sellingPriceHT            Selling price excluding VAT in EUR
 * @param grossMargin               Gross profit margin in EUR
 * @param grossMarginPercentage     Gross profit margin percentage
 * @param createdAt                 Creation timestamp
 * @param updatedAt                 Last update timestamp
 */
public record CocktailVarianteResponseDTO(
    Long id,
    Long cocktailId,
    String nom,
    String description,
    BigDecimal prixSupplement,
    BigDecimal multiplicateurIngredient,
    boolean disponible,
    String instructions,
    List<CocktailVarianteIngredientResponseDTO> ingredients,
    List<CocktailRecipeStepResponseDTO> recipeSteps,
    BigDecimal recipeCost,
    BigDecimal sellingPriceHT,
    BigDecimal grossMargin,
    BigDecimal grossMarginPercentage,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().findAndRegisterModules();
    private static final MathContext MC = new MathContext(10, RoundingMode.HALF_UP);

    /**
     * Backward-compatible 12-parameter constructor without margin analytics fields.
     */
    public CocktailVarianteResponseDTO(
        Long id,
        Long cocktailId,
        String nom,
        String description,
        BigDecimal prixSupplement,
        BigDecimal multiplicateurIngredient,
        boolean disponible,
        String instructions,
        List<CocktailVarianteIngredientResponseDTO> ingredients,
        List<CocktailRecipeStepResponseDTO> recipeSteps,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, cocktailId, nom, description, prixSupplement, multiplicateurIngredient, disponible, instructions, ingredients, recipeSteps, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, createdAt, updatedAt);
    }

    /**
     * Backward-compatible 11-parameter constructor without recipeSteps or margin analytics.
     */
    public CocktailVarianteResponseDTO(
        Long id,
        Long cocktailId,
        String nom,
        String description,
        BigDecimal prixSupplement,
        BigDecimal multiplicateurIngredient,
        boolean disponible,
        String instructions,
        List<CocktailVarianteIngredientResponseDTO> ingredients,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, cocktailId, nom, description, prixSupplement, multiplicateurIngredient, disponible, instructions, ingredients, List.of(), createdAt, updatedAt);
    }

    /**
     * Backward-compatible 10-parameter constructor without ingredients, recipeSteps or margin analytics.
     */
    public CocktailVarianteResponseDTO(
        Long id,
        Long cocktailId,
        String nom,
        String description,
        BigDecimal prixSupplement,
        BigDecimal multiplicateurIngredient,
        boolean disponible,
        String instructions,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, cocktailId, nom, description, prixSupplement, multiplicateurIngredient, disponible, instructions, List.of(), List.of(), createdAt, updatedAt);
    }

    /**
     * Creates a {@link CocktailVarianteResponseDTO} from a {@link CocktailVariante} entity with margin calculations.
     *
     * @param v The entity to convert
     * @return The populated response DTO
     */
    public static CocktailVarianteResponseDTO from(CocktailVariante v) {
        if (v == null) {
            return null;
        }
        List<CocktailVarianteIngredientResponseDTO> ingredientsList = extractIngredients(v);
        List<CocktailRecipeStepResponseDTO> parsedSteps = parseRecipeSteps(v.getRecipeStepsJson());
        BigDecimal recipeCost = calculateVariantRecipeCost(v);

        Cocktail parent = v.getCocktail();
        BigDecimal parentPrice = (parent != null && parent.getPrix() != null) ? parent.getPrix() : BigDecimal.ZERO;
        BigDecimal surcharge = v.getPrixSupplement() != null ? v.getPrixSupplement() : BigDecimal.ZERO;
        BigDecimal prixTTC = parentPrice.add(surcharge);

        VatRate vatRate = (parent != null && parent.getVatRate() != null) ? parent.getVatRate() : VatRate.TWENTY;
        BigDecimal rateDivisor = BigDecimal.ONE.add(vatRate.getRate());
        BigDecimal sellingPriceHT = prixTTC.divide(rateDivisor, 2, RoundingMode.HALF_UP);
        BigDecimal grossMargin = sellingPriceHT.subtract(recipeCost).setScale(2, RoundingMode.HALF_UP);
        BigDecimal grossMarginPercentage = calculateMarginPercentage(grossMargin, sellingPriceHT);

        return new CocktailVarianteResponseDTO(
            v.getId(),
            v.getCocktail() != null ? v.getCocktail().getId() : null,
            v.getNom(),
            v.getDescription(),
            v.getPrixSupplement(),
            v.getMultiplicateurIngredient(),
            v.isDisponible(),
            v.getInstructions(),
            ingredientsList,
            parsedSteps,
            recipeCost,
            sellingPriceHT,
            grossMargin,
            grossMarginPercentage,
            v.getCreatedAt(),
            v.getUpdatedAt()
        );
    }

    private static List<CocktailVarianteIngredientResponseDTO> extractIngredients(CocktailVariante v) {
        if (v.getIngredients() == null) {
            return List.of();
        }
        return v.getIngredients().stream().map(CocktailVarianteIngredientResponseDTO::from).toList();
    }

    private static List<CocktailRecipeStepResponseDTO> parseRecipeSteps(String json) {
        if (json == null || json.trim().isEmpty()) {
            return new ArrayList<>();
        }
        try {
            List<CocktailRecipeStepResponseDTO> decoded = OBJECT_MAPPER.readValue(
                json,
                new TypeReference<List<CocktailRecipeStepResponseDTO>>() {}
            );
            return decoded != null ? decoded : new ArrayList<>();
        } catch (Exception _) {
            return new ArrayList<>();
        }
    }

    private static BigDecimal calculateVariantRecipeCost(CocktailVariante v) {
        if (v.getIngredients() != null && !v.getIngredients().isEmpty()) {
            BigDecimal cost = BigDecimal.ZERO;
            for (CocktailVarianteIngredient cvi : v.getIngredients()) {
                cost = cost.add(calculateLineCost(cvi.getQuantite(), cvi.getUnite(), cvi.getIngredient()));
            }
            return cost.setScale(2, RoundingMode.HALF_UP);
        }
        if (v.getCocktail() != null && v.getCocktail().getIngredients() != null) {
            BigDecimal baseCost = calculateBaseRecipeCost(v.getCocktail());
            BigDecimal mult = v.getMultiplicateurIngredient() != null ? v.getMultiplicateurIngredient() : BigDecimal.ONE;
            return baseCost.multiply(mult, MC).setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal calculateBaseRecipeCost(Cocktail parent) {
        BigDecimal baseCost = BigDecimal.ZERO;
        for (var ci : parent.getIngredients()) {
            baseCost = baseCost.add(calculateLineCost(ci.getQuantite(), ci.getUnite(), ci.getIngredient()));
        }
        return baseCost;
    }

    private static BigDecimal calculateLineCost(BigDecimal quantite, String unite, Ingredient ingredient) {
        if (ingredient == null) {
            return BigDecimal.ZERO;
        }
        String rUnit = unite;
        if (rUnit == null || rUnit.isBlank()) {
            rUnit = ingredient.getUniteMesure();
        }
        return UnitConversionService.calculateCost(
            quantite,
            rUnit,
            ingredient.getPrixUnitaire(),
            ingredient.getUniteMesure()
        );
    }

    private static BigDecimal calculateMarginPercentage(BigDecimal grossMargin, BigDecimal sellingPriceHT) {
        if (sellingPriceHT.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return grossMargin.multiply(BigDecimal.valueOf(100), MC).divide(sellingPriceHT, 2, RoundingMode.HALF_UP);
    }
}
