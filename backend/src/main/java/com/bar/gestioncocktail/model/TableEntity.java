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

    @jakarta.validation.constraints.NotBlank(message = "La zone est obligatoire")
    @jakarta.validation.constraints.Size(max = 50, message = "La zone ne peut pas dépasser 50 caractères")
    @Column(nullable = false, length = 50)
    private String zone;

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

    // Position sur le plan de salle
    @Column(name = "plan_x")
    private Double planX;

    @Column(name = "plan_y")
    private Double planY;

    @Column(name = "plan_rotation", columnDefinition = "DOUBLE PRECISION DEFAULT 0")
    private Double planRotation = 0.0;

    @Column(name = "plan_forme", length = 20)
    private String planForme = "CARRE"; // CARRE ou ROND

    @Column(name = "plan_width")
    private Double planWidth;

    @Column(name = "plan_height")
    private Double planHeight;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
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

    public String getZone() {
        return zone;
    }

    public void setZone(String zone) {
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public Double getPlanX() {
        return planX;
    }

    public void setPlanX(Double planX) {
        this.planX = planX;
    }

    public Double getPlanY() {
        return planY;
    }

    public void setPlanY(Double planY) {
        this.planY = planY;
    }

    public Double getPlanRotation() {
        return planRotation;
    }

    public void setPlanRotation(Double planRotation) {
        this.planRotation = planRotation;
    }

    public String getPlanForme() {
        return planForme;
    }

    public void setPlanForme(String planForme) {
        this.planForme = planForme;
    }

    public Double getPlanWidth() {
        return planWidth;
    }

    public void setPlanWidth(Double planWidth) {
        this.planWidth = planWidth;
    }

    public Double getPlanHeight() {
        return planHeight;
    }

    public void setPlanHeight(Double planHeight) {
        this.planHeight = planHeight;
    }
}