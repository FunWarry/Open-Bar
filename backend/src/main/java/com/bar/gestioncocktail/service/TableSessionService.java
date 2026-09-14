package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.TableSessionResponseDTO;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.TableSession;
import com.bar.gestioncocktail.model.TableSessionStatus;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.repository.TableSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.bar.gestioncocktail.dto.TableJoinApprovalRequestDTO;
import com.bar.gestioncocktail.dto.TableJoinRequestDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.TableJoinRequest;
import com.bar.gestioncocktail.model.TableJoinRequestStatus;
import com.bar.gestioncocktail.repository.TableJoinRequestRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * Service managing the lifecycle, validation, and anti-fraud verification of ephemeral table sessions.
 * <p>
 * Ensures table QR codes are bounded to active on-premise dining sessions and invalidates sessions
 * upon table liberation or bill settlement.
 */
@Service
public class TableSessionService {

    private static final Logger log = LoggerFactory.getLogger(TableSessionService.class);

    private static final String TOPIC_TABLES_PREFIX = "/topic/tables/";

    /** Default session expiration duration in minutes (2 hours). */
    public static final int DEFAULT_SESSION_DURATION_MINUTES = 120;

    private final TableSessionRepository tableSessionRepository;
    private final AppSettingsService appSettingsService;
    private final TimeService timeService;
    private final QrCodeService qrCodeService;
    private final TableRepository tableRepository;
    private final TableJoinRequestRepository tableJoinRequestRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Constructs the table session service with required dependencies.
     *
     * @param tableSessionRepository Repository managing table session persistence
     * @param appSettingsService Service retrieving global establishment settings
     * @param timeService System time provider
     * @param qrCodeService Service for QR code generation
     * @param tableRepository Repository for floor plan table entities
     * @param tableJoinRequestRepository Repository for table join requests
     * @param messagingTemplate STOMP messaging template for real-time notifications
     */
    @org.springframework.beans.factory.annotation.Autowired
    public TableSessionService(
            TableSessionRepository tableSessionRepository,
            AppSettingsService appSettingsService,
            TimeService timeService,
            QrCodeService qrCodeService,
            TableRepository tableRepository,
            TableJoinRequestRepository tableJoinRequestRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.tableSessionRepository = tableSessionRepository;
        this.appSettingsService = appSettingsService;
        this.timeService = timeService;
        this.qrCodeService = qrCodeService;
        this.tableRepository = tableRepository;
        this.tableJoinRequestRepository = tableJoinRequestRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Backward-compatible constructor for existing tests and call sites.
     */
    public TableSessionService(
            TableSessionRepository tableSessionRepository,
            AppSettingsService appSettingsService,
            TimeService timeService,
            QrCodeService qrCodeService,
            TableRepository tableRepository) {
        this(tableSessionRepository, appSettingsService, timeService, qrCodeService, tableRepository, null, null);
    }

    /**
     * Resolves a table entity by either its primary key ID or its visible table number (numero).
     *
     * @param tableIdOrNumero Primary key ID or visible table number
     * @return Resolved {@link TableEntity} or empty
     */
    public Optional<TableEntity> resolveTable(Long tableIdOrNumero) {
        if (tableIdOrNumero == null || tableRepository == null) {
            return Optional.empty();
        }
        Optional<TableEntity> byId = tableRepository.findById(tableIdOrNumero);
        if (byId.isPresent()) {
            return byId;
        }
        return tableRepository.findByNumero(tableIdOrNumero.intValue());
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
     * @param tableId Table identifier or table number
     * @param sessionToken Ephemeral token supplied by patron interface (may be null/empty)
     * @return DTO indicating whether session is authorized for ordering
     */
    @Transactional
    public TableSessionResponseDTO validateSession(Long tableId, String sessionToken) {
        return doValidateSession(tableId, sessionToken, null, null);
    }

    /**
     * Validates a session token with querying guest context and manages table ownership.
     *
     * @param tableId Table identifier or table number
     * @param sessionToken Ephemeral token supplied by patron interface (may be null/empty)
     * @param guestSessionId Session identifier of the querying guest
     * @param guestName Nickname of the querying guest
     * @return DTO indicating whether session is authorized for ordering, owner status, and message
     */
    @Transactional
    public TableSessionResponseDTO validateSession(Long tableId, String sessionToken, String guestSessionId, String guestName) {
        return doValidateSession(tableId, sessionToken, guestSessionId, guestName);
    }

    private TableSessionResponseDTO doValidateSession(Long tableId, String sessionToken, String guestSessionId, String guestName) {
        TableEntity table = resolveTable(tableId).orElse(null);
        Long canonicalTableId = (table != null && table.getId() != null) ? table.getId() : tableId;
        boolean isTableFree = (table != null && !table.isOccupee());
        LocalDateTime now = timeService.now();

        if (isTableFree) {
            return validateFreeTableSession(canonicalTableId, now, guestSessionId, guestName);
        }
        return validateOccupiedTableSession(canonicalTableId, tableId, sessionToken, guestSessionId, guestName, now);
    }

    private TableSessionResponseDTO validateFreeTableSession(
            Long canonicalTableId,
            LocalDateTime now,
            String guestSessionId,
            String guestName) {
        TableSession activeSession = findOrGenerateActiveSession(canonicalTableId, now);
        if (activeSession.getOwnerGuestSessionId() == null && guestSessionId != null && !guestSessionId.isBlank()) {
            activeSession.setOwnerGuestSessionId(guestSessionId);
            activeSession.setOwnerGuestName(guestName != null && !guestName.isBlank() ? guestName.trim() : "Hôte");
            activeSession = tableSessionRepository.save(activeSession);
            log.info("Assigned guest {} ({}) as owner of free table {}", guestName, guestSessionId, canonicalTableId);
        }
        return TableSessionResponseDTO.from(activeSession, true, "Active table session initialized for free table", guestSessionId);
    }

    private TableSessionResponseDTO validateOccupiedTableSession(
            Long canonicalTableId,
            Long tableId,
            String sessionToken,
            String guestSessionId,
            String guestName,
            LocalDateTime now) {
        Optional<TableSession> optSession = tableSessionRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(canonicalTableId, TableSessionStatus.ACTIVE);

        if (optSession.isEmpty()) {
            if (!isStrictValidationEnabled()) {
                return validateFreeTableSession(canonicalTableId, now, guestSessionId, guestName);
            }
            return new TableSessionResponseDTO(null, tableId, sessionToken, TableSessionStatus.EXPIRED,
                    null, null, null, false, "Table session not found or invalid", null, null, false);
        }

        TableSession session = optSession.get();
        if (session.getExpiresAt() != null && now.isAfter(session.getExpiresAt())) {
            session.setStatus(TableSessionStatus.EXPIRED);
            tableSessionRepository.save(session);
            return TableSessionResponseDTO.from(session, false, "Table session has expired", guestSessionId);
        }

        boolean isOwner = guestSessionId != null && guestSessionId.equals(session.getOwnerGuestSessionId());
        if (session.getOwnerGuestSessionId() == null && guestSessionId != null && !guestSessionId.isBlank()) {
            session.setOwnerGuestSessionId(guestSessionId);
            session.setOwnerGuestName(guestName != null && !guestName.isBlank() ? guestName.trim() : "Hôte");
            session = tableSessionRepository.save(session);
            isOwner = true;
            log.info("Claimed table {} ownership by guest {} ({})", canonicalTableId, guestName, guestSessionId);
        }

        if (isOwner) {
            session.setLastActivityAt(now);
            TableSession updated = tableSessionRepository.save(session);
            return TableSessionResponseDTO.from(updated, true, "Welcome table owner", guestSessionId);
        }

        boolean hasMatchingToken = sessionToken != null && !sessionToken.isBlank()
                && sessionToken.trim().equals(session.getSessionToken());

        if (hasMatchingToken) {
            session.setLastActivityAt(now);
            TableSession updated = tableSessionRepository.save(session);
            return TableSessionResponseDTO.from(updated, true, "Table session is active and valid", guestSessionId);
        }

        return new TableSessionResponseDTO(
                session.getId(),
                tableId,
                null,
                session.getStatus(),
                session.getOpenedAt(),
                session.getLastActivityAt(),
                session.getExpiresAt(),
                false,
                "Table is occupied. Join approval required.",
                session.getOwnerGuestSessionId(),
                session.getOwnerGuestName(),
                false
        );
    }

    /**
     * Submits a request to join an active table session.
     *
     * @param tableId Table identifier
     * @param dto Join request payload
     * @return Created join request DTO
     */
    @Transactional
    public TableJoinRequestDTO createJoinRequest(Long tableId, TableJoinRequestDTO dto) {
        TableEntity table = resolveTable(tableId).orElse(null);
        Long canonicalTableId = (table != null && table.getId() != null) ? table.getId() : tableId;

        boolean activeExists = tableSessionRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(canonicalTableId, TableSessionStatus.ACTIVE)
                .isPresent();
        if (!activeExists) {
            throw new ResourceNotFoundException("No active session for table " + tableId);
        }

        if (tableJoinRequestRepository != null) {
            Optional<TableJoinRequest> existing = tableJoinRequestRepository
                    .findFirstByTableIdAndApplicantSessionIdOrderByCreatedAtDesc(canonicalTableId, dto.applicantSessionId());
            if (existing.isPresent() && existing.get().getStatus() == TableJoinRequestStatus.PENDING) {
                TableJoinRequest req = existing.get();
                req.setApplicantName(dto.applicantName());
                TableJoinRequest saved = tableJoinRequestRepository.save(req);
                broadcastOwnerJoinRequest(canonicalTableId, saved);
                return TableJoinRequestDTO.from(saved, null);
            }

            TableJoinRequest req = new TableJoinRequest();
            req.setTableId(canonicalTableId);
            req.setApplicantSessionId(dto.applicantSessionId());
            req.setApplicantName(dto.applicantName());
            req.setStatus(TableJoinRequestStatus.PENDING);
            req.setCreatedAt(timeService.now());
            TableJoinRequest saved = tableJoinRequestRepository.save(req);

            broadcastOwnerJoinRequest(canonicalTableId, saved);
            log.info("Created join request #{} for table {} from guest {}", saved.getId(), canonicalTableId, dto.applicantName());
            return TableJoinRequestDTO.from(saved, null);
        }
        return dto;
    }

    /**
     * Responds to an applicant's table join request (accept or reject).
     *
     * @param tableId Table identifier
     * @param requestId Request identifier
     * @param dto Approval action payload
     * @return Updated join request DTO with session token if accepted
     */
    @Transactional
    public TableJoinRequestDTO respondToJoinRequest(Long tableId, Long requestId, TableJoinApprovalRequestDTO dto) {
        TableEntity table = resolveTable(tableId).orElse(null);
        Long canonicalTableId = (table != null && table.getId() != null) ? table.getId() : tableId;

        TableSession activeSession = tableSessionRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(canonicalTableId, TableSessionStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active session for table " + tableId));

        if (activeSession.getOwnerGuestSessionId() != null && !activeSession.getOwnerGuestSessionId().equals(dto.ownerSessionId())) {
            throw new BusinessException("Unauthorized: Only the table owner can approve or reject join requests");
        }

        if (tableJoinRequestRepository == null) {
            throw new BusinessException("Join request repository not available");
        }

        TableJoinRequest req = tableJoinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Join request not found with id: " + requestId));

        if (!req.getTableId().equals(canonicalTableId)) {
            throw new BusinessException("Join request does not belong to table " + tableId);
        }

        boolean approved = Boolean.TRUE.equals(dto.approved());
        req.setStatus(approved ? TableJoinRequestStatus.APPROVED : TableJoinRequestStatus.REJECTED);
        TableJoinRequest updated = tableJoinRequestRepository.save(req);

        String tokenIfApproved = approved ? activeSession.getSessionToken() : null;
        TableJoinRequestDTO responseDTO = TableJoinRequestDTO.from(updated, tokenIfApproved);

        broadcastApplicantJoinResponse(canonicalTableId, req.getApplicantSessionId(), responseDTO);
        broadcastOwnerJoinRequestResolved(canonicalTableId, updated);

        log.info("Table owner responded to join request #{}: approved={}", requestId, approved);
        return responseDTO;
    }

    /**
     * Checks current status of a join request for an applicant.
     *
     * @param tableId Table identifier
     * @param applicantSessionId Applicant guest session UUID
     * @return Latest join request DTO with token if approved
     */
    @Transactional(readOnly = true)
    public TableJoinRequestDTO getJoinRequestStatus(Long tableId, String applicantSessionId) {
        TableEntity table = resolveTable(tableId).orElse(null);
        Long canonicalTableId = (table != null && table.getId() != null) ? table.getId() : tableId;

        if (tableJoinRequestRepository == null) {
            return null;
        }

        Optional<TableJoinRequest> optReq = tableJoinRequestRepository
                .findFirstByTableIdAndApplicantSessionIdOrderByCreatedAtDesc(canonicalTableId, applicantSessionId);

        if (optReq.isEmpty()) {
            return null;
        }

        TableJoinRequest req = optReq.get();
        String tokenIfApproved = null;
        if (req.getStatus() == TableJoinRequestStatus.APPROVED) {
            Optional<TableSession> active = tableSessionRepository
                    .findFirstByTableIdAndStatusOrderByOpenedAtDesc(canonicalTableId, TableSessionStatus.ACTIVE);
            if (active.isPresent()) {
                tokenIfApproved = active.get().getSessionToken();
            }
        }
        return TableJoinRequestDTO.from(req, tokenIfApproved);
    }

    /**
     * Retrieves all pending join requests for a table awaiting owner approval.
     *
     * @param tableId Table identifier
     * @param ownerSessionId Owner session UUID
     * @return List of pending join requests
     */
    @Transactional(readOnly = true)
    public List<TableJoinRequestDTO> getPendingJoinRequests(Long tableId, String ownerSessionId) {
        TableEntity table = resolveTable(tableId).orElse(null);
        Long canonicalTableId = (table != null && table.getId() != null) ? table.getId() : tableId;

        if (tableJoinRequestRepository == null) {
            return List.of();
        }

        TableSession activeSession = tableSessionRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(canonicalTableId, TableSessionStatus.ACTIVE)
                .orElse(null);

        if (activeSession == null || activeSession.getOwnerGuestSessionId() == null
                || !activeSession.getOwnerGuestSessionId().equals(ownerSessionId)) {
            return List.of();
        }

        return tableJoinRequestRepository.findByTableIdAndStatus(canonicalTableId, TableJoinRequestStatus.PENDING)
                .stream()
                .map(r -> TableJoinRequestDTO.from(r, null))
                .toList();
    }

    private void broadcastOwnerJoinRequest(Long tableId, TableJoinRequest req) {
        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSend(TOPIC_TABLES_PREFIX + tableId + "/owner", TableJoinRequestDTO.from(req, null));
            } catch (Exception e) {
                log.warn("Failed to broadcast join request to table owner: {}", e.getMessage());
            }
        }
    }

    private void broadcastApplicantJoinResponse(Long tableId, String applicantSessionId, TableJoinRequestDTO dto) {
        if (messagingTemplate != null && applicantSessionId != null) {
            try {
                messagingTemplate.convertAndSend(TOPIC_TABLES_PREFIX + tableId + "/join-requests/" + applicantSessionId, dto);
            } catch (Exception e) {
                log.warn("Failed to broadcast join response to applicant: {}", e.getMessage());
            }
        }
    }

    private void broadcastOwnerJoinRequestResolved(Long tableId, TableJoinRequest req) {
        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSend(TOPIC_TABLES_PREFIX + tableId + "/owner", TableJoinRequestDTO.from(req, null));
            } catch (Exception e) {
                log.warn("Failed to broadcast join request resolution to owner: {}", e.getMessage());
            }
        }
    }

    /**
     * Refreshes or reinitializes an active session for an on-premise table.
     *
     * @param tableId Table identifier or number
     * @return Fresh or confirmed active session DTO
     */
    @Transactional
    public TableSessionResponseDTO refreshSession(Long tableId) {
        TableEntity table = resolveTable(tableId).orElse(null);
        Long canonicalTableId = (table != null && table.getId() != null) ? table.getId() : tableId;
        TableSession session = findOrGenerateActiveSession(canonicalTableId, timeService.now());
        return TableSessionResponseDTO.from(session, true, "Table session refreshed");
    }

    /**
     * Generates a QR code image (PNG or SVG) encoding the collaborative table ordering URL.
     *
     * @param tableId Identifier or number of the table
     * @param token Ephemeral session token (optional)
     * @param format Image format ("PNG" or "SVG")
     * @param size Target dimension in pixels
     * @param customBaseUrl Optional custom client base URL (e.g. from patron browser origin)
     * @return Image byte array
     */
    @Transactional(readOnly = true)
    public byte[] generateSessionQrCode(Long tableId, String token, String format, int size, String customBaseUrl) {
        String baseUrl = resolveBaseUrl(customBaseUrl);
        int tableNumero = resolveTableNumero(tableId);
        String sessionToken = token;
        if (sessionToken == null || sessionToken.isBlank()) {
            TableEntity table = resolveTable(tableId).orElse(null);
            Long canonicalTableId = (table != null && table.getId() != null) ? table.getId() : tableId;
            Optional<TableSession> active = tableSessionRepository
                    .findFirstByTableIdAndStatusOrderByOpenedAtDesc(canonicalTableId, TableSessionStatus.ACTIVE);
            if (active.isPresent()) {
                sessionToken = active.get().getSessionToken();
            }
        }
        String tableUrl = buildSessionOrderUrl(baseUrl, tableNumero, sessionToken);
        int dimension = size > 0 ? size : 300;

        if ("SVG".equalsIgnoreCase(format)) {
            String svg = (qrCodeService != null) ? qrCodeService.generateSvg(tableUrl, dimension) : "<svg></svg>";
            return svg.getBytes(StandardCharsets.UTF_8);
        }
        return (qrCodeService != null) ? qrCodeService.generatePng(tableUrl, dimension, dimension) : new byte[0];
    }

    private String resolveBaseUrl(String customBaseUrl) {
        if (customBaseUrl != null && !customBaseUrl.isBlank()) {
            return customBaseUrl.trim();
        }
        if (appSettingsService != null) {
            AppSettings settings = appSettingsService.getSettings();
            if (settings != null && settings.getClientBaseUrl() != null && !settings.getClientBaseUrl().isBlank()) {
                return settings.getClientBaseUrl();
            }
        }
        return "https://openbar.lan";
    }

    private int resolveTableNumero(Long tableId) {
        if (tableId == null) {
            return 1;
        }
        Optional<TableEntity> optTable = resolveTable(tableId);
        if (optTable.isPresent() && optTable.get().getNumero() != null) {
            return optTable.get().getNumero();
        }
        return tableId.intValue();
    }

    private String buildSessionOrderUrl(String baseUrl, int tableNumero, String token) {
        if (qrCodeService != null) {
            return qrCodeService.buildTableOrderUrl(baseUrl, tableNumero, token);
        }
        StringBuilder sb = new StringBuilder(baseUrl);
        sb.append("/client/commande?table=").append(tableNumero);
        if (token != null && !token.isBlank()) {
            sb.append("&token=").append(token.trim());
        }
        return sb.toString();
    }

    /**
     * Invalidates all active sessions associated with the specified table by marking them CLOSED.
     *
     * @param tableId Identifier of the table to invalidate sessions for
     */
    @Transactional
    public void invalidateSessionForTable(Long tableId) {
        TableEntity table = resolveTable(tableId).orElse(null);
        Long canonicalTableId = (table != null && table.getId() != null) ? table.getId() : tableId;
        doInvalidateSessionForTable(canonicalTableId);
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
        List<TableSession> activeSessions = tableSessionRepository.findByTableIdAndStatus(tableId, TableSessionStatus.ACTIVE);
        if (!activeSessions.isEmpty()) {
            for (TableSession session : activeSessions) {
                session.setStatus(TableSessionStatus.CLOSED);
            }
            tableSessionRepository.saveAllAndFlush(activeSessions);
        }
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

        TableEntity table = resolveTable(tableId).orElse(null);
        Long canonicalTableId = (table != null && table.getId() != null) ? table.getId() : tableId;

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
        if (!session.getTableId().equals(canonicalTableId)) {
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
