package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "factures")
public class Facture {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "table_id", nullable = false)
    private TableEntity table;

    @OneToMany(mappedBy = "facture", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FactureItem> items = new ArrayList<>();

    @Column(nullable = false)
    private String numero;

    @Column(nullable = false)
    private BigDecimal total = BigDecimal.ZERO;

    private BigDecimal pourboire;
    private BigDecimal totalTTC;
    @Column(name = "date_facture")
    private LocalDateTime dateFacture;
    @Column(name = "date_reglement")
    private LocalDateTime dateReglement;
    @Column(nullable = false)
    private boolean reglee = false;
    @Column(name = "mode_paiement")
    private String modePaiement;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        dateFacture = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
} 