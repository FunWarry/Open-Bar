package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Entity representing a physical or logical area in the bar (e.g. Terrasse, Salle, Bar, VIP),
 * optionally categorized by floor level (RDC, ETAGE_1, ETAGE_2, EXTERIEUR).
 */
@Data
@Entity
@Table(name = "zones")
public class ZoneEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le nom de la zone est obligatoire")
    @Size(max = 50, message = "Le nom ne peut pas dépasser 50 caractères")
    @Column(nullable = false, unique = true, length = 50)
    private String nom;

    @Column(length = 50)
    private String etage = "RDC";

    @Column(name = "plan_x")
    private Double planX;

    @Column(name = "plan_y")
    private Double planY;

    @Column(name = "plan_width")
    private Double planWidth;

    @Column(name = "plan_height")
    private Double planHeight;

    @Column(name = "shape_type", length = 20)
    private String shapeType;

    @Column(name = "points_json", columnDefinition = "TEXT")
    private String pointsJson;

    @Column(name = "corner_radii_json", length = 100)
    private String cornerRadiiJson;

    @Column(length = 30)
    private String couleur;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
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

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getEtage() {
        return etage;
    }

    public void setEtage(String etage) {
        this.etage = etage;
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

    public String getShapeType() {
        return shapeType;
    }

    public void setShapeType(String shapeType) {
        this.shapeType = shapeType;
    }

    public String getPointsJson() {
        return pointsJson;
    }

    public void setPointsJson(String pointsJson) {
        this.pointsJson = pointsJson;
    }

    public String getCornerRadiiJson() {
        return cornerRadiiJson;
    }

    public void setCornerRadiiJson(String cornerRadiiJson) {
        this.cornerRadiiJson = cornerRadiiJson;
    }

    public String getCouleur() {
        return couleur;
    }

    public void setCouleur(String couleur) {
        this.couleur = couleur;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
