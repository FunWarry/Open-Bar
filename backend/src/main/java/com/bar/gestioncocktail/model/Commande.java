package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "commandes")
public class Commande {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "table_id", nullable = true)
    private TableEntity table;

    @ManyToOne
    @JoinColumn(name = "serveur_id", nullable = true)
    private User serveur;

    @Column(name = "tracking_token", unique = true)
    private String trackingToken;

    @OneToMany(mappedBy = "commande", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<CommandeItem> items = new ArrayList<>();

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommandeStatut statut;

    private String notes;
    private BigDecimal total = BigDecimal.ZERO;
    private BigDecimal pourboire;
    private LocalDateTime dateCommande;
    private LocalDateTime datePreparation;
    private LocalDateTime dateLivraison;
    private LocalDateTime dateReglement;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        if (dateCommande == null) {
            dateCommande = LocalDateTime.now(java.time.ZoneId.systemDefault());
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }
} 