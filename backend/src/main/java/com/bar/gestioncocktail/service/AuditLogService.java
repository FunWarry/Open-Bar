package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.AuditLog;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;

    @Autowired
    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public AuditLog createAuditLog(AuditLog auditLog) {
        auditLog.setTimestamp(LocalDateTime.now());
        return auditLogRepository.save(auditLog);
    }

    public List<AuditLog> getAuditLogsByUser(User user) {
        return auditLogRepository.findByUser(user);
    }

    public List<AuditLog> getAuditLogsByAction(String action) {
        return auditLogRepository.findByAction(action);
    }

    public List<AuditLog> getAuditLogsByEntityType(String entityType) {
        return auditLogRepository.findByEntityType(entityType);
    }

    public List<AuditLog> getAuditLogsByEntityId(Long entityId) {
        return auditLogRepository.findByEntityId(entityId);
    }

    public List<AuditLog> getAuditLogsByDate(LocalDateTime debut, LocalDateTime fin) {
        return auditLogRepository.findByTimestampBetween(debut, fin);
    }

    public List<AuditLog> getAuditLogsByUserAndDate(User user, LocalDateTime debut, LocalDateTime fin) {
        return auditLogRepository.findByUserAndTimestampBetween(user, debut, fin);
    }

    public void logAction(User user, String action, String entityType, Long entityId, String details, String ipAddress) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUser(user);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setDetails(details);
        auditLog.setIpAddress(ipAddress);
        auditLog.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(auditLog);
    }
} 