package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity representing an individual split settlement on an invoice.
 * Stores payment details, guest identifiers, allocated amounts, and consumed items.
 */
@Data
@Entity
@Table(name = "facture_reglements")
public class FactureReglement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facture_id", nullable = false)
    private Facture facture;

    @Column(name = "nom_convive", nullable = false, length = 100)
    private String nomConvive;

    @Column(name = "part_index", nullable = false)
    private Integer partIndex;

    @Column(name = "total_parts")
    private Integer totalParts;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal montant = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal pourboire = BigDecimal.ZERO;

    @Column(name = "total_regle", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalRegle = BigDecimal.ZERO;

    @Column(name = "mode_paiement", nullable = false, length = 50)
    private String modePaiement;

    @Column(name = "type_split", nullable = false, length = 20)
    private String typeSplit = "EGAL";

    @Column(name = "items_json", columnDefinition = "TEXT")
    private String itemsJson;

    @Column(name = "date_reglement", nullable = false)
    private LocalDateTime dateReglement;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        if (dateReglement == null) {
            dateReglement = LocalDateTime.now(java.time.ZoneId.systemDefault());
        }
    }
}
