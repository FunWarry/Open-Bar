package com.bar.gestioncocktail.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;

import java.time.LocalDateTime;

/**
 * Entity representing an individual glassware assignment for a cocktail recipe,
 * supporting multi-glass presentations (e.g. primary martini glass, sidecar shot, water chaser).
 */
@Data
@Entity
@Table(name = "cocktail_glasses")
public class CocktailGlass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cocktail_id", nullable = false)
    private Cocktail cocktail;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "glassware_id")
    private Glassware glassware;

    @NotNull(message = "Glass order is required")
    @Column(name = "glass_order", nullable = false)
    private Integer glassOrder = 1;

    @Size(max = 100, message = "Role label cannot exceed 100 characters")
    @Column(name = "role_label", length = 100)
    private String roleLabel;

    @Column(name = "is_primary", nullable = false)
    private boolean isPrimary = false;

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
