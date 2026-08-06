package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "facture_items")
public class FactureItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "facture_id", nullable = false)
    private Facture facture;

    @ManyToOne
    @JoinColumn(name = "commande_item_id", nullable = true)
    private CommandeItem commandeItem;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private int quantite;

    @Column(nullable = false)
    private BigDecimal prixUnitaire;

    @Column(nullable = false)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(name = "vat_rate")
    private VatRate vatRate = VatRate.TWENTY;

    @Column(name = "price_ht")
    private BigDecimal priceHT;

    @Column(name = "vat_amount")
    private BigDecimal vatAmount;

    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
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