package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.TableSessionResponseDTO;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.TableSession;
import com.bar.gestioncocktail.model.TableSessionStatus;
import com.bar.gestioncocktail.repository.TableSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Service managing the lifecycle, validation, and anti-fraud verification of ephemeral table sessions.
 * <p>
 * Ensures table QR codes are bounded to active on-premise dining sessions and invalidates sessions
 * upon table liberation or bill settlement.
 */
@Service
public class TableSessionService {

    private static final Logger log = LoggerFactory.getLogger(TableSessionService.class);

    /** Default session expiration duration in minutes (2 hours). */
    public static final int DEFAULT_SESSION_DURATION_MINUTES = 120;

    private final TableSessionRepository tableSessionRepository;
    private final AppSettingsService appSettingsService;
    private final TimeService timeService;

    /**
     * Constructs the table session service with required dependencies.
     *
     * @param tableSessionRepository Repository managing table session persistence
     * @param appSettingsService Service retrieving global establishment settings
     * @param timeService System time provider
     */
    public TableSessionService(
            TableSessionRepository tableSessionRepository,
            AppSettingsService appSettingsService,
            TimeService timeService) {
        this.tableSessionRepository = tableSessionRepository;
        this.appSettingsService = appSettingsService;
        this.timeService = timeService;
    }

    /**
     * Retrieves an existing active session for the given table or creates a new one if none exists or if expired.
     *
     * @param tableId Identifier of the table
     * @return An active {@link TableSession}
     */
    @Transactional
    public TableSession createOrGetActiveSession(Long tableId) {
        return findOrGenerateActiveSession(tableId, timeService.now());
    }

    /**
     * Validates a session token against a given table identifier and establishment settings.
     *
     * @param tableId Table identifier
     * @param sessionToken Ephemeral token supplied by patron interface (may be null/empty)
     * @return DTO indicating whether session is authorized for ordering
     */
    @Transactional
    public TableSessionResponseDTO validateSession(Long tableId, String sessionToken) {
        boolean strictValidation = isStrictValidationEnabled();

        if (sessionToken == null || sessionToken.isBlank()) {
            if (!strictValidation) {
                TableSession activeSession = findOrGenerateActiveSession(tableId, timeService.now());
                return TableSessionResponseDTO.from(activeSession, true, "Permissive session validation active");
            }
            return new TableSessionResponseDTO(null, tableId, null, TableSessionStatus.EXPIRED,
                    null, null, null, false, "Session token is required in strict validation mode");
        }

        Optional<TableSession> optSession = tableSessionRepository.findBySessionToken(sessionToken.trim());
        if (optSession.isEmpty()) {
            return new TableSessionResponseDTO(null, tableId, sessionToken, TableSessionStatus.EXPIRED,
                    null, null, null, false, "Table session not found or invalid");
        }

        TableSession session = optSession.get();
        if (!session.getTableId().equals(tableId)) {
            return new TableSessionResponseDTO(session.getId(), tableId, sessionToken, TableSessionStatus.EXPIRED,
                    session.getOpenedAt(), session.getLastActivityAt(), session.getExpiresAt(), false,
                    "Session token belongs to a different table");
        }

        LocalDateTime now = timeService.now();
        if (session.getExpiresAt() != null && now.isAfter(session.getExpiresAt())) {
            session.setStatus(TableSessionStatus.EXPIRED);
            tableSessionRepository.save(session);
            return TableSessionResponseDTO.from(session, false, "Table session has expired");
        }

        if (session.getStatus() != TableSessionStatus.ACTIVE) {
            return TableSessionResponseDTO.from(session, false, "Table session is " + session.getStatus().name().toLowerCase());
        }

        session.setLastActivityAt(now);
        TableSession updated = tableSessionRepository.save(session);
        return TableSessionResponseDTO.from(updated, true, "Table session is active and valid");
    }

    /**
     * Refreshes or reinitializes an active session for an on-premise table.
     *
     * @param tableId Table identifier
     * @return Fresh or confirmed active session DTO
     */
    @Transactional
    public TableSessionResponseDTO refreshSession(Long tableId) {
        TableSession session = findOrGenerateActiveSession(tableId, timeService.now());
        return TableSessionResponseDTO.from(session, true, "Table session refreshed");
    }

    /**
     * Invalidates all active sessions associated with the specified table by marking them CLOSED.
     *
     * @param tableId Identifier of the table to invalidate sessions for
     */
    @Transactional
    public void invalidateSessionForTable(Long tableId) {
        doInvalidateSessionForTable(tableId);
    }

    private TableSession findOrGenerateActiveSession(Long tableId, LocalDateTime now) {
        Optional<TableSession> existingActive = tableSessionRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(tableId, TableSessionStatus.ACTIVE);

        if (existingActive.isPresent()) {
            TableSession session = existingActive.get();
            if (session.getExpiresAt() != null && now.isAfter(session.getExpiresAt())) {
                session.setStatus(TableSessionStatus.EXPIRED);
                tableSessionRepository.save(session);
                log.info("Expired active session token for table {}", tableId);
            } else {
                session.setLastActivityAt(now);
                return tableSessionRepository.save(session);
            }
        }

        TableSession newSession = new TableSession();
        newSession.setTableId(tableId);
        newSession.setSessionToken(UUID.randomUUID().toString());
        newSession.setStatus(TableSessionStatus.ACTIVE);
        newSession.setOpenedAt(now);
        newSession.setLastActivityAt(now);
        newSession.setExpiresAt(now.plusMinutes(DEFAULT_SESSION_DURATION_MINUTES));

        TableSession saved = tableSessionRepository.save(newSession);
        log.info("Created new ephemeral table session {} for table {}", saved.getSessionToken(), tableId);
        return saved;
    }

    private void doInvalidateSessionForTable(Long tableId) {
        if (tableId == null) {
            return;
        }
        tableSessionRepository.updateStatusByTableIdAndStatus(
                tableId, TableSessionStatus.ACTIVE, TableSessionStatus.CLOSED);
        log.info("Invalidated all active sessions for table {}", tableId);
    }

    /**
     * Verifies whether an incoming order placement submission contains a valid session token.
     *
     * @param tableId Table identifier
     * @param sessionToken Submitted ephemeral session token
     * @return {@code true} if allowed, {@code false} if unauthorized
     */
    @Transactional
    public boolean isSessionValidForOrder(Long tableId, String sessionToken) {
        if (!isStrictValidationEnabled()) {
            return true;
        }

        if (sessionToken == null || sessionToken.isBlank()) {
            log.warn("Rejected order for table {}: Missing required table session token", tableId);
            return false;
        }

        Optional<TableSession> optSession = tableSessionRepository.findBySessionToken(sessionToken.trim());
        if (optSession.isEmpty()) {
            log.warn("Rejected order for table {}: Session token not found", tableId);
            return false;
        }

        TableSession session = optSession.get();
        if (!session.getTableId().equals(tableId)) {
            log.warn("Rejected order for table {}: Session token belongs to table {}", tableId, session.getTableId());
            return false;
        }

        LocalDateTime now = timeService.now();
        if (session.getExpiresAt() != null && now.isAfter(session.getExpiresAt())) {
            session.setStatus(TableSessionStatus.EXPIRED);
            tableSessionRepository.save(session);
            log.warn("Rejected order for table {}: Session token expired at {}", tableId, session.getExpiresAt());
            return false;
        }

        if (session.getStatus() != TableSessionStatus.ACTIVE) {
            log.warn("Rejected order for table {}: Session status is {}", tableId, session.getStatus());
            return false;
        }

        session.setLastActivityAt(now);
        tableSessionRepository.save(session);
        return true;
    }

    /**
     * Listens for table liberation events across the application (e.g. server liberation or invoice settlement)
     * and invalidates active session tokens.
     *
     * @param event Published table liberation event
     */
    @EventListener
    @Transactional
    public void handleTableLiberated(TableLiberatedEvent event) {
        if (event != null && event.table() != null && event.table().getId() != null) {
            doInvalidateSessionForTable(event.table().getId());
        }
    }

    private boolean isStrictValidationEnabled() {
        if (appSettingsService != null) {
            AppSettings settings = appSettingsService.getSettings();
            return settings != null && Boolean.TRUE.equals(settings.getTableSessionValidationEnabled());
        }
        return false;
    }
}
