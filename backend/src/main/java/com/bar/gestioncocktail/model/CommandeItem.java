package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
/**
 * JPA entity representing an individual beverage or cocktail line within an order.
 */

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

    @NotNull(message = "Cocktail is required")
    @ManyToOne
    @JoinColumn(name = "cocktail_id", nullable = false)
    private Cocktail cocktail;

    @ManyToOne
    @JoinColumn(name = "cocktail_variante_id")
    private CocktailVariante variante;

    @Min(value = 1, message = "Quantity must be at least 1")
    @Column(nullable = false)
    private int quantite;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Unit price must be greater than 0")
    @Column(nullable = false)
    private BigDecimal prixUnitaire;

    private String notes;
    private boolean prioritaire = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "station", length = 30)
    private PreparationStation station;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", length = 30, nullable = false)
    private CommandeStatut statut = CommandeStatut.EN_ATTENTE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        if (station == null) {
            station = PreparationStation.BAR;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }

    public PreparationStation getStation() {
        return station;
    }

    public void setStation(PreparationStation station) {
        this.station = station;
    }

    public CommandeStatut getStatut() {
        return statut != null ? statut : CommandeStatut.EN_ATTENTE;
    }

    public void setStatut(CommandeStatut statut) {
        this.statut = statut != null ? statut : CommandeStatut.EN_ATTENTE;
    }
}