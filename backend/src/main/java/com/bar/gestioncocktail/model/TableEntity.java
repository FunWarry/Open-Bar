package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "tables")
public class TableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Le numéro de table est obligatoire")
    @Min(value = 1, message = "Le numéro de table doit être supérieur ou égal à 1")
    @Column(nullable = false)
    private Integer numero;

    @NotNull(message = "La capacité est obligatoire")
    @Min(value = 1, message = "La capacité doit être d'au moins 1 personne")
    @Column(nullable = false)
    private Integer capacite;

    @NotNull(message = "La zone est obligatoire")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TableZone zone;

    @Column(nullable = false)
    private boolean occupee = false;

    @Column(name = "serveur_id")
    private Long serveurId;

    @Column(name = "date_occupation")
    private LocalDateTime dateOccupation;

    @Column(name = "date_liberation")
    private LocalDateTime dateLiberation;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getNumero() {
        return numero;
    }

    public void setNumero(Integer numero) {
        this.numero = numero;
    }

    public Integer getCapacite() {
        return capacite;
    }

    public void setCapacite(Integer capacite) {
        this.capacite = capacite;
    }

    public TableZone getZone() {
        return zone;
    }

    public void setZone(TableZone zone) {
        this.zone = zone;
    }

    public boolean isOccupee() {
        return occupee;
    }

    public void setOccupee(boolean occupee) {
        this.occupee = occupee;
    }

    public Long getServeurId() {
        return serveurId;
    }

    public void setServeurId(Long serveurId) {
        this.serveurId = serveurId;
    }

    public LocalDateTime getDateOccupation() {
        return dateOccupation;
    }

    public void setDateOccupation(LocalDateTime dateOccupation) {
        this.dateOccupation = dateOccupation;
    }

    public LocalDateTime getDateLiberation() {
        return dateLiberation;
    }

    public void setDateLiberation(LocalDateTime dateLiberation) {
        this.dateLiberation = dateLiberation;
    }
} 