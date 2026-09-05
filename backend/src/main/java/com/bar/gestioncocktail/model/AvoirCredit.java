package com.bar.gestioncocktail.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Entity representing a legal credit note (avoir) issued when canceling or adjusting an invoice.
 */
@Data
@Entity
@Table(name = "avoirs_credit")
public class AvoirCredit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String numero;

    @ManyToOne
    @JoinColumn(name = "facture_id", nullable = false)
    private Facture facture;

    @Column(name = "total_ht", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalHT;

    @Column(name = "total_vat", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalVAT;

    @Column(name = "total_ttc", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalTTC;

    @Column(name = "motif_annulation")
    private String motif;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
