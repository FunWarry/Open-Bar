package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "ingredients")
public class Ingredient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Ingredient name is required")
    @Size(max = 255, message = "Name cannot exceed 255 characters")
    @Column(nullable = false)
    private String nom;

    @NotBlank(message = "Unit of measure is required")
    @Size(max = 50, message = "Unit of measure cannot exceed 50 characters")
    @Column(nullable = false)
    private String uniteMesure;

    @NotNull(message = "Stock quantity is required")
    @DecimalMin(value = "0.0", message = "Stock quantity cannot be negative")
    @Column(nullable = false)
    private BigDecimal quantiteStock;

    @NotNull(message = "Alert threshold is required")
    @DecimalMin(value = "0.0", message = "Alert threshold cannot be negative")
    @Column(nullable = false)
    private BigDecimal seuilAlerte;

    private String numeroLot;
    private LocalDateTime datePeremption;
    private BigDecimal prixUnitaire;
    private String fournisseur;
    private String notes;
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