package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Reusable preparation action template that can be shared across multiple cocktail recipes.
 */
@Data
@Entity
@Table(name = "recipe_step_templates")
public class RecipeStepTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Template name is required")
    @Size(max = 100, message = "Name cannot exceed 100 characters")
    @Column(nullable = false)
    private String name;

    @NotNull(message = "Action type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private RecipeStepActionType actionType;

    @Column(name = "default_duration_seconds")
    private Integer defaultDurationSeconds = 0;

    @Size(max = 50, message = "Icon cannot exceed 50 characters")
    private String icon;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_predefined")
    private boolean isPredefined = false;

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
