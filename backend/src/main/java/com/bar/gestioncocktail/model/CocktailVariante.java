package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a customizable variant of a cocktail (e.g., Virgin, Double, Spicy, Sugar-Free).
 * Variants can have custom ingredients, dedicated mixology instructions, price surcharges,
 * and availability status.
 */
@Data
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Entity
@Table(name = "cocktail_variantes")
public class CocktailVariante {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cocktail_id", nullable = false)
    private Cocktail cocktail;

    @Column(nullable = false)
    @EqualsAndHashCode.Include
    private String nom;

    @Column(length = 1000)
    private String description;

    private BigDecimal prixSupplement;
    
    @Column(name = "multiplicateur_ingredient")
    private BigDecimal multiplicateurIngredient = BigDecimal.ONE;

    private boolean disponible = true;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "recipe_steps_json", columnDefinition = "TEXT")
    private String recipeStepsJson;

    @OneToMany(mappedBy = "variante", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CocktailVarianteIngredient> ingredients = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }
}