package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "commande_items")
public class CommandeItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "commande_id", nullable = false)
    private Commande commande;

    @ManyToOne
    @JoinColumn(name = "cocktail_id", nullable = false)
    private Cocktail cocktail;

    @ManyToOne
    @JoinColumn(name = "variante_id")
    private CocktailVariante variante;

    @Column(nullable = false)
    private int quantite;

    @Column(nullable = false)
    private BigDecimal prixUnitaire;

    private String notes;
    private boolean prioritaire = false;
} 