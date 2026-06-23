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

    @NotBlank(message = "Le nom de l'ingrédient est obligatoire")
    @Size(max = 255, message = "Le nom ne peut pas dépasser 255 caractères")
    @Column(nullable = false)
    private String nom;

    @NotBlank(message = "L'unité de mesure est obligatoire")
    @Size(max = 50, message = "L'unité de mesure ne peut pas dépasser 50 caractères")
    @Column(nullable = false)
    private String uniteMesure;

    @NotNull(message = "La quantité en stock est obligatoire")
    @DecimalMin(value = "0.0", message = "La quantité en stock ne peut pas être négative")
    @Column(nullable = false)
    private BigDecimal quantiteStock;

    @NotNull(message = "Le seuil d'alerte est obligatoire")
    @DecimalMin(value = "0.0", message = "Le seuil d'alerte ne peut pas être négatif")
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
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
} 