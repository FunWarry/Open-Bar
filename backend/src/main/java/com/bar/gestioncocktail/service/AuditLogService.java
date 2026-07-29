package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.AuditLog;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service métier pour la consignation et la recherche des traces d'audit (Audit Logs).
 */
@Service
@Transactional
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;
    private final TimeService timeService;

    /**
     * Constructeur avec injection du repository d'audit et du timeService.
     *
     * @param auditLogRepository Repository JPA des entrées d'audit
     * @param timeService Service de gestion du temps
     */
    public AuditLogService(AuditLogRepository auditLogRepository, TimeService timeService) {
        this.auditLogRepository = auditLogRepository;
        this.timeService = timeService;
    }

    /**
     * Crée et persiste une nouvelle entrée de journal d'audit.
     *
     * @param auditLog Entrée d'audit à persister
     * @return L'entrée d'audit enregistrée
     */
    public AuditLog createAuditLog(AuditLog auditLog) {
        auditLog.setTimestamp(timeService.now());
        return auditLogRepository.save(auditLog);
    }


    /**
     * Recherche les logs d'audit générés par un utilisateur donné.
     *
     * @param user L'utilisateur cible
     * @return Liste des entrées d'audit correspondantes
     */
    public List<AuditLog> getAuditLogsByUser(User user) {
        return auditLogRepository.findByUser(user);
    }

    /**
     * Recherche les logs d'audit par type d'action.
     *
     * @param action Libellé de l'action
     * @return Liste des entrées d'audit
     */
    public List<AuditLog> getAuditLogsByAction(String action) {
        return auditLogRepository.findByAction(action);
    }

    /**
     * Recherche les logs d'audit par type d'entité.
     *
     * @param entityType Type de l'entité
     * @return Liste des entrées d'audit
     */
    public List<AuditLog> getAuditLogsByEntityType(String entityType) {
        return auditLogRepository.findByEntityType(entityType);
    }

    /**
     * Recherche les logs d'audit par identifiant d'entité.
     *
     * @param entityId ID de l'entité
     * @return Liste des entrées d'audit
     */
    public List<AuditLog> getAuditLogsByEntityId(Long entityId) {
        return auditLogRepository.findByEntityId(entityId);
    }

    /**
     * Recherche les logs d'audit sur un intervalle temporel.
     *
     * @param debut Horodatage de début
     * @param fin Horodatage de fin
     * @return Liste des entrées d'audit
     */
    public List<AuditLog> getAuditLogsByDate(LocalDateTime debut, LocalDateTime fin) {
        return auditLogRepository.findByTimestampBetween(debut, fin);
    }

    /**
     * Recherche les logs d'audit d'un utilisateur sur un intervalle temporel.
     *
     * @param user L'utilisateur concerné
     * @param debut Horodatage de début
     * @param fin Horodatage de fin
     * @return Liste des entrées d'audit
     */
    public List<AuditLog> getAuditLogsByUserAndDate(User user, LocalDateTime debut, LocalDateTime fin) {
        return auditLogRepository.findByUserAndTimestampBetween(user, debut, fin);
    }

    /**
     * Méthode utilitaire pour consigner rapidement une action d'audit.
     *
     * @param user Utilisateur à l'origine de l'action
     * @param action Nom de l'action (ex: 'CREATE_COMMANDE')
     * @param entityType Type d'entité (ex: 'Commande')
     * @param entityId Identifiant de l'entité
     * @param details Précisions textuelles sur l'opération
     * @param ipAddress Adresse IP du client
     */
    public void logAction(User user, String action, String entityType, Long entityId, String details, String ipAddress) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUser(user);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setDetails(details);
        auditLog.setIpAddress(ipAddress);
        auditLog.setTimestamp(timeService.now());
        auditLogRepository.save(auditLog);
    }
}