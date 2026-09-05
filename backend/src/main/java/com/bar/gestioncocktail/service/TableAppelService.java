package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.TableAppelRequestDTO;
import com.bar.gestioncocktail.dto.TableAppelResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.TableAppel;
import com.bar.gestioncocktail.model.TableAppelStatut;
import com.bar.gestioncocktail.model.TableAppelType;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.TableAppelRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service managing table call alerts (waiter assistance, bill request) triggered by patrons
 * and acknowledged by service staff.
 */
@Service
@Transactional
public class TableAppelService {

    private static final String TABLE_NOT_FOUND_MSG = "Table not found with id: ";
    private static final String APPEL_NOT_FOUND_MSG = "Table alert not found with id: ";
    private static final int COOLDOWN_SECONDS = 30;

    private final TableAppelRepository tableAppelRepository;
    private final TableRepository tableRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final TimeService timeService;
    private final AuditLogService auditLogService;

    /**
     * Constructs TableAppelService with all required dependencies.
     *
     * @param tableAppelRepository Repository for table alert entities
     * @param tableRepository Repository for table entities
     * @param notificationService Service for broadcasting STOMP WebSocket messages
     * @param messagingTemplate SimpMessagingTemplate for dynamic topic routing
     * @param timeService Application time service
     * @param auditLogService Audit log service
     */
    public TableAppelService(TableAppelRepository tableAppelRepository,
                             TableRepository tableRepository,
                             NotificationService notificationService,
                             SimpMessagingTemplate messagingTemplate,
                             TimeService timeService,
                             AuditLogService auditLogService) {
        this.tableAppelRepository = tableAppelRepository;
        this.tableRepository = tableRepository;
        this.notificationService = notificationService;
        this.messagingTemplate = messagingTemplate;
        this.timeService = timeService;
        this.auditLogService = auditLogService;
    }

    /**
     * Creates a new alert for a table (waiter call or check request).
     *
     * @param tableId Table identifier
     * @param requestDTO Alert request data (type, comment)
     * @return Formatted response DTO
     * @throws ResourceNotFoundException if table does not exist
     * @throws BusinessException if an identical pending call already exists or rate limit is violated
     */
    @Transactional
    public TableAppelResponseDTO creerAppel(Long tableId, TableAppelRequestDTO requestDTO) {
        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + tableId));

        TableAppelType type = requestDTO != null && requestDTO.type() != null
                ? requestDTO.type()
                : TableAppelType.ASSISTANCE;

        // Check if an identical alert is already pending for this table
        boolean alreadyPending = tableAppelRepository.existsByTableIdAndTypeAndStatut(
                tableId, type, TableAppelStatut.EN_ATTENTE);
        if (alreadyPending) {
            TableAppel existing = tableAppelRepository
                    .findTopByTableIdAndStatutOrderByCreatedAtDesc(tableId, TableAppelStatut.EN_ATTENTE)
                    .orElse(null);
            if (existing != null && existing.getType() == type) {
                return TableAppelResponseDTO.from(existing);
            }
        }

        // Rate-limiting: prevent spamming multiple requests within cooldown period
        LocalDateTime cooldownThreshold = LocalDateTime.now(timeService.getZoneId()).minusSeconds(COOLDOWN_SECONDS);
        List<TableAppel> recentAppels = tableAppelRepository.findRecentAppelsForTable(tableId, cooldownThreshold);
        if (!recentAppels.isEmpty() && recentAppels.stream().anyMatch(a -> a.getType() == type)) {
            throw new BusinessException("Please wait before requesting assistance again.");
        }

        TableAppel appel = new TableAppel();
        appel.setTable(table);
        appel.setType(type);
        appel.setStatut(TableAppelStatut.EN_ATTENTE);
        appel.setCommentaire(requestDTO != null ? requestDTO.commentaire() : null);
        appel.setCreatedAt(LocalDateTime.now(timeService.getZoneId()));
        appel.setUpdatedAt(LocalDateTime.now(timeService.getZoneId()));

        TableAppel saved = tableAppelRepository.save(appel);
        TableAppelResponseDTO response = TableAppelResponseDTO.from(saved);

        // Broadcast notifications over STOMP WebSocket topics
        broadcastAppelEvent(saved, response, true);

        if (auditLogService != null) {
            auditLogService.logAction(null, "APPEL_TABLE", "TableAppel", saved.getId(),
                    "Table #" + table.getNumero() + " requested " + type, null);
        }

        return response;
    }

    /**
     * Acknowledges / dismisses a specific table alert by staff.
     *
     * @param tableId Table identifier
     * @param appelId Alert identifier
     * @param staffUsername Staff member name or identifier
     * @return Updated response DTO
     * @throws ResourceNotFoundException if alert does not exist
     */
    @Transactional
    public TableAppelResponseDTO acquitterAppel(Long tableId, Long appelId, String staffUsername) {
        TableAppel appel = tableAppelRepository.findById(appelId)
                .orElseThrow(() -> new ResourceNotFoundException(APPEL_NOT_FOUND_MSG + appelId));

        if (tableId != null && appel.getTable() != null && !tableId.equals(appel.getTable().getId())) {
            throw new BusinessException("Alert #" + appelId + " does not belong to table #" + tableId);
        }

        if (appel.getStatut() == TableAppelStatut.ACQUITTE) {
            return TableAppelResponseDTO.from(appel);
        }

        appel.setStatut(TableAppelStatut.ACQUITTE);
        appel.setAcquittePar(staffUsername != null && !staffUsername.isBlank() ? staffUsername : "Staff");
        appel.setAcquitteAt(LocalDateTime.now(timeService.getZoneId()));
        appel.setUpdatedAt(LocalDateTime.now(timeService.getZoneId()));

        TableAppel saved = tableAppelRepository.save(appel);
        TableAppelResponseDTO response = TableAppelResponseDTO.from(saved);

        broadcastAppelEvent(saved, response, false);

        if (auditLogService != null) {
            auditLogService.logAction(null, "ACQUITTER_APPEL", "TableAppel", saved.getId(),
                    "Alert #" + saved.getId() + " on Table #" + (saved.getTable() != null ? saved.getTable().getNumero() : "?") + " acknowledged by " + appel.getAcquittePar(), null);
        }

        return response;
    }

    /**
     * Acknowledges all active pending alerts for a table in one operation.
     *
     * @param tableId Table identifier
     * @param staffUsername Staff member name or identifier
     * @return List of acknowledged alerts
     */
    @Transactional
    public List<TableAppelResponseDTO> acquitterTousAppelsTable(Long tableId, String staffUsername) {
        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + tableId));

        List<TableAppel> activeAppels = tableAppelRepository.findByTableAndStatut(table, TableAppelStatut.EN_ATTENTE);
        LocalDateTime now = LocalDateTime.now(timeService.getZoneId());
        String acknowledger = staffUsername != null && !staffUsername.isBlank() ? staffUsername : "Staff";

        for (TableAppel appel : activeAppels) {
            appel.setStatut(TableAppelStatut.ACQUITTE);
            appel.setAcquittePar(acknowledger);
            appel.setAcquitteAt(now);
            appel.setUpdatedAt(now);
            tableAppelRepository.save(appel);

            TableAppelResponseDTO response = TableAppelResponseDTO.from(appel);
            broadcastAppelEvent(appel, response, false);
        }

        return activeAppels.stream().map(TableAppelResponseDTO::from).toList();
    }

    /**
     * Retrieves all active table alerts currently awaiting staff attendance across the establishment.
     *
     * @return List of active alert response DTOs
     */
    @Transactional(readOnly = true)
    public List<TableAppelResponseDTO> getActiveAppels() {
        return tableAppelRepository.findByStatutOrderByCreatedAtDesc(TableAppelStatut.EN_ATTENTE)
                .stream()
                .map(TableAppelResponseDTO::from)
                .toList();
    }

    /**
     * Retrieves active alerts for a specific table.
     *
     * @param tableId Table identifier
     * @return List of active alert response DTOs for the table
     */
    @Transactional(readOnly = true)
    public List<TableAppelResponseDTO> getActiveAppelsPourTable(Long tableId) {
        return tableAppelRepository.findByTableIdAndStatut(tableId, TableAppelStatut.EN_ATTENTE)
                .stream()
                .map(TableAppelResponseDTO::from)
                .toList();
    }

    private void broadcastAppelEvent(TableAppel appel, TableAppelResponseDTO response, boolean isNew) {
        try {
            if (isNew) {
                notificationService.notifierNouvelAppel(response);
            } else {
                notificationService.notifierAppelAcquitte(response);
            }

            if (messagingTemplate != null && appel.getTable() != null && appel.getTable().getId() != null) {
                Long tableId = appel.getTable().getId();
                messagingTemplate.convertAndSend("/topic/tables/" + tableId, response);
                messagingTemplate.convertAndSend("/topic/tables/" + tableId + "/appels", response);
            }
        } catch (Exception _) {
            // Graceful handling of WebSocket broadcast
        }
    }
}
