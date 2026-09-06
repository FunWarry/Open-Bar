package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * JPA Entity representing an ephemeral table session token used for anti-fraud QR code validation.
 * <p>
 * Ensures that orders placed via digital table ordering are authorized and linked to an active on-premise
 * dining session, invalidating stale links or photos taken outside the establishment.
 */
@Data
@Entity
@Table(name = "table_sessions", indexes = {
        @Index(name = "idx_table_sessions_token", columnList = "session_token"),
        @Index(name = "idx_table_sessions_table_status", columnList = "table_id, status")
})
/**
 * JPA entity representing an ephemeral table session for patron QR code ordering.
 */
public class TableSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Table ID is required")
    @Column(name = "table_id", nullable = false)
    private Long tableId;

    @NotBlank(message = "Session token is required")
    @Size(max = 64, message = "Session token cannot exceed 64 characters")
    @Column(name = "session_token", nullable = false, unique = true, length = 64)
    private String sessionToken;

    @NotNull(message = "Session status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TableSessionStatus status = TableSessionStatus.ACTIVE;

    @NotNull(message = "Opened timestamp is required")
    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @NotNull(message = "Last activity timestamp is required")
    @Column(name = "last_activity_at", nullable = false)
    private LocalDateTime lastActivityAt;

    @NotNull(message = "Expiration timestamp is required")
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

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
        if (this.openedAt == null) {
            this.openedAt = now;
        }
        if (this.lastActivityAt == null) {
            this.lastActivityAt = now;
        }
        if (this.status == null) {
            this.status = TableSessionStatus.ACTIVE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
