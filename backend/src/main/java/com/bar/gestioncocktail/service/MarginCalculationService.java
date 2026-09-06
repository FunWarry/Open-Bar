package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service responsible for computing live Cost of Goods Sold (COGS), gross margins,
 * and profitability analytics across individual drinks, catalog items, and daily bar operations.
 */
@Service
public class MarginCalculationService {

    private static final MathContext MC = new MathContext(10, RoundingMode.HALF_UP);
    private static final BigDecimal DEFAULT_VAT_RATE = new BigDecimal("0.20");

    private final CocktailRepository cocktailRepository;
    private final CommandeRepository commandeRepository;
    private final TimeService timeService;
    private final AppSettingsService appSettingsService;

    /**
     * Constructs the MarginCalculationService with required dependencies and optional app settings.
     *
     * @param cocktailRepository repository for cocktails catalog
     * @param commandeRepository repository for orders
     * @param timeService        system time provider
     * @param appSettingsService application settings service for VAT and margins
     */
    @Autowired
    public MarginCalculationService(
            CocktailRepository cocktailRepository,
            CommandeRepository commandeRepository,
            TimeService timeService,
            @Autowired(required = false) AppSettingsService appSettingsService
    ) {
        this.cocktailRepository = cocktailRepository;
        this.commandeRepository = commandeRepository;
        this.timeService = timeService;
        this.appSettingsService = appSettingsService;
    }

    /**
     * Three-parameter constructor for tests and lightweight instantiation.
     *
     * @param cocktailRepository repository for cocktails catalog
     * @param commandeRepository repository for orders
     * @param timeService        system time provider
     */
    public MarginCalculationService(
            CocktailRepository cocktailRepository,
            CommandeRepository commandeRepository,
            TimeService timeService
    ) {
        this(cocktailRepository, commandeRepository, timeService, null);
    }

    /**
     * Computes the total recipe cost (COGS) for a base cocktail.
     *
     * @param cocktail the cocktail entity
     * @return the total recipe cost scaled to 2 decimal places
     */
    public BigDecimal computeRecipeCost(Cocktail cocktail) {
        if (cocktail == null || cocktail.getIngredients() == null || cocktail.getIngredients().isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal totalCost = BigDecimal.ZERO;
        for (CocktailIngredient ci : cocktail.getIngredients()) {
            if (ci.getIngredient() != null) {
                String recipeUnit = ci.getUnite() != null && !ci.getUnite().isBlank()
                        ? ci.getUnite()
                        : ci.getIngredient().getUniteMesure();
                BigDecimal lineCost = UnitConversionService.calculateCost(
                        ci.getQuantite(),
                        recipeUnit,
                        ci.getIngredient().getPrixUnitaire(),
                        ci.getIngredient().getUniteMesure()
                );
                totalCost = totalCost.add(lineCost);
            }
        }
        return totalCost.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Computes the recipe cost for a cocktail variant.
     * If the variant specifies custom ingredients, those are summed; otherwise the base recipe
     * cost is multiplied by the variant's ingredient multiplier.
     *
     * @param cocktail the base cocktail entity
     * @param variante the variant entity
     * @return the total variant recipe cost scaled to 2 decimal places
     */
    public BigDecimal computeVariantRecipeCost(Cocktail cocktail, CocktailVariante variante) {
        if (variante == null) {
            return computeRecipeCost(cocktail);
        }

        if (variante.getIngredients() != null && !variante.getIngredients().isEmpty()) {
            BigDecimal totalCost = BigDecimal.ZERO;
            for (CocktailVarianteIngredient cvi : variante.getIngredients()) {
                if (cvi.getIngredient() != null) {
                    String recipeUnit = cvi.getUnite() != null && !cvi.getUnite().isBlank()
                            ? cvi.getUnite()
                            : cvi.getIngredient().getUniteMesure();
                    BigDecimal lineCost = UnitConversionService.calculateCost(
                            cvi.getQuantite(),
                            recipeUnit,
                            cvi.getIngredient().getPrixUnitaire(),
                            cvi.getIngredient().getUniteMesure()
                    );
                    totalCost = totalCost.add(lineCost);
                }
            }
            return totalCost.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal baseCost = computeRecipeCost(cocktail);
        BigDecimal multiplier = variante.getMultiplicateurIngredient() != null
                ? variante.getMultiplicateurIngredient()
                : BigDecimal.ONE;
        return baseCost.multiply(multiplier, MC).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Calculates the pre-tax selling price (prix HT) from the retail price (prix TTC).
     *
     * @param prixTTC retail price including VAT
     * @param vatRate applicable VAT rate enum
     * @return selling price excluding VAT scaled to 2 decimal places
     */
    public BigDecimal computeSellingPriceHT(BigDecimal prixTTC, VatRate vatRate) {
        if (prixTTC == null || prixTTC.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal rate = vatRate != null && vatRate.getRate() != null
                ? vatRate.getRate()
                : getEffectiveDefaultVatRate();
        BigDecimal divisor = BigDecimal.ONE.add(rate);
        return prixTTC.divide(divisor, 2, RoundingMode.HALF_UP);
    }

    /**
     * Resolves the effective default VAT rate from application settings or falls back to standard 20%.
     *
     * @return applicable default VAT rate as a decimal factor (e.g. 0.20 for 20%)
     */
    public BigDecimal getEffectiveDefaultVatRate() {
        if (appSettingsService != null) {
            try {
                AppSettings settings = appSettingsService.getSettings();
                if (settings != null && settings.getDefaultVatRate() != null) {
                    return settings.getDefaultVatRate().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                }
            } catch (Exception _) {
                // Fallback to default if app settings cannot be retrieved
            }
        }
        return DEFAULT_VAT_RATE;
    }

    /**
     * Calculates the gross margin amount: sellingPriceHT - recipeCost.
     *
     * @param sellingPriceHT price excluding VAT
     * @param recipeCost     recipe cost of goods sold
     * @return gross margin amount scaled to 2 decimal places
     */
    public BigDecimal computeGrossMargin(BigDecimal sellingPriceHT, BigDecimal recipeCost) {
        if (sellingPriceHT == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal cost = recipeCost != null ? recipeCost : BigDecimal.ZERO;
        return sellingPriceHT.subtract(cost).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Calculates the gross profit margin percentage: (grossMargin / sellingPriceHT) * 100.
     *
     * @param grossMargin    gross profit margin amount
     * @param sellingPriceHT pre-tax selling price
     * @return margin percentage scaled to 2 decimal places
     */
    public BigDecimal computeGrossMarginPercentage(BigDecimal grossMargin, BigDecimal sellingPriceHT) {
        if (sellingPriceHT == null || sellingPriceHT.compareTo(BigDecimal.ZERO) <= 0 || grossMargin == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return grossMargin.multiply(BigDecimal.valueOf(100), MC)
                .divide(sellingPriceHT, 2, RoundingMode.HALF_UP);
    }

    /**
     * Retrieves detailed gross margin and recipe cost breakdown for a specific cocktail.
     *
     * @param cocktailId unique cocktail identifier
     * @return CocktailMarginDTO containing full financial metrics and variant breakdowns
     */
    @Transactional(readOnly = true)
    public CocktailMarginDTO getCocktailMargin(Long cocktailId) {
        Cocktail cocktail = cocktailRepository.findById(cocktailId)
                .orElseThrow(() -> new ResourceNotFoundException("Cocktail not found with ID: " + cocktailId));
        return buildCocktailMarginDTO(cocktail);
    }

    /**
     * Retrieves catalog-wide margin analytics for all cocktails.
     *
     * @return list of cocktail margin DTOs sorted by profitability
     */
    @Transactional(readOnly = true)
    public List<CocktailMarginDTO> getCatalogMarginAnalytics() {
        return cocktailRepository.findAll().stream()
                .map(this::buildCocktailMarginDTO)
                .sorted((dto1, dto2) -> {
                    BigDecimal m1 = dto1.grossMarginPercentage();
                    BigDecimal m2 = dto2.grossMarginPercentage();
                    if (m1 == null && m2 == null) {
                        return 0;
                    }
                    if (m1 == null) {
                        return 1;
                    }
                    if (m2 == null) {
                        return -1;
                    }
                    return m2.compareTo(m1);
                })
                .toList();
    }

    /**
     * Builds a {@link CocktailMarginDTO} for a given cocktail entity.
     *
     * @param cocktail the cocktail entity
     * @return populated DTO
     */
    public CocktailMarginDTO buildCocktailMarginDTO(Cocktail cocktail) {
        BigDecimal recipeCost = computeRecipeCost(cocktail);
        BigDecimal prixTTC = cocktail.getPrix() != null ? cocktail.getPrix() : BigDecimal.ZERO;
        BigDecimal prixHT = computeSellingPriceHT(prixTTC, cocktail.getVatRate());
        BigDecimal grossMargin = computeGrossMargin(prixHT, recipeCost);
        BigDecimal grossMarginPercentage = computeGrossMarginPercentage(grossMargin, prixHT);

        List<RecipeIngredientCostDTO> ingredients = buildRecipeIngredientCostDTOs(cocktail);
        List<CocktailVarianteMarginDTO> variantes = buildVariantMarginDTOs(cocktail, prixTTC);

        return new CocktailMarginDTO(
                cocktail.getId(),
                cocktail.getNom(),
                cocktail.getCategorie() != null ? cocktail.getCategorie().name() : "",
                cocktail.getVatRate() != null ? cocktail.getVatRate().getLabel() : "20%",
                prixTTC,
                prixHT,
                recipeCost,
                grossMargin,
                grossMarginPercentage,
                ingredients,
                variantes
        );
    }

    private List<RecipeIngredientCostDTO> buildRecipeIngredientCostDTOs(Cocktail cocktail) {
        if (cocktail.getIngredients() == null) {
            return Collections.emptyList();
        }
        List<RecipeIngredientCostDTO> ingredients = new ArrayList<>();
        for (CocktailIngredient ci : cocktail.getIngredients()) {
            if (ci.getIngredient() != null) {
                Ingredient ing = ci.getIngredient();
                String recipeUnit = ci.getUnite() != null && !ci.getUnite().isBlank()
                        ? ci.getUnite()
                        : ing.getUniteMesure();
                BigDecimal lineCost = UnitConversionService.calculateCost(
                        ci.getQuantite(),
                        recipeUnit,
                        ing.getPrixUnitaire(),
                        ing.getUniteMesure()
                );
                ingredients.add(new RecipeIngredientCostDTO(
                        ing.getId(),
                        ing.getNom(),
                        ci.getQuantite(),
                        recipeUnit,
                        ing.getPrixUnitaire() != null ? ing.getPrixUnitaire() : BigDecimal.ZERO,
                        ing.getUniteMesure(),
                        lineCost.setScale(2, RoundingMode.HALF_UP)
                ));
            }
        }
        return ingredients;
    }

    private List<CocktailVarianteMarginDTO> buildVariantMarginDTOs(Cocktail cocktail, BigDecimal prixTTC) {
        if (cocktail.getVariantes() == null) {
            return Collections.emptyList();
        }
        List<CocktailVarianteMarginDTO> variantes = new ArrayList<>();
        for (CocktailVariante v : cocktail.getVariantes()) {
            BigDecimal varPriceSupplement = v.getPrixSupplement() != null ? v.getPrixSupplement() : BigDecimal.ZERO;
            BigDecimal varPrixTTC = prixTTC.add(varPriceSupplement);
            BigDecimal varPrixHT = computeSellingPriceHT(varPrixTTC, cocktail.getVatRate());
            BigDecimal varRecipeCost = computeVariantRecipeCost(cocktail, v);
            BigDecimal varGrossMargin = computeGrossMargin(varPrixHT, varRecipeCost);
            BigDecimal varMarginPct = computeGrossMarginPercentage(varGrossMargin, varPrixHT);
            List<RecipeIngredientCostDTO> varIngs = buildVariantIngredientCostDTOs(v);

            variantes.add(new CocktailVarianteMarginDTO(
                    v.getId(),
                    v.getNom(),
                    varPrixTTC,
                    varPrixHT,
                    varRecipeCost,
                    varGrossMargin,
                    varMarginPct,
                    varIngs
            ));
        }
        return variantes;
    }

    private List<RecipeIngredientCostDTO> buildVariantIngredientCostDTOs(CocktailVariante v) {
        if (v.getIngredients() == null || v.getIngredients().isEmpty()) {
            return Collections.emptyList();
        }
        List<RecipeIngredientCostDTO> varIngs = new ArrayList<>();
        for (CocktailVarianteIngredient cvi : v.getIngredients()) {
            if (cvi.getIngredient() != null) {
                Ingredient ing = cvi.getIngredient();
                String recipeUnit = cvi.getUnite() != null && !cvi.getUnite().isBlank()
                        ? cvi.getUnite()
                        : ing.getUniteMesure();
                BigDecimal lineCost = UnitConversionService.calculateCost(
                        cvi.getQuantite(),
                        recipeUnit,
                        ing.getPrixUnitaire(),
                        ing.getUniteMesure()
                );
                varIngs.add(new RecipeIngredientCostDTO(
                        ing.getId(),
                        ing.getNom(),
                        cvi.getQuantite(),
                        recipeUnit,
                        ing.getPrixUnitaire() != null ? ing.getPrixUnitaire() : BigDecimal.ZERO,
                        ing.getUniteMesure(),
                        lineCost.setScale(2, RoundingMode.HALF_UP)
                ));
            }
        }
        return varIngs;
    }

    /**
     * Calculates consolidated financial health and COGS analytics for the Manager Dashboard.
     *
     * @return DashboardMarginAnalyticsDTO containing total revenues, COGS, gross margins, and top profitable items
     */
    @Transactional(readOnly = true)
    public DashboardMarginAnalyticsDTO getDashboardMarginAnalytics() {
        LocalDateTime startOfDay = timeService.today().atStartOfDay();

        List<Commande> orders = commandeRepository.findByStatutInAndDateCommandeAfter(
                List.of(CommandeStatut.REGLEE, CommandeStatut.LIVREE),
                startOfDay
        );

        BigDecimal totalRevenueTTC = BigDecimal.ZERO;
        BigDecimal totalRevenueHT = BigDecimal.ZERO;
        BigDecimal totalCogs = BigDecimal.ZERO;

        Map<Long, Integer> cocktailUnitsSold = new HashMap<>();

        for (Commande order : orders) {
            if (order.getItems() == null) continue;
            for (CommandeItem item : order.getItems()) {
                if (item.getCocktail() == null) continue;

                BigDecimal itemPriceTTC = item.getPrixUnitaire() != null
                        ? item.getPrixUnitaire().multiply(BigDecimal.valueOf(item.getQuantite()))
                        : BigDecimal.ZERO;
                totalRevenueTTC = totalRevenueTTC.add(itemPriceTTC);

                VatRate vatRate = item.getCocktail().getVatRate();
                BigDecimal itemPriceHT = computeSellingPriceHT(itemPriceTTC, vatRate);
                totalRevenueHT = totalRevenueHT.add(itemPriceHT);

                BigDecimal unitCost = item.getVariante() != null
                        ? computeVariantRecipeCost(item.getCocktail(), item.getVariante())
                        : computeRecipeCost(item.getCocktail());
                BigDecimal itemCogs = unitCost.multiply(BigDecimal.valueOf(item.getQuantite()), MC);
                totalCogs = totalCogs.add(itemCogs);

                cocktailUnitsSold.merge(item.getCocktail().getId(), item.getQuantite(), (Integer a, Integer b) -> Integer.valueOf(a + b));
            }
        }

        totalRevenueTTC = totalRevenueTTC.setScale(2, RoundingMode.HALF_UP);
        totalRevenueHT = totalRevenueHT.setScale(2, RoundingMode.HALF_UP);
        totalCogs = totalCogs.setScale(2, RoundingMode.HALF_UP);
        BigDecimal grossMarginAmount = totalRevenueHT.subtract(totalCogs).setScale(2, RoundingMode.HALF_UP);
        BigDecimal grossMarginPercentage = computeGrossMarginPercentage(grossMarginAmount, totalRevenueHT);

        List<ProfitableCocktailDTO> profitableCocktails = computeProfitableCocktails(cocktailUnitsSold);

        return new DashboardMarginAnalyticsDTO(
                totalRevenueTTC,
                totalRevenueHT,
                totalCogs,
                grossMarginAmount,
                grossMarginPercentage,
                profitableCocktails
        );
    }

    /**
     * Computes the ranking of most profitable cocktails based on catalog margins and units sold today.
     *
     * @param unitsSoldMap map of cocktail IDs to sales counts
     * @return sorted list of profitable cocktail DTOs
     */
    public List<ProfitableCocktailDTO> computeProfitableCocktails(Map<Long, Integer> unitsSoldMap) {
        List<Cocktail> cocktails = cocktailRepository.findAll();
        List<ProfitableCocktailDTO> results = new ArrayList<>();

        for (Cocktail c : cocktails) {
            BigDecimal recipeCost = computeRecipeCost(c);
            BigDecimal prixTTC = c.getPrix() != null ? c.getPrix() : BigDecimal.ZERO;
            BigDecimal prixHT = computeSellingPriceHT(prixTTC, c.getVatRate());
            BigDecimal grossMargin = computeGrossMargin(prixHT, recipeCost);
            BigDecimal grossMarginPercentage = computeGrossMarginPercentage(grossMargin, prixHT);
            long sold = unitsSoldMap.getOrDefault(c.getId(), 0);
            BigDecimal totalMarginGenerated = grossMargin.multiply(BigDecimal.valueOf(sold)).setScale(2, RoundingMode.HALF_UP);

            results.add(new ProfitableCocktailDTO(
                    c.getId(),
                    c.getNom(),
                    prixTTC,
                    prixHT,
                    recipeCost,
                    grossMargin,
                    grossMarginPercentage,
                    sold,
                    totalMarginGenerated
            ));
        }

        // Sort primarily by gross margin percentage descending, then total units sold descending
        return results.stream()
                .sorted((dto1, dto2) -> {
                    BigDecimal m1 = dto1.grossMarginPercentage();
                    BigDecimal m2 = dto2.grossMarginPercentage();
                    int cmp;
                    if (m1 == null && m2 == null) {
                        cmp = 0;
                    } else if (m1 == null) {
                        cmp = 1;
                    } else if (m2 == null) {
                        cmp = -1;
                    } else {
                        cmp = m2.compareTo(m1);
                    }
                    if (cmp != 0) {
                        return cmp;
                    }
                    return Long.compare(dto2.quantiteVendue(), dto1.quantiteVendue());
                })
                .limit(5)
                .toList();
    }
}
