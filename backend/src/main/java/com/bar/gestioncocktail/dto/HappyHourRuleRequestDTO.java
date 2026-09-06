package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.DiscountType;
import com.bar.gestioncocktail.model.HappyHourRule;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Request payload for creating or updating a Happy Hour promotional pricing rule.
 *
 * @param name          Descriptive title for the promotion
 * @param startTime     Start time of the promotional window (e.g. 18:00)
 * @param endTime       End time of the promotional window (e.g. 20:00)
 * @param daysOfWeek    Participating days of the week
 * @param discountType  Type of discount (PERCENTAGE, FIXED_PRICE, FIXED_DISCOUNT)
 * @param discountValue Value of the discount or promotional price
 * @param active        Whether the rule is enabled
 * @param categories    Optional set of cocktail categories this rule applies to
 * @param cocktailIds   Optional set of specific cocktail IDs this rule applies to
 */
@Schema(description = "Payload for creating or updating a Happy Hour rule")
public record HappyHourRuleRequestDTO(
    @NotBlank(message = "Rule name is required")
    @Size(max = 100, message = "Rule name cannot exceed 100 characters")
    String name,

    @NotNull(message = "Start time is required")
    LocalTime startTime,

    @NotNull(message = "End time is required")
    LocalTime endTime,

    Set<DayOfWeek> daysOfWeek,

    @NotNull(message = "Discount type is required")
    DiscountType discountType,

    @NotNull(message = "Discount value is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Discount value cannot be negative")
    BigDecimal discountValue,

    Boolean active,

    Set<CocktailCategorie> categories,

    Set<Long> cocktailIds
) {
    /**
     * Maps this request DTO into a new {@link HappyHourRule} entity instance.
     *
     * @return Configured HappyHourRule entity
     */
    public HappyHourRule toEntity() {
        HappyHourRule rule = new HappyHourRule();
        rule.setName(name);
        rule.setStartTime(startTime);
        rule.setEndTime(endTime);
        rule.setDaysOfWeek(daysOfWeek != null ? new HashSet<>(daysOfWeek) : new HashSet<>());
        rule.setDiscountType(discountType);
        rule.setDiscountValue(discountValue);
        rule.setActive(!Boolean.FALSE.equals(active));
        rule.setCategories(categories != null ? new HashSet<>(categories) : new HashSet<>());
        rule.setCocktailIds(cocktailIds != null ? new HashSet<>(cocktailIds) : new HashSet<>());
        return rule;
    }
}
