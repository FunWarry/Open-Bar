package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

/**
 * JPA entity representing a scheduled promotional pricing rule (Happy Hour).
 * Defines time windows, participating days of the week, target drinks/categories,
 * and the specific discount strategy to apply dynamically.
 */
@Data
@Entity
@Table(name = "happy_hour_rules")
public class HappyHourRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Rule name is required")
    @Size(max = 100, message = "Rule name cannot exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String name;

    @NotNull(message = "Start time is required")
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "happy_hour_days", joinColumns = @JoinColumn(name = "rule_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", length = 20, nullable = false)
    private Set<DayOfWeek> daysOfWeek = new HashSet<>();

    @NotNull(message = "Discount type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", length = 30, nullable = false)
    private DiscountType discountType;

    @NotNull(message = "Discount value is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Discount value cannot be negative")
    @Column(name = "discount_value", precision = 10, scale = 2, nullable = false)
    private BigDecimal discountValue;

    @Column(nullable = false)
    private boolean active = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "happy_hour_categories", joinColumns = @JoinColumn(name = "rule_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 50, nullable = false)
    private Set<CocktailCategorie> categories = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "happy_hour_cocktails", joinColumns = @JoinColumn(name = "rule_id"))
    @Column(name = "cocktail_id", nullable = false)
    private Set<Long> cocktailIds = new HashSet<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }

    /**
     * Checks if this rule is active and matches the given calendar timestamp.
     *
     * @param dateTime Date and time to evaluate
     * @return True if the rule's active flag, day-of-week, and time window match
     */
    public boolean isApplicableAt(LocalDateTime dateTime) {
        if (!active || dateTime == null) {
            return false;
        }

        if (daysOfWeek != null && !daysOfWeek.isEmpty() && !daysOfWeek.contains(dateTime.getDayOfWeek())) {
            return false;
        }

        LocalTime time = dateTime.toLocalTime();
        if (startTime == null || endTime == null) {
            return true;
        }

        if (startTime.isBefore(endTime) || startTime.equals(endTime)) {
            return !time.isBefore(startTime) && !time.isAfter(endTime);
        } else {
            // Overnight window (e.g., 22:00 to 02:00)
            return !time.isBefore(startTime) || !time.isAfter(endTime);
        }
    }

    /**
     * Checks if this rule applies to the specified cocktail based on explicit cocktail IDs or category filters.
     * If neither explicit cocktail IDs nor categories are specified, the rule applies to all drinks.
     *
     * @param cocktail Cocktail to test
     * @return True if the drink is covered by this promotional rule
     */
    public boolean matchesCocktail(Cocktail cocktail) {
        if (cocktail == null) {
            return false;
        }

        boolean hasCocktailFilter = cocktailIds != null && !cocktailIds.isEmpty();
        boolean hasCategoryFilter = categories != null && !categories.isEmpty();

        if (!hasCocktailFilter && !hasCategoryFilter) {
            return true;
        }

        if (hasCocktailFilter && cocktail.getId() != null && cocktailIds.contains(cocktail.getId())) {
            return true;
        }

        return hasCategoryFilter && cocktail.getCategorie() != null && categories.contains(cocktail.getCategorie());
    }

    /**
     * Computes the discounted price for a given base price according to this rule's discount strategy.
     *
     * @param basePrice Initial original price
     * @return Promotional discounted price (never negative, never greater than base price)
     */
    public BigDecimal calculateDiscountedPrice(BigDecimal basePrice) {
        if (basePrice == null || basePrice.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal val = discountValue != null ? discountValue : BigDecimal.ZERO;

        return switch (discountType) {
            case PERCENTAGE -> {
                BigDecimal discount = basePrice.multiply(val)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                yield basePrice.subtract(discount).max(BigDecimal.ZERO);
            }
            case FIXED_PRICE -> val.min(basePrice).max(BigDecimal.ZERO);
            case FIXED_DISCOUNT -> basePrice.subtract(val).max(BigDecimal.ZERO);
        };
    }
}
