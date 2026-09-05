package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity representing a glassware type (tumbler, coupe, flute, etc.)
 * with its capacity in cl and reference image.
 */
@Data
@Entity
@Table(name = "glassware")
public class Glassware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Glassware name is required")
    @Size(max = 100, message = "Name cannot exceed 100 characters")
    @Column(nullable = false, unique = true)
    private String nom;

    @NotNull(message = "Capacity in cl is required")
    @DecimalMin(value = "0.1", message = "Capacity must be strictly positive")
    @Column(name = "contenance_cl", nullable = false)
    private BigDecimal contenanceCl;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(length = 1000)
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
