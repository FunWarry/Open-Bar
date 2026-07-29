package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.AuditLog;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import org.mockito.Spy;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    AuditLogRepository auditLogRepository;

    @Spy
    TimeService timeService = new TimeService(null);

    @InjectMocks
    AuditLogService auditLogService;


    private User user;
    private AuditLog auditLog;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);

        auditLog = new AuditLog();
        auditLog.setId(1L);
        auditLog.setUser(user);
        auditLog.setAction("CREATE");
        auditLog.setEntityType("Cocktail");
        auditLog.setEntityId(42L);
        auditLog.setDetails("Mojito créé");
        auditLog.setIpAddress("127.0.0.1");
    }

    // ─── createAuditLog ───────────────────────────────────────────────────────

    @Test
    void createAuditLog_nominal_setsTimestampAndSaves() {
        given(auditLogRepository.save(any(AuditLog.class))).willAnswer(inv -> inv.getArgument(0));

        AuditLog result = auditLogService.createAuditLog(auditLog);

        assertThat(result.getTimestamp()).isNotNull();
        verify(auditLogRepository).save(auditLog);
    }

    @Test
    void createAuditLog_nominal_retourneEntiteSauvegardee() {
        given(auditLogRepository.save(any(AuditLog.class))).willReturn(auditLog);

        AuditLog result = auditLogService.createAuditLog(auditLog);

        assertThat(result).isNotNull();
        assertThat(result.getAction()).isEqualTo("CREATE");
        assertThat(result.getEntityType()).isEqualTo("Cocktail");
    }

    // ─── logAction ────────────────────────────────────────────────────────────

    @Test
    void logAction_nominal_persisteAuditLogAvecTousLesChamps() {
        given(auditLogRepository.save(any(AuditLog.class))).willAnswer(inv -> inv.getArgument(0));

        auditLogService.logAction(user, "DELETE", "Ingredient", 7L, "Rhum supprimé", "192.168.1.1");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog saved = captor.getValue();
        assertThat(saved.getUser()).isEqualTo(user);
        assertThat(saved.getAction()).isEqualTo("DELETE");
        assertThat(saved.getEntityType()).isEqualTo("Ingredient");
        assertThat(saved.getEntityId()).isEqualTo(7L);
        assertThat(saved.getDetails()).isEqualTo("Rhum supprimé");
        assertThat(saved.getIpAddress()).isEqualTo("192.168.1.1");
    }

    @Test
    void logAction_nominal_setsTimestampAvantSauvegarde() {
        LocalDateTime avant = LocalDateTime.now().minusSeconds(1);
        given(auditLogRepository.save(any(AuditLog.class))).willAnswer(inv -> inv.getArgument(0));

        auditLogService.logAction(user, "UPDATE", "Table", 3L, null, null);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getTimestamp()).isAfter(avant);
    }

    @Test
    void logAction_detailsNull_neLevePasException() {
        given(auditLogRepository.save(any(AuditLog.class))).willAnswer(inv -> inv.getArgument(0));

        // details et ipAddress peuvent être null — doit fonctionner sans NPE
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
            () -> auditLogService.logAction(user, "READ", "Commande", 10L, null, null)
        );
    }

    // ─── getAuditLogsByUser ───────────────────────────────────────────────────

    @Test
    void getAuditLogsByUser_nominal_retourneListe() {
        given(auditLogRepository.findByUser(user)).willReturn(List.of(auditLog));

        List<AuditLog> result = auditLogService.getAuditLogsByUser(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUser()).isEqualTo(user);
    }

    @Test
    void getAuditLogsByUser_aucunLog_retourneListeVide() {
        given(auditLogRepository.findByUser(user)).willReturn(Collections.emptyList());

        List<AuditLog> result = auditLogService.getAuditLogsByUser(user);

        assertThat(result).isEmpty();
    }

    // ─── getAuditLogsByAction ─────────────────────────────────────────────────

    @Test
    void getAuditLogsByAction_nominal_retourneLogsAvecCetteAction() {
        given(auditLogRepository.findByAction("CREATE")).willReturn(List.of(auditLog));

        List<AuditLog> result = auditLogService.getAuditLogsByAction("CREATE");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAction()).isEqualTo("CREATE");
    }

    @Test
    void getAuditLogsByAction_actionInconnue_retourneListeVide() {
        given(auditLogRepository.findByAction("UNKNOWN")).willReturn(Collections.emptyList());

        List<AuditLog> result = auditLogService.getAuditLogsByAction("UNKNOWN");

        assertThat(result).isEmpty();
    }

    // ─── getAuditLogsByEntityType ─────────────────────────────────────────────

    @Test
    void getAuditLogsByEntityType_nominal_retourneLogsDeceType() {
        given(auditLogRepository.findByEntityType("Cocktail")).willReturn(List.of(auditLog));

        List<AuditLog> result = auditLogService.getAuditLogsByEntityType("Cocktail");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEntityType()).isEqualTo("Cocktail");
    }

    @Test
    void getAuditLogsByEntityType_typeInconnu_retourneListeVide() {
        given(auditLogRepository.findByEntityType("Inexistant")).willReturn(Collections.emptyList());

        List<AuditLog> result = auditLogService.getAuditLogsByEntityType("Inexistant");

        assertThat(result).isEmpty();
    }

    // ─── getAuditLogsByEntityId ───────────────────────────────────────────────

    @Test
    void getAuditLogsByEntityId_nominal_retourneLogsDeCetteEntite() {
        given(auditLogRepository.findByEntityId(42L)).willReturn(List.of(auditLog));

        List<AuditLog> result = auditLogService.getAuditLogsByEntityId(42L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEntityId()).isEqualTo(42L);
    }

    @Test
    void getAuditLogsByEntityId_entiteInconnue_retourneListeVide() {
        given(auditLogRepository.findByEntityId(999L)).willReturn(Collections.emptyList());

        List<AuditLog> result = auditLogService.getAuditLogsByEntityId(999L);

        assertThat(result).isEmpty();
    }

    // ─── getAuditLogsByDate ───────────────────────────────────────────────────

    @Test
    void getAuditLogsByDate_nominal_retourneLogsEntreDeuxDates() {
        LocalDateTime debut = LocalDateTime.now().minusDays(7);
        LocalDateTime fin = LocalDateTime.now();
        given(auditLogRepository.findByTimestampBetween(debut, fin)).willReturn(List.of(auditLog));

        List<AuditLog> result = auditLogService.getAuditLogsByDate(debut, fin);

        assertThat(result).hasSize(1);
    }

    @Test
    void getAuditLogsByDate_plageVide_retourneListeVide() {
        LocalDateTime debut = LocalDateTime.now().minusDays(1);
        LocalDateTime fin = LocalDateTime.now();
        given(auditLogRepository.findByTimestampBetween(debut, fin)).willReturn(Collections.emptyList());

        List<AuditLog> result = auditLogService.getAuditLogsByDate(debut, fin);

        assertThat(result).isEmpty();
    }

    // ─── getAuditLogsByUserAndDate ────────────────────────────────────────────

    @Test
    void getAuditLogsByUserAndDate_nominal_retourneLogsUtilisateurSurPeriode() {
        LocalDateTime debut = LocalDateTime.now().minusDays(30);
        LocalDateTime fin = LocalDateTime.now();
        given(auditLogRepository.findByUserAndTimestampBetween(user, debut, fin)).willReturn(List.of(auditLog));

        List<AuditLog> result = auditLogService.getAuditLogsByUserAndDate(user, debut, fin);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUser()).isEqualTo(user);
    }

    @Test
    void getAuditLogsByUserAndDate_aucunLogSurPeriode_retourneListeVide() {
        LocalDateTime debut = LocalDateTime.now().minusDays(30);
        LocalDateTime fin = LocalDateTime.now().minusDays(20);
        given(auditLogRepository.findByUserAndTimestampBetween(user, debut, fin)).willReturn(Collections.emptyList());

        List<AuditLog> result = auditLogService.getAuditLogsByUserAndDate(user, debut, fin);

        assertThat(result).isEmpty();
    }
}
