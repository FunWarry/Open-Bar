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
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA Entity representing an immutable audit log entry for employee shift modifications.
 * Each modification (creation, update, deletion) is permanently recorded with pre/post JSON snapshots.
 */
@Entity
@Table(name = "shift_audit_log")
public class ShiftAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shift_id", nullable = false)
    private Long shiftId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "date_shift")
    private LocalDate dateShift;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false)
    private ShiftAuditAction action;

    @Column(name = "changed_by", nullable = false)
    private String changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Column(name = "previous_snapshot", columnDefinition = "TEXT")
    private String previousSnapshot;

    @Column(name = "new_snapshot", columnDefinition = "TEXT")
    private String newSnapshot;

    /**
     * Default constructor for JPA.
     */
    public ShiftAuditLog() {
    }

    private ShiftAuditLog(Builder builder) {
        this.shiftId = builder.shiftId;
        this.user = builder.user;
        this.dateShift = builder.dateShift;
        this.action = builder.action;
        this.changedBy = builder.changedBy;
        this.changedAt = builder.changedAt;
        this.previousSnapshot = builder.previousSnapshot;
        this.newSnapshot = builder.newSnapshot;
    }

    public static Builder builder() {
        return new Builder();
    }

    public Long getId() {
        return id;
    }

    public Long getShiftId() {
        return shiftId;
    }

    public User getUser() {
        return user;
    }

    public LocalDate getDateShift() {
        return dateShift;
    }

    public ShiftAuditAction getAction() {
        return action;
    }

    public String getChangedBy() {
        return changedBy;
    }

    public LocalDateTime getChangedAt() {
        return changedAt;
    }

    public String getPreviousSnapshot() {
        return previousSnapshot;
    }

    public String getNewSnapshot() {
        return newSnapshot;
    }

    /**
     * Builder for {@link ShiftAuditLog}.
     */
    public static final class Builder {
        private Long shiftId;
        private User user;
        private LocalDate dateShift;
        private ShiftAuditAction action;
        private String changedBy;
        private LocalDateTime changedAt;
        private String previousSnapshot;
        private String newSnapshot;

        private Builder() {
        }

        public Builder shiftId(Long shiftId) {
            this.shiftId = shiftId;
            return this;
        }

        public Builder user(User user) {
            this.user = user;
            return this;
        }

        public Builder dateShift(LocalDate dateShift) {
            this.dateShift = dateShift;
            return this;
        }

        public Builder action(ShiftAuditAction action) {
            this.action = action;
            return this;
        }

        public Builder changedBy(String changedBy) {
            this.changedBy = changedBy;
            return this;
        }

        public Builder changedAt(LocalDateTime changedAt) {
            this.changedAt = changedAt;
            return this;
        }

        public Builder previousSnapshot(String previousSnapshot) {
            this.previousSnapshot = previousSnapshot;
            return this;
        }

        public Builder newSnapshot(String newSnapshot) {
            this.newSnapshot = newSnapshot;
            return this;
        }

        public ShiftAuditLog build() {
            return new ShiftAuditLog(this);
        }
    }
}
