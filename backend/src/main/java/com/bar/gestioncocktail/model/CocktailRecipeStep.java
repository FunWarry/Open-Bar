package com.bar.gestioncocktail.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Sequential step in a cocktail's preparation recipe.
 * Represents an ingredient addition, a mixology action template, or a custom text instruction.
 */
@Data
@Entity
@Table(name = "cocktail_recipe_steps")
public class CocktailRecipeStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cocktail_id", nullable = false)
    private Cocktail cocktail;

    @NotNull(message = "Step order is required")
    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    @NotNull(message = "Step type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "step_type", nullable = false)
    private RecipeStepType stepType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ingredient_id")
    private Ingredient ingredient;

    @Column(precision = 10, scale = 2)
    private BigDecimal quantite;

    @Size(max = 20, message = "Unit cannot exceed 20 characters")
    private String unite;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "template_id")
    private RecipeStepTemplate template;

    @Size(max = 100, message = "Action title cannot exceed 100 characters")
    @Column(name = "action_title")
    private String actionTitle;

    @Column(name = "custom_text", columnDefinition = "TEXT")
    private String customText;

    @Column(name = "duration_seconds")
    private Integer durationSeconds = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
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
