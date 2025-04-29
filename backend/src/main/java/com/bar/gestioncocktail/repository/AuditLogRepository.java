package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.AuditLog;
import com.bar.gestioncocktail.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByUser(User user);
    List<AuditLog> findByAction(String action);
    List<AuditLog> findByEntityType(String entityType);
    List<AuditLog> findByEntityId(Long entityId);
    List<AuditLog> findByTimestampBetween(LocalDateTime debut, LocalDateTime fin);
    List<AuditLog> findByUserAndTimestampBetween(User user, LocalDateTime debut, LocalDateTime fin);
} 