package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.AuditLogResponseDTO;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Controller REST pour la consultation et l'enregistrement des journaux d'audit (Audit Logs).
 * réservé principalement aux administrateurs pour la traçabilité des opérations.
 */
@RestController
@RequestMapping("/api/audit-logs")
@Tag(name = "Audit Logs", description = "Consultation de l'historique des actions et traçabilité des opérations")
public class AuditLogController {
    private final AuditLogService auditLogService;

    /**
     * Constructeur avec injection du service d'audit.
     *
     * @param auditLogService Service gérant la persistance des logs d'audit
     */
    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    /**
     * Retrieves all system audit logs.
     *
     * @return List of all audit logs ordered by timestamp descending
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all system audit logs (ADMIN)", description = "Retrieves complete audit logs history ordered by timestamp descending.")
    @ApiResponse(responseCode = "200", description = "Audit logs retrieved successfully")
    public ResponseEntity<List<AuditLogResponseDTO>> getAllAuditLogs() {
        return ResponseEntity.ok(auditLogService.getAllAuditLogs().stream()
            .map(AuditLogResponseDTO::from).toList());
    }

    /**
     * Récupère la liste des logs d'audit générés par un utilisateur spécifique.
     *
     * @param userId Identifiant de l'utilisateur
     * @return Liste des logs d'audit correspondants
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtenir les logs d'un utilisateur (ADMIN)", description = "Filtre les journaux d'audit pour un utilisateur donné.")
    @ApiResponse(responseCode = "200", description = "Logs d'audit récupérés")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByUser(
        @Parameter(description = "ID de l'utilisateur") @PathVariable Long userId) {
        User user = new User();
        user.setId(userId);
        return ResponseEntity.ok(auditLogService.getAuditLogsByUser(user).stream()
            .map(AuditLogResponseDTO::from).toList());
    }

    /**
     * Récupère les logs d'audit filtrés par type d'action.
     *
     * @param action Nom de l'action (ex: 'CREATE', 'UPDATE', 'DELETE')
     * @return Liste des logs d'audit correspondants
     */
    @GetMapping("/action/{action}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtenir les logs par type d'action (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Logs récupérés")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByAction(
        @Parameter(description = "Nom de l'action") @PathVariable String action) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByAction(action).stream()
            .map(AuditLogResponseDTO::from).toList());
    }

    /**
     * Récupère les logs d'audit pour une entité spécifique (ex: 'Commande', 'Cocktail').
     *
     * @param entityType Type de l'entité
     * @return Liste des logs d'audit correspondants
     */
    @GetMapping("/entity-type/{entityType}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtenir les logs par type d'entité (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Logs récupérés")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByEntityType(
        @Parameter(description = "Nom du type d'entité") @PathVariable String entityType) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByEntityType(entityType).stream()
            .map(AuditLogResponseDTO::from).toList());
    }

    /**
     * Récupère les logs d'audit pour l'identifiant d'une entité.
     *
     * @param entityId ID de l'entité
     * @return Liste des logs d'audit correspondants
     */
    @GetMapping("/entity-id/{entityId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtenir les logs par ID d'entité (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Logs récupérés")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByEntityId(
        @Parameter(description = "ID de l'entité") @PathVariable Long entityId) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByEntityId(entityId).stream()
            .map(AuditLogResponseDTO::from).toList());
    }

    /**
     * Récupère les logs d'audit sur un intervalle temporel.
     *
     * @param debut Date et heure de début
     * @param fin   Date et heure de fin
     * @return Liste des logs d'audit dans la plage horaire
     */
    @GetMapping("/date")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtenir les logs sur une période (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Logs récupérés")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByDate(
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByDate(debut, fin).stream()
            .map(AuditLogResponseDTO::from).toList());
    }

    /**
     * Récupère les logs d'audit d'un utilisateur sur une période donnée.
     *
     * @param userId ID de l'utilisateur
     * @param debut  Date de début
     * @param fin    Date de fin
     * @return Liste des logs filtrés
     */
    @GetMapping("/user/{userId}/date")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtenir les logs d'un utilisateur sur une période (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Logs récupérés")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByUserAndDate(
        @PathVariable Long userId,
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        User user = new User();
        user.setId(userId);
        return ResponseEntity.ok(auditLogService.getAuditLogsByUserAndDate(user, debut, fin).stream()
            .map(AuditLogResponseDTO::from).toList());
    }

    /**
     * Enregistre manuellement une entrée d'audit.
     *
     * @param userId     ID de l'utilisateur déclencheur
     * @param action     Intitulé de l'action
     * @param entityType Entité concernée
     * @param entityId   ID de l'entité concernée
     * @param details    Détails textuels
     * @param ipAddress  Adresse IP cliente
     * @return Statut 200 OK
     */
    @PostMapping("/log")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Enregistrer une action d'audit", description = "Permet de Consigner une action explicite dans les journaux d'audit.")
    @ApiResponse(responseCode = "200", description = "Log consigné")
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
