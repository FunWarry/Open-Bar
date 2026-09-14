package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * JPA entity representing a guest's pending or approved request to join an occupied table session.
 * <p>
 * Ensures that unauthorized users outside the venue cannot tamper with a table cart without
 * explicit approval by the table owner or having scanned the owner's invite QR code.
 */
@Data
@Entity
@Table(name = "table_join_requests", indexes = {
        @Index(name = "idx_table_join_requests_table_status", columnList = "table_id, status"),
        @Index(name = "idx_table_join_requests_applicant", columnList = "table_id, applicant_session_id")
})
public class TableJoinRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Table ID is required")
    @Column(name = "table_id", nullable = false)
    private Long tableId;

    @NotBlank(message = "Applicant session ID is required")
    @Size(max = 64, message = "Applicant session ID cannot exceed 64 characters")
    @Column(name = "applicant_session_id", nullable = false, length = 64)
    private String applicantSessionId;

    @NotBlank(message = "Applicant name is required")
    @Size(max = 100, message = "Applicant name cannot exceed 100 characters")
    @Column(name = "applicant_name", nullable = false, length = 100)
    private String applicantName;

    @NotNull(message = "Join request status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TableJoinRequestStatus status = TableJoinRequestStatus.PENDING;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
