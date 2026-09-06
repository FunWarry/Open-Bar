package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
/**
 * JPA entity representing an audit log entry tracking administrative, security, and fiscal operations.
 */

@Data
@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String entityType;

    private Long entityId;
    private String details;
    private String ipAddress;
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
} 