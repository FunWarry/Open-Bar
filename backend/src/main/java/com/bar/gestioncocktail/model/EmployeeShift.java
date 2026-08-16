package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity representing an employee work shift.
 */
@Entity
@Table(name = "employee_shifts")
public class EmployeeShift {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "date_shift", nullable = false)
    private LocalDate dateShift;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_shift", nullable = false)
    private TypeShift typeShift;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_poste", nullable = false)
    private TypePoste typePoste;

    @Column(name = "heure_debut", nullable = false)
    private String heureDebut;

    @Column(name = "heure_fin", nullable = false)
    private String heureFin;

    @Column(name = "heure_pause_debut")
    private String heurePauseDebut;

    @Column(name = "duree_pause_minutes")
    private Integer dureePauseMinutes = 30;

    @Column(name = "heure_debut_reelle")
    private String heureDebutReelle;

    @Column(name = "heure_fin_reelle")
    private String heureFinReelle;

    @Column(name = "heures_sup")
    private BigDecimal heuresSup;

    @Column(name = "heures_prevues")
    private BigDecimal heuresPrevues;

    @Column(name = "heures_effectuees")
    private BigDecimal heuresEffectuees;

    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

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

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDate getDateShift() {
        return dateShift;
    }

    public void setDateShift(LocalDate dateShift) {
        this.dateShift = dateShift;
    }

    public TypeShift getTypeShift() {
        return typeShift;
    }

    public void setTypeShift(TypeShift typeShift) {
        this.typeShift = typeShift;
    }

    public TypePoste getTypePoste() {
        return typePoste;
    }

    public void setTypePoste(TypePoste typePoste) {
        this.typePoste = typePoste;
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

    public String getHeurePauseDebut() {
        return heurePauseDebut;
    }

    public void setHeurePauseDebut(String heurePauseDebut) {
        this.heurePauseDebut = heurePauseDebut;
    }

    public Integer getDureePauseMinutes() {
        return dureePauseMinutes;
    }

    public void setDureePauseMinutes(Integer dureePauseMinutes) {
        this.dureePauseMinutes = dureePauseMinutes;
    }

    public String getHeureDebutReelle() {
        return heureDebutReelle;
    }

    public void setHeureDebutReelle(String heureDebutReelle) {
        this.heureDebutReelle = heureDebutReelle;
    }

    public String getHeureFinReelle() {
        return heureFinReelle;
    }

    public void setHeureFinReelle(String heureFinReelle) {
        this.heureFinReelle = heureFinReelle;
    }

    public BigDecimal getHeuresSup() {
        return heuresSup;
    }

    public void setHeuresSup(BigDecimal heuresSup) {
        this.heuresSup = heuresSup;
    }

    public BigDecimal getHeuresPrevues() {
        return heuresPrevues;
    }

    public void setHeuresPrevues(BigDecimal heuresPrevues) {
        this.heuresPrevues = heuresPrevues;
    }

    public BigDecimal getHeuresEffectuees() {
        return heuresEffectuees;
    }

    public void setHeuresEffectuees(BigDecimal heuresEffectuees) {
        this.heuresEffectuees = heuresEffectuees;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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
