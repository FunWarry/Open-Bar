package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailMarginDTO;
import com.bar.gestioncocktail.dto.CocktailVarianteMarginDTO;
import com.bar.gestioncocktail.dto.DashboardMarginAnalyticsDTO;
import com.bar.gestioncocktail.dto.ProfitableCocktailDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

/**
 * Unit tests for {@link MarginCalculationService}.
 */
@ExtendWith(MockitoExtension.class)
class MarginCalculationServiceTest {

    @Mock
    private CocktailRepository cocktailRepository;

    @Mock
    private CommandeRepository commandeRepository;

    @Mock
    private AppSettingsService appSettingsService;

    @Spy
    private TimeService timeService = new TimeService(null);

    @InjectMocks
    private MarginCalculationService marginCalculationService;

    private Cocktail mojito;
    private Ingredient rum;
    private Ingredient mint;
    private Ingredient soda;

    @BeforeEach
    void setUp() {
        rum = new Ingredient();
        rum.setId(1L);
        rum.setNom("White Rum");
        rum.setUniteMesure("l");
        rum.setPrixUnitaire(new BigDecimal("20.00")); // 20 €/L

        mint = new Ingredient();
        mint.setId(2L);
        mint.setNom("Fresh Mint");
        mint.setUniteMesure("feuille");
        mint.setPrixUnitaire(new BigDecimal("0.05")); // 0.05 € / leaf

        soda = new Ingredient();
        soda.setId(3L);
        soda.setNom("Club Soda");
        soda.setUniteMesure("l");
        soda.setPrixUnitaire(new BigDecimal("1.00")); // 1 €/L

        mojito = new Cocktail();
        mojito.setId(10L);
        mojito.setNom("Mojito");
        mojito.setCategorie(CocktailCategorie.ALCOOLISE);
        mojito.setVatRate(VatRate.TWENTY); // 20%
        mojito.setPrix(new BigDecimal("12.00")); // 12.00 € TTC

        List<CocktailIngredient> ingredients = new ArrayList<>();

        CocktailIngredient ci1 = new CocktailIngredient();
        ci1.setId(101L);
        ci1.setCocktail(mojito);
        ci1.setIngredient(rum);
        ci1.setQuantite(new BigDecimal("5")); // 5 cl
        ci1.setUnite("cl");
        ingredients.add(ci1);

        CocktailIngredient ci2 = new CocktailIngredient();
        ci2.setId(102L);
        ci2.setCocktail(mojito);
        ci2.setIngredient(mint);
        ci2.setQuantite(new BigDecimal("8")); // 8 leaves
        ci2.setUnite("feuille");
        ingredients.add(ci2);

        CocktailIngredient ci3 = new CocktailIngredient();
        ci3.setId(103L);
        ci3.setCocktail(mojito);
        ci3.setIngredient(soda);
        ci3.setQuantite(new BigDecimal("10")); // 10 cl
        ci3.setUnite("cl");
        ingredients.add(ci3);

        mojito.setIngredients(ingredients);
    }

    @Test
    @DisplayName("computeRecipeCost - sums ingredient costs across multiple units correctly")
    void computeRecipeCost_calculatesCorrectCost() {
        // Rum: 5 cl = 0.05 L * 20 € = 1.00 €
        // Mint: 8 leaves * 0.05 € = 0.40 €
        // Soda: 10 cl = 0.10 L * 1.00 € = 0.10 €
        // Total = 1.50 €
        BigDecimal cost = marginCalculationService.computeRecipeCost(mojito);
        assertThat(cost).isEqualByComparingTo(new BigDecimal("1.50"));
    }

    @Test
    @DisplayName("computeRecipeCost - returns zero for null or empty ingredients")
    void computeRecipeCost_nullOrEmpty_returnsZero() {
        assertThat(marginCalculationService.computeRecipeCost(null)).isEqualByComparingTo(BigDecimal.ZERO);

        Cocktail emptyCocktail = new Cocktail();
        emptyCocktail.setIngredients(Collections.emptyList());
        assertThat(marginCalculationService.computeRecipeCost(emptyCocktail)).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("computeVariantRecipeCost - applies multiplier when variant has no custom ingredients")
    void computeVariantRecipeCost_withMultiplier() {
        CocktailVariante largeMojito = new CocktailVariante();
        largeMojito.setId(201L);
        largeMojito.setNom("Large Pitcher");
        largeMojito.setMultiplicateurIngredient(new BigDecimal("2.50"));

        BigDecimal variantCost = marginCalculationService.computeVariantRecipeCost(mojito, largeMojito);
        // 1.50 * 2.50 = 3.75 €
        assertThat(variantCost).isEqualByComparingTo(new BigDecimal("3.75"));
    }

    @Test
    @DisplayName("computeVariantRecipeCost - sums custom variant ingredients when specified")
    void computeVariantRecipeCost_withCustomIngredients() {
        CocktailVariante virginMojito = new CocktailVariante();
        virginMojito.setId(202L);
        virginMojito.setNom("Virgin Mojito");

        CocktailVarianteIngredient cvi = new CocktailVarianteIngredient();
        cvi.setIngredient(soda);
        cvi.setQuantite(new BigDecimal("20")); // 20 cl soda
        cvi.setUnite("cl");
        virginMojito.setIngredients(List.of(cvi));

        // 20 cl soda = 0.2 L * 1.00 € = 0.20 €
        BigDecimal variantCost = marginCalculationService.computeVariantRecipeCost(mojito, virginMojito);
        assertThat(variantCost).isEqualByComparingTo(new BigDecimal("0.20"));
    }

    @Test
    @DisplayName("computeSellingPriceHT - calculates pre-tax price according to VAT rate")
    void computeSellingPriceHT_calculatesCorrectHT() {
        // 12.00 € TTC with 20% VAT => 12.00 / 1.20 = 10.00 € HT
        BigDecimal prixHT = marginCalculationService.computeSellingPriceHT(new BigDecimal("12.00"), VatRate.TWENTY);
        assertThat(prixHT).isEqualByComparingTo(new BigDecimal("10.00"));

        // Null or zero retail price
        assertThat(marginCalculationService.computeSellingPriceHT(null, VatRate.TWENTY))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(marginCalculationService.computeSellingPriceHT(BigDecimal.ZERO, VatRate.FIVE_FIVE))
                .isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("computeGrossMargin and percentage - calculates margin amount and rate")
    void computeGrossMargin_and_percentage() {
        BigDecimal prixHT = new BigDecimal("10.00");
        BigDecimal recipeCost = new BigDecimal("1.50");

        BigDecimal margin = marginCalculationService.computeGrossMargin(prixHT, recipeCost);
        // Margin = 10.00 - 1.50 = 8.50 €
        assertThat(margin).isEqualByComparingTo(new BigDecimal("8.50"));

        BigDecimal marginRate = marginCalculationService.computeGrossMarginPercentage(margin, prixHT);
        // Rate = (8.50 / 10.00) * 100 = 85.00 %
        assertThat(marginRate).isEqualByComparingTo(new BigDecimal("85.00"));

        // Zero selling price edge case
        assertThat(marginCalculationService.computeGrossMarginPercentage(margin, BigDecimal.ZERO))
                .isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("getCocktailMargin - returns DTO for existing cocktail including variants")
    void getCocktailMargin_found() {
        CocktailVariante variant = new CocktailVariante();
        variant.setId(201L);
        variant.setNom("Double");
        variant.setPrixSupplement(new BigDecimal("6.00")); // +6 €
        variant.setMultiplicateurIngredient(new BigDecimal("2.00"));
        mojito.setVariantes(List.of(variant));

        given(cocktailRepository.findById(10L)).willReturn(Optional.of(mojito));

        CocktailMarginDTO dto = marginCalculationService.getCocktailMargin(10L);

        assertThat(dto).isNotNull();
        assertThat(dto.cocktailId()).isEqualTo(10L);
        assertThat(dto.nom()).isEqualTo("Mojito");
        assertThat(dto.prixTTC()).isEqualByComparingTo(new BigDecimal("12.00"));
        assertThat(dto.prixHT()).isEqualByComparingTo(new BigDecimal("10.00"));
        assertThat(dto.recipeCost()).isEqualByComparingTo(new BigDecimal("1.50"));
        assertThat(dto.grossMargin()).isEqualByComparingTo(new BigDecimal("8.50"));
        assertThat(dto.grossMarginPercentage()).isEqualByComparingTo(new BigDecimal("85.00"));
        assertThat(dto.ingredients()).hasSize(3);
        assertThat(dto.variantes()).hasSize(1);
        assertThat(dto.variantes().get(0).recipeCost()).isEqualByComparingTo(new BigDecimal("3.00"));
    }

    @Test
    @DisplayName("getCocktailMargin - throws ResourceNotFoundException when cocktail not found")
    void getCocktailMargin_notFound_throwsException() {
        given(cocktailRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> marginCalculationService.getCocktailMargin(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getCatalogMarginAnalytics - returns catalog sorted by gross margin rate descending")
    void getCatalogMarginAnalytics_sortsByMarginPercentage() {
        Cocktail beer = new Cocktail();
        beer.setId(11L);
        beer.setNom("Draft Beer");
        beer.setPrix(new BigDecimal("6.00"));
        beer.setCategorie(CocktailCategorie.ALCOOLISE);
        beer.setVatRate(VatRate.TWENTY);
        // Pre-tax: 6.00 / 1.20 = 5.00
        // Recipe cost: 1.00 => Margin = 4.00 => Rate = 80.00%
        Ingredient keg = new Ingredient();
        keg.setId(4L);
        keg.setNom("Beer Keg");
        keg.setUniteMesure("l");
        keg.setPrixUnitaire(new BigDecimal("2.00"));
        CocktailIngredient ciBeer = new CocktailIngredient();
        ciBeer.setIngredient(keg);
        ciBeer.setQuantite(new BigDecimal("50")); // 50 cl = 0.5 L * 2 = 1.00 €
        ciBeer.setUnite("cl");
        beer.setIngredients(List.of(ciBeer));

        given(cocktailRepository.findAll()).willReturn(List.of(beer, mojito));

        List<CocktailMarginDTO> list = marginCalculationService.getCatalogMarginAnalytics();

        assertThat(list).hasSize(2);
        // Mojito (85%) should come before Beer (80%)
        assertThat(list.get(0).nom()).isEqualTo("Mojito");
        assertThat(list.get(1).nom()).isEqualTo("Draft Beer");
    }

    @Test
    @DisplayName("getDashboardMarginAnalytics - aggregates today's sales, COGS, margins and top cocktails")
    void getDashboardMarginAnalytics_aggregatesDailyOperations() {
        Commande cmd1 = new Commande();
        cmd1.setId(1L);
        cmd1.setDateCommande(LocalDateTime.now());
        cmd1.setStatut(CommandeStatut.LIVREE);

        CommandeItem item1 = new CommandeItem();
        item1.setCocktail(mojito);
        item1.setQuantite(3);
        item1.setPrixUnitaire(new BigDecimal("12.00"));
        cmd1.setItems(List.of(item1));

        given(commandeRepository.findByStatutInAndDateCommandeAfter(any(), any()))
                .willReturn(List.of(cmd1));
        given(cocktailRepository.findAll()).willReturn(List.of(mojito));

        DashboardMarginAnalyticsDTO analytics = marginCalculationService.getDashboardMarginAnalytics();

        assertThat(analytics).isNotNull();
        // 3 Mojitos:
        // Revenue HT: 3 * 10.00 = 30.00 €
        // Total COGS: 3 * 1.50 = 4.50 €
        // Gross Margin: 30.00 - 4.50 = 25.50 €
        // Margin rate: 25.50 / 30.00 = 85.00 %
        assertThat(analytics.chiffreAffairesJourHT()).isEqualByComparingTo(new BigDecimal("30.00"));
        assertThat(analytics.totalCogsJour()).isEqualByComparingTo(new BigDecimal("4.50"));
        assertThat(analytics.margeBruteJour()).isEqualByComparingTo(new BigDecimal("25.50"));
        assertThat(analytics.tauxMargeBruteJour()).isEqualByComparingTo(new BigDecimal("85.00"));

        List<ProfitableCocktailDTO> profitable = analytics.mostProfitableCocktails();
        assertThat(profitable).hasSize(1);
        ProfitableCocktailDTO topItem = profitable.get(0);
        assertThat(topItem.cocktailId()).isEqualTo(10L);
        assertThat(topItem.quantiteVendue()).isEqualTo(3);
        assertThat(topItem.grossMargin()).isEqualByComparingTo(new BigDecimal("8.50"));
        assertThat(topItem.totalMarginGenerated()).isEqualByComparingTo(new BigDecimal("25.50"));
    }

    @Test
    @DisplayName("getDashboardMarginAnalytics - returns zeros when no orders exist today")
    void getDashboardMarginAnalytics_noOrdersToday_returnsZeros() {
        given(commandeRepository.findByStatutInAndDateCommandeAfter(any(), any()))
                .willReturn(Collections.emptyList());

        DashboardMarginAnalyticsDTO analytics = marginCalculationService.getDashboardMarginAnalytics();

        assertThat(analytics.chiffreAffairesJourHT()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(analytics.totalCogsJour()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(analytics.margeBruteJour()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(analytics.tauxMargeBruteJour()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(analytics.mostProfitableCocktails()).isEmpty();
    }

    @Test
    @DisplayName("calculateCocktailMargin - computes margins for cocktail and its variants")
    void calculateCocktailMargin_withVariants_computesVariantCostsAndMargins() {
        Cocktail margarita = new Cocktail();
        margarita.setId(20L);
        margarita.setNom("Margarita");
        margarita.setPrix(new BigDecimal("10.00"));
        margarita.setVatRate(VatRate.TWENTY);

        CocktailIngredient ci = new CocktailIngredient();
        ci.setId(201L);
        ci.setCocktail(margarita);
        ci.setIngredient(rum);
        ci.setQuantite(new BigDecimal("5"));
        ci.setUnite("cl");
        margarita.setIngredients(List.of(ci));

        CocktailVariante v1 = new CocktailVariante();
        v1.setId(501L);
        v1.setNom("Spicy");
        v1.setPrixSupplement(new BigDecimal("1.50"));

        CocktailVarianteIngredient cvi = new CocktailVarianteIngredient();
        cvi.setId(601L);
        cvi.setIngredient(mint);
        cvi.setQuantite(new BigDecimal("2"));
        cvi.setUnite(""); // blank unit to test fallback to ing.getUniteMesure()
        v1.setIngredients(List.of(cvi));

        CocktailVariante v2 = new CocktailVariante();
        v2.setId(502L);
        v2.setNom("Standard Large");
        v2.setPrixSupplement(null); // test null supplement
        v2.setIngredients(Collections.emptyList()); // test empty ingredients fallback to base cocktail recipe

        margarita.setVariantes(List.of(v1, v2));

        given(cocktailRepository.findById(20L)).willReturn(Optional.of(margarita));

        CocktailMarginDTO marginDTO = marginCalculationService.getCocktailMargin(20L);

        assertThat(marginDTO).isNotNull();
        assertThat(marginDTO.variantes()).hasSize(2);

        CocktailVarianteMarginDTO varDto1 = marginDTO.variantes().get(0);
        assertThat(varDto1.nom()).isEqualTo("Spicy");
        assertThat(varDto1.prixTTC()).isEqualByComparingTo(new BigDecimal("11.50"));
        assertThat(varDto1.ingredients()).hasSize(1);

        CocktailVarianteMarginDTO varDto2 = marginDTO.variantes().get(1);
        assertThat(varDto2.nom()).isEqualTo("Standard Large");
        assertThat(varDto2.prixTTC()).isEqualByComparingTo(new BigDecimal("10.00"));
        assertThat(varDto2.recipeCost()).isEqualByComparingTo(marginDTO.recipeCost());
    }

    @Test
    @DisplayName("getDashboardMarginAnalytics - computes orders containing variants and skips null references safely")
    void getDashboardMarginAnalytics_ordersWithVariantsAndNulls() {
        Commande cmd = new Commande();
        cmd.setId(10L);
        cmd.setDateCommande(LocalDateTime.now());
        cmd.setStatut(CommandeStatut.REGLEE);

        CocktailVariante v = new CocktailVariante();
        v.setId(99L);
        v.setNom("Extra");
        v.setPrixSupplement(new BigDecimal("2.00"));
        CocktailVarianteIngredient cvi = new CocktailVarianteIngredient();
        cvi.setIngredient(rum);
        cvi.setQuantite(new BigDecimal("2"));
        cvi.setUnite("cl");
        v.setIngredients(List.of(cvi));

        CommandeItem itemWithVariant = new CommandeItem();
        itemWithVariant.setCocktail(mojito);
        itemWithVariant.setVariante(v);
        itemWithVariant.setQuantite(2);
        itemWithVariant.setPrixUnitaire(new BigDecimal("14.00"));

        CommandeItem itemWithNullCocktail = new CommandeItem();
        itemWithNullCocktail.setCocktail(null);

        CommandeItem itemWithNullPrice = new CommandeItem();
        itemWithNullPrice.setCocktail(mojito);
        itemWithNullPrice.setPrixUnitaire(null);
        itemWithNullPrice.setQuantite(1);

        cmd.setItems(List.of(itemWithVariant, itemWithNullCocktail, itemWithNullPrice));

        Commande emptyCmd = new Commande();
        emptyCmd.setItems(null);

        given(commandeRepository.findByStatutInAndDateCommandeAfter(any(), any()))
                .willReturn(List.of(cmd, emptyCmd));
        given(cocktailRepository.findAll()).willReturn(List.of(mojito));

        DashboardMarginAnalyticsDTO analytics = marginCalculationService.getDashboardMarginAnalytics();

        assertThat(analytics).isNotNull();
        assertThat(analytics.chiffreAffairesJourTTC()).isEqualByComparingTo(new BigDecimal("28.00"));
    }

    @Test
    @DisplayName("getEffectiveDefaultVatRate - retrieves configured rate or falls back")
    void getEffectiveDefaultVatRate_withConfiguredRateAndFallback() {
        AppSettings settings = new AppSettings();
        settings.setDefaultVatRate(new BigDecimal("10.00"));
        given(appSettingsService.getSettings()).willReturn(settings);

        BigDecimal rate = marginCalculationService.getEffectiveDefaultVatRate();
        assertThat(rate).isEqualByComparingTo(new BigDecimal("0.1000"));

        // Fallback on exception
        given(appSettingsService.getSettings()).willThrow(new RuntimeException("DB error"));
        BigDecimal fallbackRate = marginCalculationService.getEffectiveDefaultVatRate();
        assertThat(fallbackRate).isEqualByComparingTo(new BigDecimal("0.20"));
    }

    @Test
    @DisplayName("computeSellingPriceHT and computeGrossMarginPercentage edge cases")
    void calculations_edgeCases() {
        assertThat(marginCalculationService.computeSellingPriceHT(null, VatRate.TWENTY))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(marginCalculationService.computeSellingPriceHT(BigDecimal.ZERO, VatRate.TWENTY))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(marginCalculationService.computeSellingPriceHT(new BigDecimal("12.00"), null))
                .isEqualByComparingTo(new BigDecimal("10.00"));

        assertThat(marginCalculationService.computeGrossMargin(null, new BigDecimal("5.00")))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(marginCalculationService.computeGrossMargin(new BigDecimal("10.00"), null))
                .isEqualByComparingTo(new BigDecimal("10.00"));

        assertThat(marginCalculationService.computeGrossMarginPercentage(null, new BigDecimal("10.00")))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(marginCalculationService.computeGrossMarginPercentage(new BigDecimal("5.00"), null))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(marginCalculationService.computeGrossMarginPercentage(new BigDecimal("5.00"), BigDecimal.ZERO))
                .isEqualByComparingTo(BigDecimal.ZERO);
    }
}
