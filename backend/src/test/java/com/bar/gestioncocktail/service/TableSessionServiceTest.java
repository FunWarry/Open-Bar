package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.TableJoinApprovalRequestDTO;
import com.bar.gestioncocktail.dto.TableJoinRequestDTO;
import com.bar.gestioncocktail.dto.TableSessionResponseDTO;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.TableJoinRequestRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.repository.TableSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TableSessionServiceTest {

    @Mock
    private TableSessionRepository tableSessionRepository;

    @Mock
    private AppSettingsService appSettingsService;

    @Mock
    private QrCodeService qrCodeService;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private TableJoinRequestRepository tableJoinRequestRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Spy
    private TimeService timeService = new TimeService(null);

    @InjectMocks
    private TableSessionService tableSessionService;

    private AppSettings appSettings;
    private final LocalDateTime fixedNow = LocalDateTime.of(2026, 9, 5, 18, 0, 0);

    @BeforeEach
    void setUp() {
        lenient().doReturn(fixedNow).when(timeService).now();
        appSettings = new AppSettings();
        appSettings.setTableSessionValidationEnabled(false);
    }

    @Test
    @DisplayName("createOrGetActiveSession: creates fresh session when none exists")
    void createOrGetActiveSession_whenNoneExists_createsNew() {
        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.empty());
        when(tableSessionRepository.save(any(TableSession.class))).thenAnswer(inv -> inv.getArgument(0));

        TableSession session = tableSessionService.createOrGetActiveSession(5L);

        assertThat(session).isNotNull();
        assertThat(session.getTableId()).isEqualTo(5L);
        assertThat(session.getStatus()).isEqualTo(TableSessionStatus.ACTIVE);
        assertThat(session.getSessionToken()).isNotBlank();
        assertThat(session.getExpiresAt()).isAfter(session.getOpenedAt());
        verify(tableSessionRepository).save(any(TableSession.class));
    }

    @Test
    @DisplayName("createOrGetActiveSession: returns existing active session if valid")
    void createOrGetActiveSession_whenActiveExists_refreshesAndReturns() {
        TableSession existing = new TableSession();
        existing.setId(10L);
        existing.setTableId(5L);
        existing.setSessionToken("existing-token-123");
        existing.setStatus(TableSessionStatus.ACTIVE);
        existing.setOpenedAt(fixedNow.minusMinutes(30));
        existing.setLastActivityAt(fixedNow.minusMinutes(10));
        existing.setExpiresAt(fixedNow.plusMinutes(90));

        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.of(existing));
        when(tableSessionRepository.save(any(TableSession.class))).thenAnswer(inv -> inv.getArgument(0));

        TableSession result = tableSessionService.createOrGetActiveSession(5L);

        assertThat(result.getSessionToken()).isEqualTo("existing-token-123");
        assertThat(result.getStatus()).isEqualTo(TableSessionStatus.ACTIVE);
        verify(tableSessionRepository).save(existing);
    }

    @Test
    @DisplayName("createOrGetActiveSession: marks expired active session and creates fresh one")
    void createOrGetActiveSession_whenExpired_marksExpiredAndCreatesNew() {
        TableSession expired = new TableSession();
        expired.setId(10L);
        expired.setTableId(5L);
        expired.setSessionToken("expired-token");
        expired.setStatus(TableSessionStatus.ACTIVE);
        expired.setOpenedAt(fixedNow.minusHours(4));
        expired.setExpiresAt(fixedNow.minusHours(1));

        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.of(expired));
        when(tableSessionRepository.save(any(TableSession.class))).thenAnswer(inv -> inv.getArgument(0));

        TableSession result = tableSessionService.createOrGetActiveSession(5L);

        assertThat(expired.getStatus()).isEqualTo(TableSessionStatus.EXPIRED);
        assertThat(result.getSessionToken()).isNotEqualTo("expired-token");
        assertThat(result.getStatus()).isEqualTo(TableSessionStatus.ACTIVE);
        verify(tableSessionRepository, times(2)).save(any(TableSession.class));
    }

    @Test
    @DisplayName("validateSession: returns valid in permissive mode even without token")
    void validateSession_permissiveMode_withoutToken() {
        when(appSettingsService.getSettings()).thenReturn(appSettings);
        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.empty());
        when(tableSessionRepository.save(any(TableSession.class))).thenAnswer(inv -> inv.getArgument(0));

        TableSessionResponseDTO response = tableSessionService.validateSession(5L, null);

        assertThat(response.valid()).isTrue();
        assertThat(response.tableId()).isEqualTo(5L);
        assertThat(response.sessionToken()).isNotBlank();
    }

    @Test
    @DisplayName("validateSession: returns invalid in strict mode when token is omitted")
    void validateSession_strictMode_withoutToken() {
        appSettings.setTableSessionValidationEnabled(true);
        when(appSettingsService.getSettings()).thenReturn(appSettings);

        TableSessionResponseDTO response = tableSessionService.validateSession(5L, "   ");

        assertThat(response.valid()).isFalse();
        assertThat(response.status()).isEqualTo(TableSessionStatus.EXPIRED);
    }

    @Test
    @DisplayName("validateSession: returns active and valid for matching valid token")
    void validateSession_withValidToken() {
        TableSession session = new TableSession();
        session.setId(20L);
        session.setTableId(5L);
        session.setSessionToken("valid-token-xyz");
        session.setStatus(TableSessionStatus.ACTIVE);
        session.setOpenedAt(fixedNow.minusMinutes(10));
        session.setLastActivityAt(fixedNow.minusMinutes(5));
        session.setExpiresAt(fixedNow.plusMinutes(110));

        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.of(session));
        when(tableSessionRepository.save(any(TableSession.class))).thenAnswer(inv -> inv.getArgument(0));

        TableSessionResponseDTO response = tableSessionService.validateSession(5L, "valid-token-xyz");

        assertThat(response.valid()).isTrue();
        assertThat(response.status()).isEqualTo(TableSessionStatus.ACTIVE);
        assertThat(response.sessionToken()).isEqualTo("valid-token-xyz");
    }

    @Test
    @DisplayName("validateSession: returns invalid when token belongs to different table")
    void validateSession_withMismatchedTable() {
        TableSession session = new TableSession();
        session.setTableId(5L);
        session.setSessionToken("token-for-table-5");
        session.setStatus(TableSessionStatus.ACTIVE);
        session.setExpiresAt(fixedNow.plusMinutes(60));

        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.of(session));

        TableSessionResponseDTO response = tableSessionService.validateSession(5L, "token-for-table-8");

        assertThat(response.valid()).isFalse();
    }

    @Test
    @DisplayName("validateSession: returns invalid and marks EXPIRED when expired")
    void validateSession_whenExpired() {
        TableSession session = new TableSession();
        session.setTableId(5L);
        session.setSessionToken("old-token");
        session.setStatus(TableSessionStatus.ACTIVE);
        session.setExpiresAt(fixedNow.minusMinutes(5));

        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.of(session));
        when(tableSessionRepository.save(any(TableSession.class))).thenAnswer(inv -> inv.getArgument(0));

        TableSessionResponseDTO response = tableSessionService.validateSession(5L, "old-token");

        assertThat(response.valid()).isFalse();
        assertThat(session.getStatus()).isEqualTo(TableSessionStatus.EXPIRED);
    }

    @Test
    @DisplayName("invalidateSessionForTable: updates active sessions to CLOSED")
    void invalidateSessionForTable_callsRepository() {
        TableSession session = new TableSession();
        session.setId(10L);
        session.setTableId(5L);
        session.setStatus(TableSessionStatus.ACTIVE);

        when(tableSessionRepository.findByTableIdAndStatus(5L, TableSessionStatus.ACTIVE))
                .thenReturn(List.of(session));

        tableSessionService.invalidateSessionForTable(5L);

        assertThat(session.getStatus()).isEqualTo(TableSessionStatus.CLOSED);
        verify(tableSessionRepository).saveAllAndFlush(List.of(session));
    }

    @Test
    @DisplayName("handleTableLiberated: listener invalidates sessions on event")
    void handleTableLiberated_listener() {
        TableEntity table = new TableEntity();
        table.setId(12L);
        TableLiberatedEvent event = new TableLiberatedEvent(table);

        TableSession session = new TableSession();
        session.setId(22L);
        session.setTableId(12L);
        session.setStatus(TableSessionStatus.ACTIVE);

        when(tableSessionRepository.findByTableIdAndStatus(12L, TableSessionStatus.ACTIVE))
                .thenReturn(List.of(session));

        tableSessionService.handleTableLiberated(event);

        assertThat(session.getStatus()).isEqualTo(TableSessionStatus.CLOSED);
        verify(tableSessionRepository).saveAllAndFlush(List.of(session));
    }

    @Test
    @DisplayName("isSessionValidForOrder: permissive mode allows any order")
    void isSessionValidForOrder_permissive() {
        when(appSettingsService.getSettings()).thenReturn(appSettings);

        boolean allowed = tableSessionService.isSessionValidForOrder(5L, null);

        assertThat(allowed).isTrue();
    }

    @Test
    @DisplayName("isSessionValidForOrder: strict mode rejects missing or invalid token")
    void isSessionValidForOrder_strict_missingOrInvalid() {
        appSettings.setTableSessionValidationEnabled(true);
        when(appSettingsService.getSettings()).thenReturn(appSettings);

        assertThat(tableSessionService.isSessionValidForOrder(5L, null)).isFalse();
        assertThat(tableSessionService.isSessionValidForOrder(5L, "")).isFalse();

        when(tableSessionRepository.findBySessionToken("unknown")).thenReturn(Optional.empty());
        assertThat(tableSessionService.isSessionValidForOrder(5L, "unknown")).isFalse();
    }

    @Test
    @DisplayName("isSessionValidForOrder: strict mode accepts valid active token")
    void isSessionValidForOrder_strict_valid() {
        appSettings.setTableSessionValidationEnabled(true);
        when(appSettingsService.getSettings()).thenReturn(appSettings);

        TableSession session = new TableSession();
        session.setTableId(5L);
        session.setSessionToken("secret-token");
        session.setStatus(TableSessionStatus.ACTIVE);
        session.setExpiresAt(fixedNow.plusHours(1));

        when(tableSessionRepository.findBySessionToken("secret-token")).thenReturn(Optional.of(session));
        when(tableSessionRepository.save(any(TableSession.class))).thenAnswer(inv -> inv.getArgument(0));

        boolean allowed = tableSessionService.isSessionValidForOrder(5L, "secret-token");

        assertThat(allowed).isTrue();
    }

    @Test
    @DisplayName("generateSessionQrCode: generates PNG QR code with session token and settings base URL")
    void generateSessionQrCode_png_success() {
        appSettings.setClientBaseUrl("https://bar.example.com");
        when(appSettingsService.getSettings()).thenReturn(appSettings);

        TableEntity table = new TableEntity();
        table.setId(5L);
        table.setNumero(12);
        when(tableRepository.findById(5L)).thenReturn(Optional.of(table));

        when(qrCodeService.buildTableOrderUrl("https://bar.example.com", 12, "my-token"))
                .thenReturn("https://bar.example.com/client/commande?table=12&token=my-token");
        byte[] expectedBytes = new byte[]{1, 2, 3};
        when(qrCodeService.generatePng("https://bar.example.com/client/commande?table=12&token=my-token", 300, 300))
                .thenReturn(expectedBytes);

        byte[] result = tableSessionService.generateSessionQrCode(5L, "my-token", "PNG", 300, null);

        assertThat(result).isEqualTo(expectedBytes);
    }

    @Test
    @DisplayName("generateSessionQrCode: generates SVG QR code with custom base URL")
    void generateSessionQrCode_svg_customBaseUrl() {
        when(tableRepository.findById(7L)).thenReturn(Optional.empty());
        when(tableRepository.findByNumero(7)).thenReturn(Optional.empty());

        when(qrCodeService.buildTableOrderUrl("http://192.168.1.50:4200", 7, "token-abc"))
                .thenReturn("http://192.168.1.50:4200/client/commande?table=7&token=token-abc");
        when(qrCodeService.generateSvg("http://192.168.1.50:4200/client/commande?table=7&token=token-abc", 250))
                .thenReturn("<svg>test</svg>");

        byte[] result = tableSessionService.generateSessionQrCode(7L, "token-abc", "SVG", 250, "http://192.168.1.50:4200");

        assertThat(new String(result)).isEqualTo("<svg>test</svg>");
    }

    @Test
    @DisplayName("validateSession: returns valid fresh session for free table even in strict mode without token")
    void validateSession_whenTableIsFree_generatesActiveSessionEvenInStrictModeWithoutToken() {
        appSettings.setTableSessionValidationEnabled(true);
        lenient().when(appSettingsService.getSettings()).thenReturn(appSettings);

        TableEntity freeTable = new TableEntity();
        freeTable.setId(10L);
        freeTable.setNumero(4);
        freeTable.setOccupee(false);

        when(tableRepository.findByNumero(4)).thenReturn(Optional.of(freeTable));
        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(10L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.empty());
        when(tableSessionRepository.save(any(TableSession.class))).thenAnswer(inv -> inv.getArgument(0));

        TableSessionResponseDTO response = tableSessionService.validateSession(4L, null);

        assertThat(response.valid()).isTrue();
        assertThat(response.status()).isEqualTo(TableSessionStatus.ACTIVE);
        assertThat(response.sessionToken()).isNotBlank();
        assertThat(response.tableId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("validateSession: resolves table by numero and matches existing active session with canonical ID")
    void validateSession_whenTableNumeroDiffersFromId_resolvesCanonicalTableId() {
        TableEntity occupiedTable = new TableEntity();
        occupiedTable.setId(25L);
        occupiedTable.setNumero(3);
        occupiedTable.setOccupee(true);

        when(tableRepository.findByNumero(3)).thenReturn(Optional.of(occupiedTable));

        TableSession session = new TableSession();
        session.setId(99L);
        session.setTableId(25L);
        session.setSessionToken("session-token-table-3");
        session.setStatus(TableSessionStatus.ACTIVE);
        session.setOpenedAt(fixedNow.minusMinutes(10));
        session.setLastActivityAt(fixedNow.minusMinutes(5));
        session.setExpiresAt(fixedNow.plusMinutes(90));

        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(25L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.of(session));
        when(tableSessionRepository.save(any(TableSession.class))).thenAnswer(inv -> inv.getArgument(0));

        // Patron scanned ?table=3 with token from dining companion
        TableSessionResponseDTO response = tableSessionService.validateSession(3L, "session-token-table-3");

        assertThat(response.valid()).isTrue();
        assertThat(response.status()).isEqualTo(TableSessionStatus.ACTIVE);
        assertThat(response.sessionToken()).isEqualTo("session-token-table-3");
        assertThat(response.tableId()).isEqualTo(25L);
    }

    @Test
    @DisplayName("createJoinRequest: saves pending join request and broadcasts to table owner")
    void createJoinRequest_savesAndBroadcasts() {
        when(tableRepository.findById(5L)).thenReturn(Optional.empty());
        when(tableRepository.findByNumero(5)).thenReturn(Optional.empty());

        TableSession session = new TableSession();
        session.setTableId(5L);
        session.setStatus(TableSessionStatus.ACTIVE);

        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.of(session));
        when(tableJoinRequestRepository.findFirstByTableIdAndApplicantSessionIdOrderByCreatedAtDesc(5L, "guest-sam"))
                .thenReturn(Optional.empty());

        when(tableJoinRequestRepository.save(any(TableJoinRequest.class))).thenAnswer(inv -> {
            TableJoinRequest r = inv.getArgument(0);
            r.setId(77L);
            return r;
        });

        TableJoinRequestDTO requestDto = new TableJoinRequestDTO(
                null, 5L, "guest-sam", "Sam", "PENDING", null, null
        );

        TableJoinRequestDTO result = tableSessionService.createJoinRequest(5L, requestDto);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(77L);
        assertThat(result.applicantName()).isEqualTo("Sam");
        verify(tableJoinRequestRepository).save(any(TableJoinRequest.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/tables/5/owner"), any(TableJoinRequestDTO.class));
    }

    @Test
    @DisplayName("createJoinRequest: throws ResourceNotFoundException when no active session exists")
    void createJoinRequest_whenNoActiveSession_throwsException() {
        when(tableRepository.findById(5L)).thenReturn(Optional.empty());
        when(tableRepository.findByNumero(5)).thenReturn(Optional.empty());
        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.empty());

        TableJoinRequestDTO requestDto = new TableJoinRequestDTO(
                null, 5L, "guest-sam", "Sam", "PENDING", null, null
        );

        assertThatThrownBy(() -> tableSessionService.createJoinRequest(5L, requestDto))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No active session for table 5");
    }

    @Test
    @DisplayName("respondToJoinRequest: approves request, attaches session token and broadcasts to applicant")
    void respondToJoinRequest_whenApproved_attachesTokenAndBroadcasts() {
        when(tableRepository.findById(5L)).thenReturn(Optional.empty());
        when(tableRepository.findByNumero(5)).thenReturn(Optional.empty());

        TableSession activeSession = new TableSession();
        activeSession.setTableId(5L);
        activeSession.setSessionToken("secret-token-table-5");
        activeSession.setStatus(TableSessionStatus.ACTIVE);

        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.of(activeSession));

        TableJoinRequest req = new TableJoinRequest();
        req.setId(77L);
        req.setTableId(5L);
        req.setApplicantSessionId("guest-sam");
        req.setApplicantName("Sam");
        req.setStatus(TableJoinRequestStatus.PENDING);

        when(tableJoinRequestRepository.findById(77L)).thenReturn(Optional.of(req));
        when(tableJoinRequestRepository.save(any(TableJoinRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        TableJoinApprovalRequestDTO approvalDto = new TableJoinApprovalRequestDTO("owner-alex", true);
        TableJoinRequestDTO result = tableSessionService.respondToJoinRequest(5L, 77L, approvalDto);

        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo("APPROVED");
        assertThat(result.sessionToken()).isEqualTo("secret-token-table-5");
        verify(messagingTemplate).convertAndSend(eq("/topic/tables/5/join-requests/guest-sam"), any(TableJoinRequestDTO.class));
    }

    @Test
    @DisplayName("respondToJoinRequest: rejects request and broadcasts rejection to applicant")
    void respondToJoinRequest_whenRejected_broadcastsRejection() {
        when(tableRepository.findById(5L)).thenReturn(Optional.empty());
        when(tableRepository.findByNumero(5)).thenReturn(Optional.empty());

        TableSession activeSession = new TableSession();
        activeSession.setTableId(5L);
        activeSession.setSessionToken("secret-token-table-5");
        activeSession.setStatus(TableSessionStatus.ACTIVE);

        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.of(activeSession));

        TableJoinRequest req = new TableJoinRequest();
        req.setId(77L);
        req.setTableId(5L);
        req.setApplicantSessionId("guest-intruder");
        req.setApplicantName("Intruder");
        req.setStatus(TableJoinRequestStatus.PENDING);

        when(tableJoinRequestRepository.findById(77L)).thenReturn(Optional.of(req));
        when(tableJoinRequestRepository.save(any(TableJoinRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        TableJoinApprovalRequestDTO approvalDto = new TableJoinApprovalRequestDTO("owner-alex", false);
        TableJoinRequestDTO result = tableSessionService.respondToJoinRequest(5L, 77L, approvalDto);

        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo("REJECTED");
        assertThat(result.sessionToken()).isNull();
        verify(messagingTemplate).convertAndSend(eq("/topic/tables/5/join-requests/guest-intruder"), any(TableJoinRequestDTO.class));
    }

    @Test
    @DisplayName("getPendingJoinRequests: returns pending requests when caller is table owner")
    void getPendingJoinRequests_whenOwner_returnsList() {
        when(tableRepository.findById(5L)).thenReturn(Optional.empty());
        when(tableRepository.findByNumero(5)).thenReturn(Optional.empty());

        TableSession activeSession = new TableSession();
        activeSession.setTableId(5L);
        activeSession.setOwnerGuestSessionId("owner-alex");
        activeSession.setStatus(TableSessionStatus.ACTIVE);

        when(tableSessionRepository.findFirstByTableIdAndStatusOrderByOpenedAtDesc(5L, TableSessionStatus.ACTIVE))
                .thenReturn(Optional.of(activeSession));

        TableJoinRequest req = new TableJoinRequest();
        req.setId(77L);
        req.setTableId(5L);
        req.setApplicantSessionId("guest-sam");
        req.setApplicantName("Sam");
        req.setStatus(TableJoinRequestStatus.PENDING);

        when(tableJoinRequestRepository.findByTableIdAndStatus(5L, TableJoinRequestStatus.PENDING))
                .thenReturn(List.of(req));

        List<TableJoinRequestDTO> result = tableSessionService.getPendingJoinRequests(5L, "owner-alex");

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().applicantName()).isEqualTo("Sam");
    }
}
