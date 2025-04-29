package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
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

    @Column(nullable = false)
    private String nom;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private BigDecimal prix;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CocktailCategorie categorie;

    private boolean disponible = true;
    private boolean saisonnier = false;
    private LocalDateTime dateDebutSaison;
    private LocalDateTime dateFinSaison;

    @OneToMany(mappedBy = "cocktail", cascade = CascadeType.ALL)
    private List<CocktailIngredient> ingredients;

    @OneToMany(mappedBy = "cocktail", cascade = CascadeType.ALL)
    private List<CocktailVariante> variantes;

    private String instructions;
    private String imageUrl;
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