package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * JPA Entity representing a patron request (assistance or bill request) issued from a table QR code.
 */
@Data
@Entity
@Table(name = "table_appels")
public class TableAppel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Table reference is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "table_id", nullable = false)
    private TableEntity table;

    @NotNull(message = "Call type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private TableAppelType type = TableAppelType.ASSISTANCE;

    @NotNull(message = "Call status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    private TableAppelStatut statut = TableAppelStatut.EN_ATTENTE;

    @Column(name = "commentaire", length = 255)
    private String commentaire;

    @Column(name = "acquitte_par", length = 100)
    private String acquittePar;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "acquitte_at")
    private LocalDateTime acquitteAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        this.updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        if (this.statut == null) {
            this.statut = TableAppelStatut.EN_ATTENTE;
        }
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

    public TableEntity getTable() {
        return table;
    }

    public void setTable(TableEntity table) {
        this.table = table;
    }

    public TableAppelType getType() {
        return type;
    }

    public void setType(TableAppelType type) {
        this.type = type;
    }

    public TableAppelStatut getStatut() {
        return statut;
    }

    public void setStatut(TableAppelStatut statut) {
        this.statut = statut;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public String getAcquittePar() {
        return acquittePar;
    }

    public void setAcquittePar(String acquittePar) {
        this.acquittePar = acquittePar;
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

    public LocalDateTime getAcquitteAt() {
        return acquitteAt;
    }

    public void setAcquitteAt(LocalDateTime acquitteAt) {
        this.acquitteAt = acquitteAt;
    }
}
