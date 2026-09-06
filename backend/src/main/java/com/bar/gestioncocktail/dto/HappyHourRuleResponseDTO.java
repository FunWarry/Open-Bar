package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.DiscountType;
import com.bar.gestioncocktail.model.HappyHourRule;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Response DTO describing a Happy Hour promotional pricing rule.
 *
 * @param id            Unique identifier of the rule
 * @param name          Descriptive promotional rule title
 * @param startTime     Window opening time (e.g. 18:00)
 * @param endTime       Window closing time (e.g. 20:00)
 * @param daysOfWeek    Participating days of the week
 * @param discountType  Type of discount (PERCENTAGE, FIXED_PRICE, FIXED_DISCOUNT)
 * @param discountValue Value applied according to discount type
 * @param active        Current enabled/disabled status
 * @param categories    Targeted categories (empty means applies to all categories if cocktailIds is also empty)
 * @param cocktailIds   Targeted cocktail identifiers
 * @param isActiveNow   Indicates if this rule is currently in effect right now
 * @param createdAt     Creation timestamp
 * @param updatedAt     Last modification timestamp
 */
@Schema(description = "Happy Hour promotional pricing rule details")
public record HappyHourRuleResponseDTO(
        @Schema(description = "Rule identifier", example = "1")
        Long id,

        @Schema(description = "Rule name", example = "Afterwork Happy Hour")
        String name,

        @Schema(description = "Start time of promotional period", example = "17:00")
        LocalTime startTime,

        @Schema(description = "End time of promotional period", example = "19:00")
        LocalTime endTime,

        @Schema(description = "Applicable days of the week")
        Set<DayOfWeek> daysOfWeek,

        @Schema(description = "Discount strategy", example = "PERCENTAGE")
        DiscountType discountType,

        @Schema(description = "Discount numeric value", example = "20.00")
        BigDecimal discountValue,

        @Schema(description = "Whether the rule is enabled", example = "true")
        boolean active,

        @Schema(description = "Target cocktail categories (empty means all)")
        Set<CocktailCategorie> categories,

        @Schema(description = "Target cocktail IDs (empty means all)")
        Set<Long> cocktailIds,

        @Schema(description = "Whether the rule is in effect right now", example = "true")
        boolean isActiveNow,

        @Schema(description = "Creation timestamp")
        LocalDateTime createdAt,

        @Schema(description = "Last modification timestamp")
        LocalDateTime updatedAt
) {
    /**
     * Converts a {@link HappyHourRule} JPA entity into a response DTO evaluated against the current system time.
     *
     * @param rule Entity to convert
     * @return Formatted HappyHourRuleResponseDTO
     */
    public static HappyHourRuleResponseDTO from(HappyHourRule rule) {
        return from(rule, LocalDateTime.now(ZoneId.systemDefault()));
    }

    /**
     * Converts a {@link HappyHourRule} entity evaluated at a specific reference timestamp.
     *
     * @param rule Entity to convert
     * @param now Reference timestamp for evaluating isActiveNow
     * @return Formatted HappyHourRuleResponseDTO
     */
    public static HappyHourRuleResponseDTO from(HappyHourRule rule, LocalDateTime now) {
        if (rule == null) {
            return null;
        }

        boolean activeNow = rule.isApplicableAt(now);

        return new HappyHourRuleResponseDTO(
            rule.getId(),
            rule.getName(),
            rule.getStartTime(),
            rule.getEndTime(),
            rule.getDaysOfWeek() != null ? new HashSet<>(rule.getDaysOfWeek()) : Collections.emptySet(),
            rule.getDiscountType(),
            rule.getDiscountValue(),
            rule.isActive(),
            rule.getCategories() != null ? new HashSet<>(rule.getCategories()) : Collections.emptySet(),
            rule.getCocktailIds() != null ? new HashSet<>(rule.getCocktailIds()) : Collections.emptySet(),
            activeNow,
            rule.getCreatedAt(),
            rule.getUpdatedAt()
        );
    }
}
