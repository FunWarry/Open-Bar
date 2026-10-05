package com.bar.gestioncocktail.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * JPA entity representing an advance table reservation in the establishment.
 */
@Entity
@Table(name = "reservations")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Customer name is required")
    @Size(max = 100, message = "Customer name cannot exceed 100 characters")
    @Column(name = "nom_client", nullable = false, length = 100)
    private String nomClient;

    @Size(max = 50, message = "Phone number cannot exceed 50 characters")
    @Column(name = "telephone", length = 50)
    private String telephone;

    @Size(max = 150, message = "Email cannot exceed 150 characters")
    @Column(name = "email", length = 150)
    private String email;

    @NotNull(message = "Reservation date is required")
    @Column(name = "date_reservation", nullable = false)
    private LocalDate dateReservation;

    @NotNull(message = "Reservation time is required")
    @Column(name = "heure_reservation", nullable = false)
    private LocalTime heureReservation;

    @NotNull(message = "Duration in minutes is required")
    @Min(value = 15, message = "Duration must be at least 15 minutes")
    @Column(name = "duree_minutes", nullable = false)
    private Integer dureeMinutes = 90;

    @NotNull(message = "Number of guests is required")
    @Min(value = 1, message = "Party size must be at least 1 person")
    @Column(name = "nombre_personnes", nullable = false)
    private Integer nombrePersonnes;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @NotNull(message = "Reservation status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    private ReservationStatut statut = ReservationStatut.CONFIRMED;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "table_id")
    private TableEntity table;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Reservation() {
    }

    public Reservation(String nomClient, String telephone, String email, LocalDate dateReservation,
                       LocalTime heureReservation, Integer dureeMinutes, Integer nombrePersonnes) {
        this.nomClient = nomClient;
        this.telephone = telephone;
        this.email = email;
        this.dateReservation = dateReservation;
        this.heureReservation = heureReservation;
        this.dureeMinutes = dureeMinutes != null ? dureeMinutes : 90;
        this.nombrePersonnes = nombrePersonnes;
        this.statut = ReservationStatut.CONFIRMED;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
        if (this.dureeMinutes == null) {
            this.dureeMinutes = 90;
        }
        if (this.statut == null) {
            this.statut = ReservationStatut.CONFIRMED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNomClient() {
        return nomClient;
    }

    public void setNomClient(String nomClient) {
        this.nomClient = nomClient;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDate getDateReservation() {
        return dateReservation;
    }

    public void setDateReservation(LocalDate dateReservation) {
        this.dateReservation = dateReservation;
    }

    public LocalTime getHeureReservation() {
        return heureReservation;
    }

    public void setHeureReservation(LocalTime heureReservation) {
        this.heureReservation = heureReservation;
    }

    public Integer getDureeMinutes() {
        return dureeMinutes;
    }

    public void setDureeMinutes(Integer dureeMinutes) {
        this.dureeMinutes = dureeMinutes;
    }

    public Integer getNombrePersonnes() {
        return nombrePersonnes;
    }

    public void setNombrePersonnes(Integer nombrePersonnes) {
        this.nombrePersonnes = nombrePersonnes;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public ReservationStatut getStatut() {
        return statut;
    }

    public void setStatut(ReservationStatut statut) {
        this.statut = statut;
    }

    public TableEntity getTable() {
        return table;
    }

    public void setTable(TableEntity table) {
        this.table = table;
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
