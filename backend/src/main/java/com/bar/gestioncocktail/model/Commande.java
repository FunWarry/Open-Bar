package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.Valid;
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

    @NotNull(message = "La table est obligatoire")
    @ManyToOne
    @JoinColumn(name = "table_id", nullable = false)
    private TableEntity table;

    @NotNull(message = "Le serveur est obligatoire")
    @ManyToOne
    @JoinColumn(name = "serveur_id", nullable = false)
    private User serveur;

    @Valid
    @OneToMany(mappedBy = "commande", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CommandeItem> items = new ArrayList<>();

    @NotNull(message = "Le statut est obligatoire")
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
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        dateCommande = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
} 