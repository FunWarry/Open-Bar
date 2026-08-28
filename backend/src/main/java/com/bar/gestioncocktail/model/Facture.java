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
    @JoinColumn(name = "table_id", nullable = true)
    private TableEntity table;

    @OneToMany(mappedBy = "facture", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<FactureItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "facture", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FactureReglement> reglements = new ArrayList<>();

    @Column(nullable = false)
    private String numero;

    @Column(nullable = false)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "total_ht")
    private BigDecimal totalHT = BigDecimal.ZERO;

    @Column(name = "total_vat")
    private BigDecimal totalVAT = BigDecimal.ZERO;

    private BigDecimal pourboire;
    @Column(name = "total_ttc")
    private BigDecimal totalTTC;
    @Column(name = "date_facture")
    private LocalDateTime dateFacture;
    @Column(name = "date_reglement")
    private LocalDateTime dateReglement;
    @Column(nullable = false)
    private boolean reglee = false;

    @Column(name = "is_finalized", nullable = false)
    private boolean isFinalized = false;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @Column(name = "retention_until")
    private LocalDateTime retentionUntil;

    @Column(name = "archived_pdf_path")
    private String archivedPdfPath;

    @Column(name = "pdf_hash", length = 64)
    private String pdfHash;

    @Column(name = "mode_paiement")
    private String modePaiement;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        if (dateFacture == null) {
            dateFacture = LocalDateTime.now(java.time.ZoneId.systemDefault());
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }
} 