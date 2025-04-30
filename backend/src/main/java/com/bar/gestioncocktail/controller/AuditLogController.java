package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.AuditLog;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/audit-logs")
@CrossOrigin(origins = "*")
public class AuditLogController {
    private final AuditLogService auditLogService;

    @Autowired
    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @PostMapping
    public ResponseEntity<AuditLog> createAuditLog(@RequestBody AuditLog auditLog) {
        return ResponseEntity.ok(auditLogService.createAuditLog(auditLog));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLog>> getAuditLogsByUser(@PathVariable Long userId) {
        User user = new User();
        user.setId(userId);
        return ResponseEntity.ok(auditLogService.getAuditLogsByUser(user));
    }

    @GetMapping("/action/{action}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLog>> getAuditLogsByAction(@PathVariable String action) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByAction(action));
    }

    @GetMapping("/entity-type/{entityType}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLog>> getAuditLogsByEntityType(@PathVariable String entityType) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByEntityType(entityType));
    }

    @GetMapping("/entity-id/{entityId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLog>> getAuditLogsByEntityId(@PathVariable Long entityId) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByEntityId(entityId));
    }

    @GetMapping("/date")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLog>> getAuditLogsByDate(
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByDate(debut, fin));
    }

    @GetMapping("/user/{userId}/date")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLog>> getAuditLogsByUserAndDate(
        @PathVariable Long userId,
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        User user = new User();
        user.setId(userId);
        return ResponseEntity.ok(auditLogService.getAuditLogsByUserAndDate(user, debut, fin));
    }

    @PostMapping("/log")
    public ResponseEntity<Void> logAction(
        @RequestParam Long userId,
        @RequestParam String action,
        @RequestParam String entityType,
        @RequestParam Long entityId,
        @RequestParam String details,
        @RequestParam String ipAddress) {
        User user = new User();
        user.setId(userId);
        auditLogService.logAction(user, action, entityType, entityId, details, ipAddress);
        return ResponseEntity.ok().build();
    }
} 