package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "cocktails")
public class Cocktail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le nom du cocktail est obligatoire")
    @Size(max = 255, message = "Le nom ne peut pas dépasser 255 caractères")
    @Column(nullable = false)
    private String nom;

    @Size(max = 1000, message = "La description ne peut pas dépasser 1000 caractères")
    @Column(length = 1000)
    private String description;

    @NotNull(message = "Le prix est obligatoire")
    @DecimalMin(value = "0.0", inclusive = false, message = "Le prix doit être supérieur à 0")
    @Column(nullable = false)
    private BigDecimal prix;

    @NotNull(message = "La catégorie est obligatoire")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CocktailCategorie categorie;

    @Enumerated(EnumType.STRING)
    @Column(name = "vat_rate", nullable = false)
    private VatRate vatRate = VatRate.TWENTY;

    private boolean disponible = true;
    private boolean saisonnier = false;
    private LocalDateTime dateDebutSaison;
    private LocalDateTime dateFinSaison;

    // Saisonnalité par mois (1-12), null = toute l'année
    private Integer moisDebut;
    private Integer moisFin;

    @Transient
    public boolean isDisponibleAujourdhui() {
        if (moisDebut == null || moisFin == null) return true;
        int moisActuel = java.time.LocalDate.now(java.time.ZoneId.systemDefault()).getMonthValue();
        if (moisDebut <= moisFin) {
            return moisActuel >= moisDebut && moisActuel <= moisFin;
        }
        // Chevauchement d'année (ex: Oct → Fév)
        return moisActuel >= moisDebut || moisActuel <= moisFin;
    }

    @OneToMany(mappedBy = "cocktail", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<CocktailIngredient> ingredients;

    @OneToMany(mappedBy = "cocktail", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<CocktailVariante> variantes;

    private String instructions;
    private String imageUrl;
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