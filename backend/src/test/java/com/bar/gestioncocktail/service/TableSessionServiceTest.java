package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.TableSessionResponseDTO;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableSession;
import com.bar.gestioncocktail.model.TableSessionStatus;
import com.bar.gestioncocktail.repository.TableSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TableSessionServiceTest {

    @Mock
    private TableSessionRepository tableSessionRepository;

    @Mock
    private AppSettingsService appSettingsService;

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
        appSettings.setTableSessionValidationEnabled(true);
        when(appSettingsService.getSettings()).thenReturn(appSettings);

        TableSession session = new TableSession();
        session.setId(20L);
        session.setTableId(5L);
        session.setSessionToken("valid-token-xyz");
        session.setStatus(TableSessionStatus.ACTIVE);
        session.setOpenedAt(fixedNow.minusMinutes(10));
        session.setLastActivityAt(fixedNow.minusMinutes(5));
        session.setExpiresAt(fixedNow.plusMinutes(110));

        when(tableSessionRepository.findBySessionToken("valid-token-xyz")).thenReturn(Optional.of(session));
        when(tableSessionRepository.save(any(TableSession.class))).thenAnswer(inv -> inv.getArgument(0));

        TableSessionResponseDTO response = tableSessionService.validateSession(5L, "valid-token-xyz");

        assertThat(response.valid()).isTrue();
        assertThat(response.status()).isEqualTo(TableSessionStatus.ACTIVE);
        assertThat(response.sessionToken()).isEqualTo("valid-token-xyz");
    }

    @Test
    @DisplayName("validateSession: returns invalid when token belongs to different table")
    void validateSession_withMismatchedTable() {
        appSettings.setTableSessionValidationEnabled(true);
        when(appSettingsService.getSettings()).thenReturn(appSettings);

        TableSession session = new TableSession();
        session.setTableId(8L);
        session.setSessionToken("token-for-table-8");
        session.setStatus(TableSessionStatus.ACTIVE);
        session.setExpiresAt(fixedNow.plusMinutes(60));

        when(tableSessionRepository.findBySessionToken("token-for-table-8")).thenReturn(Optional.of(session));

        TableSessionResponseDTO response = tableSessionService.validateSession(5L, "token-for-table-8");

        assertThat(response.valid()).isFalse();
    }

    @Test
    @DisplayName("validateSession: returns invalid and marks EXPIRED when expired")
    void validateSession_whenExpired() {
        appSettings.setTableSessionValidationEnabled(true);
        when(appSettingsService.getSettings()).thenReturn(appSettings);

        TableSession session = new TableSession();
        session.setTableId(5L);
        session.setSessionToken("old-token");
        session.setStatus(TableSessionStatus.ACTIVE);
        session.setExpiresAt(fixedNow.minusMinutes(5));

        when(tableSessionRepository.findBySessionToken("old-token")).thenReturn(Optional.of(session));
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
}
