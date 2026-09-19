package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity representing a customer bar tab or running ledger without mandatory physical table assignment.
 * Enables bartenders and waitstaff to track drinks across an evening for named patrons and settle upon departure.
 */
@Data
@Entity
@Table(name = "bar_tabs")
@ToString(exclude = {"commandes"})
@EqualsAndHashCode(exclude = {"commandes"})
public class BarTab {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Tab name is required")
    @Size(max = 100, message = "Tab name cannot exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String nom;

    @Size(max = 100, message = "Client reference cannot exceed 100 characters")
    @Column(name = "client_reference", length = 100)
    private String clientReference;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "caution_montant", precision = 10, scale = 2)
    private BigDecimal cautionMontant = BigDecimal.ZERO;

    @NotNull(message = "Tab status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BarTabStatus statut = BarTabStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "serveur_id")
    private User serveur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_originale_id")
    private TableEntity tableOriginale;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    @Column(name = "total", precision = 10, scale = 2, nullable = false)
    private BigDecimal total = BigDecimal.ZERO;

    @OneToMany(mappedBy = "barTab", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Commande> commandes = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.openedAt == null) {
            this.openedAt = now;
        }
        if (this.total == null) {
            this.total = BigDecimal.ZERO;
        }
        if (this.cautionMontant == null) {
            this.cautionMontant = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
