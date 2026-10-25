package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;

/**
 * JPA Entity representing a silent Angel Shot emergency assistance request
 * triggered by a patron at a specific table.
 */
@Entity
@Table(name = "safety_alerts")
public class SafetyAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Table reference is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "table_id", nullable = false)
    private TableEntity table;

    @NotNull(message = "Alert type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private SafetyAlertType type = SafetyAlertType.ANGEL_SHOT_NEAT;

    @NotNull(message = "Alert status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private SafetyAlertStatus status = SafetyAlertStatus.ACTIVE;

    @Column(name = "comment", length = 255)
    private String comment;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    /**
     * Default no-arg constructor required by JPA.
     */
    public SafetyAlert() {
        // Default constructor
    }

    /**
     * Convenience constructor initializing an active safety alert.
     *
     * @param table Target table entity
     * @param type Angel shot variant code
     * @param comment Optional confidential comment
     */
    public SafetyAlert(TableEntity table, SafetyAlertType type, String comment) {
        this.table = table;
        this.type = type;
        this.comment = comment;
        this.status = SafetyAlertStatus.ACTIVE;
        this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
        }
        if (this.status == null) {
            this.status = SafetyAlertStatus.ACTIVE;
        }
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

    public SafetyAlertType getType() {
        return type;
    }

    public void setType(SafetyAlertType type) {
        this.type = type;
    }

    public SafetyAlertStatus getStatus() {
        return status;
    }

    public void setStatus(SafetyAlertStatus status) {
        this.status = status;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getResolvedBy() {
        return resolvedBy;
    }

    public void setResolvedBy(String resolvedBy) {
        this.resolvedBy = resolvedBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SafetyAlert that = (SafetyAlert) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "SafetyAlert{" +
                "id=" + id +
                ", tableId=" + (table != null ? table.getId() : null) +
                ", type=" + type +
                ", status=" + status +
                ", resolvedBy='" + resolvedBy + '\'' +
                ", createdAt=" + createdAt +
                ", resolvedAt=" + resolvedAt +
                '}';
    }
}
