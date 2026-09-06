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

    @NotBlank(message = "Cocktail name is required")
    @Size(max = 255, message = "Name cannot exceed 255 characters")
    @Column(nullable = false)
    private String nom;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    @Column(length = 1000)
    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    @Column(nullable = false)
    private BigDecimal prix;

    @NotNull(message = "Category is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CocktailCategorie categorie;

    @Enumerated(EnumType.STRING)
    @Column(name = "vat_rate", nullable = false)
    private VatRate vatRate = VatRate.TWENTY;

    @Enumerated(EnumType.STRING)
    @Column(name = "station", nullable = false)
    private PreparationStation station = PreparationStation.BAR;

    private boolean disponible = true;
    private boolean saisonnier = false;
    private LocalDateTime dateDebutSaison;
    private LocalDateTime dateFinSaison;

    // Monthly seasonality (1-12), null = year-round
    private Integer moisDebut;
    private Integer moisFin;

    @Transient
    public boolean isDisponibleAujourdhui() {
        if (moisDebut == null || moisFin == null) return true;
        int moisActuel = java.time.LocalDate.now(java.time.ZoneId.systemDefault()).getMonthValue();
        if (moisDebut <= moisFin) {
            return moisActuel >= moisDebut && moisActuel <= moisFin;
        }
        // Year wrap-around (e.g. Oct → Feb)
        return moisActuel >= moisDebut || moisActuel <= moisFin;
    }

    @OneToMany(mappedBy = "cocktail", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CocktailIngredient> ingredients = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "cocktail", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CocktailVariante> variantes = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "cocktail", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepOrder ASC")
    private List<CocktailRecipeStep> recipeSteps = new java.util.ArrayList<>();

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "glassware_id")
    private Glassware glassware;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "cocktail_flavor_profiles", joinColumns = @JoinColumn(name = "cocktail_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "flavor_profile", length = 30)
    private java.util.Set<FlavorProfile> flavorProfiles = new java.util.HashSet<>();

    @Column(name = "alcohol_level", precision = 4, scale = 1)
    private BigDecimal alcoholLevel = BigDecimal.ZERO;

    @Column(name = "is_mocktail")
    private Boolean isMocktail = false;

    @Column(name = "is_vegan")
    private Boolean isVegan = true;

    @Column(name = "is_gluten_free")
    private Boolean isGlutenFree = true;

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

    public java.util.Set<FlavorProfile> getFlavorProfiles() {
        return flavorProfiles;
    }

    public void setFlavorProfiles(java.util.Set<FlavorProfile> flavorProfiles) {
        this.flavorProfiles = flavorProfiles != null ? flavorProfiles : new java.util.HashSet<>();
    }

    public BigDecimal getAlcoholLevel() {
        return alcoholLevel;
    }

    public void setAlcoholLevel(BigDecimal alcoholLevel) {
        this.alcoholLevel = alcoholLevel;
    }

    public boolean isMocktail() {
        return Boolean.TRUE.equals(isMocktail);
    }

    public void setMocktail(Boolean mocktail) {
        this.isMocktail = Boolean.TRUE.equals(mocktail);
    }

    public boolean isVegan() {
        return !Boolean.FALSE.equals(isVegan);
    }

    public void setVegan(Boolean vegan) {
        this.isVegan = !Boolean.FALSE.equals(vegan);
    }

    public boolean isGlutenFree() {
        return !Boolean.FALSE.equals(isGlutenFree);
    }

    public void setGlutenFree(Boolean glutenFree) {
        this.isGlutenFree = !Boolean.FALSE.equals(glutenFree);
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public PreparationStation getStation() {
        return station != null ? station : PreparationStation.BAR;
    }

    public void setStation(PreparationStation station) {
        this.station = station != null ? station : PreparationStation.BAR;
    }
}