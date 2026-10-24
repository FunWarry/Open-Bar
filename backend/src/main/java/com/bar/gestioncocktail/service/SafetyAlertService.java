package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.SafetyAlertRequestDTO;
import com.bar.gestioncocktail.dto.SafetyAlertResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EstablishmentConfig;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.SafetyAlert;
import com.bar.gestioncocktail.model.SafetyAlertStatus;
import com.bar.gestioncocktail.model.SafetyAlertType;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.SafetyAlertRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Service managing the lifecycle of patron Angel Shot safety alerts.
 * <p>
 * Handles silent emergency alert creation, rate limiting, staff dispatching
 * over WebSocket topics, and resolution auditing.
 */
@Service
public class SafetyAlertService {

    private static final Logger log = LoggerFactory.getLogger(SafetyAlertService.class);
    private static final int RATE_LIMIT_COOLDOWN_SECONDS = 30;

    private final SafetyAlertRepository safetyAlertRepository;
    private final TableRepository tableRepository;
    private final EstablishmentConfigService establishmentConfigService;
    private final NotificationService notificationService;

    /**
     * Constructs SafetyAlertService with all required dependencies.
     *
     * @param safetyAlertRepository      Repository for safety alert persistence
     * @param tableRepository            Repository for table entity lookup
     * @param establishmentConfigService Service for checking module capabilities
     * @param notificationService        Service for broadcasting WebSocket notifications
     */
    public SafetyAlertService(
            SafetyAlertRepository safetyAlertRepository,
            TableRepository tableRepository,
            EstablishmentConfigService establishmentConfigService,
            NotificationService notificationService
    ) {
        this.safetyAlertRepository = safetyAlertRepository;
        this.tableRepository = tableRepository;
        this.establishmentConfigService = establishmentConfigService;
        this.notificationService = notificationService;
    }

    /**
     * Retrieves all currently active and unacknowledged safety alerts across the establishment.
     *
     * @return List of active safety alert response DTOs
     */
    @Transactional(readOnly = true)
    public List<SafetyAlertResponseDTO> getActiveAlerts() {
        return safetyAlertRepository.findByStatusOrderByCreatedAtDesc(SafetyAlertStatus.ACTIVE)
                .stream()
                .map(SafetyAlertResponseDTO::from)
                .toList();
    }

    /**
     * Retrieves active safety alerts for a specific table.
     *
     * @param tableId Table primary key
     * @return List of active alerts for the table
     */
    @Transactional(readOnly = true)
    public List<SafetyAlertResponseDTO> getActiveAlertsForTable(Long tableId) {
        return safetyAlertRepository.findByTableIdAndStatus(tableId, SafetyAlertStatus.ACTIVE)
                .stream()
                .map(SafetyAlertResponseDTO::from)
                .toList();
    }

    /**
     * Creates and broadcasts a silent patron safety alert from a table QR code.
     *
     * @param tableId    Originating table identifier
     * @param requestDTO Alert parameters (type, optional comment)
     * @return Created or existing active safety alert response DTO
     */
    @Transactional
    public SafetyAlertResponseDTO createAlert(Long tableId, SafetyAlertRequestDTO requestDTO) {
        EstablishmentConfig config = establishmentConfigService.getConfig();
        if (config != null && !config.isModuleEnabled(EstablishmentModule.ANGEL_SHOT_SAFETY)) {
            throw new BusinessException("Angel Shot safety protocol is currently disabled for this establishment");
        }

        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Table not found with id " + tableId));

        LocalDateTime cooldownSince = LocalDateTime.now(ZoneId.systemDefault()).minusSeconds(RATE_LIMIT_COOLDOWN_SECONDS);
        List<SafetyAlert> recentAlerts = safetyAlertRepository.findRecentAlertsForTable(tableId, cooldownSince);
        if (!recentAlerts.isEmpty()) {
            SafetyAlert latest = recentAlerts.get(0);
            if (latest.getStatus() == SafetyAlertStatus.ACTIVE) {
                log.info("Active safety alert already open for table #{}, returning existing alert #{}", table.getNumero(), latest.getId());
                return SafetyAlertResponseDTO.from(latest);
            }
        }

        SafetyAlert alert = new SafetyAlert();
        alert.setTable(table);
        alert.setType(requestDTO != null && requestDTO.type() != null ? requestDTO.type() : SafetyAlertType.ANGEL_SHOT_NEAT);
        alert.setStatus(SafetyAlertStatus.ACTIVE);
        alert.setComment(requestDTO != null ? requestDTO.comment() : null);

        SafetyAlert saved = safetyAlertRepository.save(alert);
        log.warn("EMERGENCY SAFETY ALERT CREATED: Table #{}, Code: {}", table.getNumero(), saved.getType());

        SafetyAlertResponseDTO responseDTO = SafetyAlertResponseDTO.from(saved);
        if (notificationService != null) {
            notificationService.notifierNouvelleAlerteSecurite(responseDTO);
        }

        return responseDTO;
    }

    /**
     * Acknowledges and resolves an active safety alert.
     *
     * @param alertId    Alert identifier
     * @param resolvedBy Staff username or identifier resolving the situation
     * @return Resolved safety alert response DTO
     */
    @Transactional
    public SafetyAlertResponseDTO resolveAlert(Long alertId, String resolvedBy) {
        SafetyAlert alert = safetyAlertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Safety alert not found with id " + alertId));

        alert.setStatus(SafetyAlertStatus.RESOLVED);
        alert.setResolvedBy(resolvedBy != null && !resolvedBy.isBlank() ? resolvedBy : "Staff");
        alert.setResolvedAt(LocalDateTime.now(ZoneId.systemDefault()));

        SafetyAlert saved = safetyAlertRepository.save(alert);
        log.info("Safety alert #{} resolved by {}", alertId, alert.getResolvedBy());

        SafetyAlertResponseDTO responseDTO = SafetyAlertResponseDTO.from(saved);
        if (notificationService != null) {
            notificationService.notifierAlerteSecuriteResolue(responseDTO);
        }

        return responseDTO;
    }
}
