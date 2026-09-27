package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

/**
 * JPA entity representing a confection source mapping: a raw source ingredient
 * that is transformed into a crafted (confectionné) ingredient with a specific yield ratio.
 *
 * <p>Example: 1 "Citron jaune" (source) yields 3.0 cl of "Jus de citron jaune" (crafted).
 * The {@code yieldRatio} expresses how many units of the crafted ingredient
 * are produced from one unit of the source ingredient.</p>
 */
@Data
@Entity
@Table(name = "ingredient_confection_sources",
       uniqueConstraints = @UniqueConstraint(columnNames = {"crafted_ingredient_id", "source_ingredient_id"}))
public class IngredientConfectionSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The crafted (confectionné) ingredient produced from source ingredients.
     */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "crafted_ingredient_id", nullable = false)
    private Ingredient craftedIngredient;

    /**
     * The raw source ingredient consumed during confection.
     */
    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "source_ingredient_id", nullable = false)
    private Ingredient sourceIngredient;

    /**
     * Yield ratio: how many units of the crafted ingredient are produced
     * from one unit of the source ingredient.
     * <p>Example: yieldRatio=3.0 means 1 source unit produces 3.0 crafted units.</p>
     */
    @NotNull
    @DecimalMin(value = "0.0001", message = "Yield ratio must be positive")
    @Column(name = "yield_ratio", nullable = false, precision = 10, scale = 4)
    private BigDecimal yieldRatio;

    /**
     * Unit of the yield output (e.g., "cl", "g", "pièce").
     * Should match the crafted ingredient's unit of measure.
     */
    @Column(name = "yield_unit", length = 20)
    private String yieldUnit;

    /**
     * Optional notes about this confection source mapping.
     */
    @Column(name = "notes")
    private String notes;
}
