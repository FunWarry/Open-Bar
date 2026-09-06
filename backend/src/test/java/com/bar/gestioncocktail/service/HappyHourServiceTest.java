package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.PricingPreviewResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.model.DiscountType;
import com.bar.gestioncocktail.model.HappyHourRule;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.bar.gestioncocktail.repository.HappyHourRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link HappyHourService} verifying promotional calculations, schedule boundaries,
 * overnight time windows, cocktail/category matching, and live price simulations.
 */
@ExtendWith(MockitoExtension.class)
class HappyHourServiceTest {

    @Mock
    private HappyHourRuleRepository ruleRepository;

    @Mock
    private CocktailRepository cocktailRepository;

    @Mock
    private CocktailVarianteRepository varianteRepository;

    @Mock
    private TimeService timeService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private HappyHourService happyHourService;

    private Cocktail testCocktail;
    private HappyHourRule standardRule;

    @BeforeEach
    void setUp() {
        testCocktail = new Cocktail();
        testCocktail.setId(10L);
        testCocktail.setNom("Mojito Traditional");
        testCocktail.setPrix(new BigDecimal("10.00"));
        testCocktail.setCategorie(CocktailCategorie.ALCOOLISE);

        standardRule = new HappyHourRule();
        standardRule.setId(1L);
        standardRule.setName("Afterwork Promo");
        standardRule.setStartTime(LocalTime.of(18, 0));
        standardRule.setEndTime(LocalTime.of(20, 0));
        standardRule.setDaysOfWeek(new HashSet<>(Set.of(DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)));
        standardRule.setDiscountType(DiscountType.PERCENTAGE);
        standardRule.setDiscountValue(new BigDecimal("20.00"));
        standardRule.setActive(true);
        standardRule.setCategories(new HashSet<>(Set.of(CocktailCategorie.ALCOOLISE)));
        standardRule.setCocktailIds(new HashSet<>());
    }

    @Test
    @DisplayName("getAllRules returns all configured rules")
    void getAllRules_returnsAllRules() {
        when(ruleRepository.findAll()).thenReturn(List.of(standardRule));

        List<HappyHourRule> rules = happyHourService.getAllRules();

        assertThat(rules).hasSize(1);
        assertThat(rules.getFirst().getName()).isEqualTo("Afterwork Promo");
    }

    @Test
    @DisplayName("getActiveRules returns only enabled rules")
    void getActiveRules_returnsActiveRules() {
        when(ruleRepository.findByActiveTrue()).thenReturn(List.of(standardRule));

        List<HappyHourRule> rules = happyHourService.getActiveRules();

        assertThat(rules).hasSize(1);
        assertThat(rules.getFirst().isActive()).isTrue();
    }

    @Test
    @DisplayName("getRuleById returns rule when found")
    void getRuleById_found_returnsRule() {
        when(ruleRepository.findById(1L)).thenReturn(Optional.of(standardRule));

        Optional<HappyHourRule> result = happyHourService.getRuleById(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("createRule succeeds with valid fields")
    void createRule_validPayload_savesAndAudits() {
        when(timeService.now()).thenReturn(LocalDateTime.of(2026, 9, 5, 12, 0));
        when(ruleRepository.save(any(HappyHourRule.class))).thenAnswer(invocation -> {
            HappyHourRule r = invocation.getArgument(0);
            r.setId(99L);
            return r;
        });

        HappyHourRule created = happyHourService.createRule(standardRule);

        assertThat(created.getId()).isEqualTo(99L);
        verify(ruleRepository).save(standardRule);
        verify(auditLogService).logAction(eq(null), eq("CREATE_HAPPY_HOUR_RULE"), eq("HappyHourRule"), eq(99L), any(), eq(null));
    }

    @Test
    @DisplayName("createRule throws BusinessException when name is blank")
    void createRule_blankName_throwsException() {
        standardRule.setName("   ");

        assertThatThrownBy(() -> happyHourService.createRule(standardRule))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Rule name cannot be blank");
    }

    @Test
    @DisplayName("createRule throws BusinessException when times are null")
    void createRule_nullTime_throwsException() {
        standardRule.setStartTime(null);

        assertThatThrownBy(() -> happyHourService.createRule(standardRule))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Start time and end time are required");
    }

    @Test
    @DisplayName("createRule throws BusinessException when discount is negative or percentage > 100")
    void createRule_invalidDiscount_throwsException() {
        standardRule.setDiscountValue(new BigDecimal("-5.00"));
        assertThatThrownBy(() -> happyHourService.createRule(standardRule))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot be negative");

        standardRule.setDiscountValue(new BigDecimal("105.00"));
        assertThatThrownBy(() -> happyHourService.createRule(standardRule))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot exceed 100%");
    }

    @Test
    @DisplayName("updateRule updates attributes and audits change")
    void updateRule_existingId_updatesRule() {
        when(ruleRepository.findById(1L)).thenReturn(Optional.of(standardRule));
        when(timeService.now()).thenReturn(LocalDateTime.of(2026, 9, 5, 14, 0));
        when(ruleRepository.save(any(HappyHourRule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        HappyHourRule updatedData = new HappyHourRule();
        updatedData.setName("Renamed Promo");
        updatedData.setStartTime(LocalTime.of(17, 0));
        updatedData.setEndTime(LocalTime.of(21, 0));
        updatedData.setDaysOfWeek(Set.of(DayOfWeek.FRIDAY));
        updatedData.setDiscountType(DiscountType.FIXED_DISCOUNT);
        updatedData.setDiscountValue(new BigDecimal("3.00"));
        updatedData.setActive(true);
        updatedData.setCategories(Set.of(CocktailCategorie.ALCOOLISE));
        updatedData.setCocktailIds(Collections.emptySet());

        HappyHourRule result = happyHourService.updateRule(1L, updatedData);

        assertThat(result.getName()).isEqualTo("Renamed Promo");
        assertThat(result.getStartTime()).isEqualTo(LocalTime.of(17, 0));
        assertThat(result.getDiscountType()).isEqualTo(DiscountType.FIXED_DISCOUNT);
        verify(auditLogService).logAction(eq(null), eq("UPDATE_HAPPY_HOUR_RULE"), eq("HappyHourRule"), eq(1L), any(), eq(null));
    }

    @Test
    @DisplayName("updateRule throws ResourceNotFoundException when rule does not exist")
    void updateRule_notFound_throwsException() {
        when(ruleRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> happyHourService.updateRule(999L, standardRule))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Happy Hour rule not found with id: 999");
    }

    @Test
    @DisplayName("deleteRule deletes existing rule and logs audit")
    void deleteRule_existingId_deletesRule() {
        when(ruleRepository.findById(1L)).thenReturn(Optional.of(standardRule));

        happyHourService.deleteRule(1L);

        verify(ruleRepository).delete(standardRule);
        verify(auditLogService).logAction(eq(null), eq("DELETE_HAPPY_HOUR_RULE"), eq("HappyHourRule"), eq(1L), any(), eq(null));
    }

    @Test
    @DisplayName("toggleActive flips active flag")
    void toggleActive_flipsState() {
        when(ruleRepository.findById(1L)).thenReturn(Optional.of(standardRule));
        when(timeService.now()).thenReturn(LocalDateTime.of(2026, 9, 5, 10, 0));
        when(ruleRepository.save(any(HappyHourRule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        HappyHourRule toggled = happyHourService.toggleActive(1L);
        assertThat(toggled.isActive()).isFalse();

        toggled = happyHourService.toggleActive(1L);
        assertThat(toggled.isActive()).isTrue();
    }

    @Test
    @DisplayName("resolveEffectivePrice applies percentage discount during promotional window")
    void resolveEffectivePrice_percentageDiscount_appliesDiscount() {
        when(ruleRepository.findByActiveTrue()).thenReturn(List.of(standardRule));

        // Friday 19:00 -> within Tuesday-Friday 18:00-20:00 window
        LocalDateTime promoTime = LocalDateTime.of(2026, 9, 4, 19, 0); // Friday

        BigDecimal effectivePrice = happyHourService.resolveEffectivePrice(testCocktail, null, promoTime);

        // 10.00 EUR - 20% = 8.00 EUR
        assertThat(effectivePrice).isEqualByComparingTo("8.00");
    }

    @Test
    @DisplayName("resolveEffectivePrice applies fixed price strategy")
    void resolveEffectivePrice_fixedPrice_appliesFixedPrice() {
        standardRule.setDiscountType(DiscountType.FIXED_PRICE);
        standardRule.setDiscountValue(new BigDecimal("5.50"));
        when(ruleRepository.findByActiveTrue()).thenReturn(List.of(standardRule));

        LocalDateTime promoTime = LocalDateTime.of(2026, 9, 4, 18, 30); // Friday

        BigDecimal effectivePrice = happyHourService.resolveEffectivePrice(testCocktail, null, promoTime);

        assertThat(effectivePrice).isEqualByComparingTo("5.50");
    }

    @Test
    @DisplayName("resolveEffectivePrice applies fixed discount strategy")
    void resolveEffectivePrice_fixedDiscount_appliesFixedDiscount() {
        standardRule.setDiscountType(DiscountType.FIXED_DISCOUNT);
        standardRule.setDiscountValue(new BigDecimal("2.50"));
        when(ruleRepository.findByActiveTrue()).thenReturn(List.of(standardRule));

        LocalDateTime promoTime = LocalDateTime.of(2026, 9, 4, 18, 30); // Friday

        BigDecimal effectivePrice = happyHourService.resolveEffectivePrice(testCocktail, null, promoTime);

        // 10.00 - 2.50 = 7.50
        assertThat(effectivePrice).isEqualByComparingTo("7.50");
    }

    @Test
    @DisplayName("resolveEffectivePrice returns base price outside time window or on non-matching days")
    void resolveEffectivePrice_outsideSchedule_returnsBasePrice() {
        when(ruleRepository.findByActiveTrue()).thenReturn(List.of(standardRule));

        // Monday 19:00 (rule is Tue-Fri only)
        LocalDateTime monday = LocalDateTime.of(2026, 8, 31, 19, 0);
        BigDecimal priceMonday = happyHourService.resolveEffectivePrice(testCocktail, null, monday);
        assertThat(priceMonday).isEqualByComparingTo("10.00");

        // Friday 21:00 (window ends at 20:00)
        LocalDateTime lateFriday = LocalDateTime.of(2026, 9, 4, 21, 0);
        BigDecimal priceLate = happyHourService.resolveEffectivePrice(testCocktail, null, lateFriday);
        assertThat(priceLate).isEqualByComparingTo("10.00");
    }

    @Test
    @DisplayName("resolveEffectivePrice with variant incorporates variant price supplement before discount")
    void resolveEffectivePrice_withVariant_calculatesOnTotalBasePrice() {
        CocktailVariante variante = new CocktailVariante();
        variante.setId(5L);
        variante.setNom("Pitcher (1L)");
        variante.setPrixSupplement(new BigDecimal("10.00")); // base 10 + 10 = 20 EUR

        when(ruleRepository.findByActiveTrue()).thenReturn(List.of(standardRule));
        LocalDateTime promoTime = LocalDateTime.of(2026, 9, 4, 18, 30);

        BigDecimal effectivePrice = happyHourService.resolveEffectivePrice(testCocktail, variante, promoTime);

        // 20.00 EUR - 20% = 16.00 EUR
        assertThat(effectivePrice).isEqualByComparingTo("16.00");
    }

    @ParameterizedTest(name = "Exact boundary check at {0}:{1} expected active={2}")
    @CsvSource({
            "17, 59, false", // 1 minute before start
            "18, 00, true",  // Exact start time
            "19, 00, true",  // Mid-window
            "20, 00, true",  // Exact end time
            "20, 01, false"  // 1 minute after end
    })
    void scheduleBoundaries_exactMinutesEvaluation(int hour, int minute, boolean expectedActive) {
        LocalDateTime timestamp = LocalDateTime.of(2026, 9, 4, hour, minute); // Friday
        boolean applicable = standardRule.isApplicableAt(timestamp);
        assertThat(applicable).isEqualTo(expectedActive);
    }

    @ParameterizedTest(name = "Overnight window 22:00-02:00 at {0}:{1} expected active={2}")
    @CsvSource({
            "21, 59, false",
            "22, 00, true",
            "23, 30, true",
            "00, 30, true",
            "01, 59, true",
            "02, 00, true",
            "02, 01, false",
            "14, 00, false"
    })
    void overnightWindow_evaluatesCorrectly(int hour, int minute, boolean expectedActive) {
        HappyHourRule overnightRule = new HappyHourRule();
        overnightRule.setStartTime(LocalTime.of(22, 0));
        overnightRule.setEndTime(LocalTime.of(2, 0));
        overnightRule.setActive(true);
        overnightRule.setDaysOfWeek(Collections.emptySet()); // all days

        LocalDateTime eval = LocalDateTime.of(2026, 9, 5, hour, minute);
        assertThat(overnightRule.isApplicableAt(eval)).isEqualTo(expectedActive);
    }

    @Test
    @DisplayName("resolveEffectivePrice selects best discount when multiple overlapping rules match")
    void resolveEffectivePrice_overlappingRules_picksBestDiscount() {
        HappyHourRule rule1 = new HappyHourRule();
        rule1.setName("20% off");
        rule1.setStartTime(LocalTime.of(18, 0));
        rule1.setEndTime(LocalTime.of(21, 0));
        rule1.setActive(true);
        rule1.setDiscountType(DiscountType.PERCENTAGE);
        rule1.setDiscountValue(new BigDecimal("20.00")); // 10 -> 8.00 EUR

        HappyHourRule rule2 = new HappyHourRule();
        rule2.setName("Fixed 6.50 EUR");
        rule2.setStartTime(LocalTime.of(18, 0));
        rule2.setEndTime(LocalTime.of(21, 0));
        rule2.setActive(true);
        rule2.setDiscountType(DiscountType.FIXED_PRICE);
        rule2.setDiscountValue(new BigDecimal("6.50")); // 10 -> 6.50 EUR (better)

        when(ruleRepository.findByActiveTrue()).thenReturn(List.of(rule1, rule2));

        BigDecimal price = happyHourService.resolveEffectivePrice(testCocktail, null, LocalDateTime.of(2026, 9, 4, 19, 0));

        assertThat(price).isEqualByComparingTo("6.50");
    }

    @Test
    @DisplayName("simulatePricing returns comprehensive preview DTO when rule applies")
    void simulatePricing_ruleActive_returnsPreviewDetails() {
        when(cocktailRepository.findById(10L)).thenReturn(Optional.of(testCocktail));
        when(ruleRepository.findByActiveTrue()).thenReturn(List.of(standardRule));

        LocalDateTime promoTime = LocalDateTime.of(2026, 9, 4, 18, 30);

        PricingPreviewResponseDTO preview = happyHourService.simulatePricing(10L, null, promoTime);

        assertThat(preview.isHappyHour()).isTrue();
        assertThat(preview.basePrice()).isEqualByComparingTo("10.00");
        assertThat(preview.effectivePrice()).isEqualByComparingTo("8.00");
        assertThat(preview.discountAmount()).isEqualByComparingTo("2.00");
        assertThat(preview.discountPercentage()).isEqualByComparingTo("20.00");
        assertThat(preview.appliedRuleName()).isEqualTo("Afterwork Promo");
    }

    @Test
    @DisplayName("simulatePricing returns non-discounted preview when no rule applies")
    void simulatePricing_noRuleActive_returnsStandardPrice() {
        when(cocktailRepository.findById(10L)).thenReturn(Optional.of(testCocktail));
        when(ruleRepository.findByActiveTrue()).thenReturn(List.of(standardRule));

        LocalDateTime outsideTime = LocalDateTime.of(2026, 9, 4, 14, 0);

        PricingPreviewResponseDTO preview = happyHourService.simulatePricing(10L, null, outsideTime);

        assertThat(preview.isHappyHour()).isFalse();
        assertThat(preview.basePrice()).isEqualByComparingTo("10.00");
        assertThat(preview.effectivePrice()).isEqualByComparingTo("10.00");
        assertThat(preview.discountAmount()).isEqualByComparingTo("0.00");
        assertThat(preview.appliedRuleId()).isNull();
    }
}
