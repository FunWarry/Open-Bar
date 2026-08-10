package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA Entity representing a configurable shift template preset for OpenBar.
 */
@Entity
@Table(name = "shift_presets")
public class ShiftPreset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_shift", nullable = false, unique = true)
    private TypeShift typeShift;

    @Column(name = "nom", nullable = false)
    private String nom;

    @Column(name = "heure_debut", nullable = false)
    private String heureDebut;

    @Column(name = "heure_fin", nullable = false)
    private String heureFin;

    @Column(name = "duree_pause_minutes")
    private Integer dureePauseMinutes = 30;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public ShiftPreset() {}

    public ShiftPreset(TypeShift typeShift, String nom, String heureDebut, String heureFin, Integer dureePauseMinutes) {
        this.typeShift = typeShift;
        this.nom = nom;
        this.heureDebut = heureDebut;
        this.heureFin = heureFin;
        this.dureePauseMinutes = dureePauseMinutes;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        this.updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TypeShift getTypeShift() {
        return typeShift;
    }

    public void setTypeShift(TypeShift typeShift) {
        this.typeShift = typeShift;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getHeureDebut() {
        return heureDebut;
    }

    public void setHeureDebut(String heureDebut) {
        this.heureDebut = heureDebut;
    }

    public String getHeureFin() {
        return heureFin;
    }

    public void setHeureFin(String heureFin) {
        this.heureFin = heureFin;
    }

    public Integer getDureePauseMinutes() {
        return dureePauseMinutes;
    }

    public void setDureePauseMinutes(Integer dureePauseMinutes) {
        this.dureePauseMinutes = dureePauseMinutes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
