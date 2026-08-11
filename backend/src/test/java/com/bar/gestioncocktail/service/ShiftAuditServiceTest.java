package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EmployeeShiftResponseDTO;
import com.bar.gestioncocktail.dto.ShiftAuditLogDTO;
import com.bar.gestioncocktail.model.EmployeeShift;
import com.bar.gestioncocktail.model.ShiftAuditAction;
import com.bar.gestioncocktail.model.ShiftAuditLog;
import com.bar.gestioncocktail.model.TypePoste;
import com.bar.gestioncocktail.model.TypeShift;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.EmployeeShiftRepository;
import com.bar.gestioncocktail.repository.ShiftAuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShiftAuditServiceTest {

    @Mock
    private ShiftAuditLogRepository auditLogRepository;

    @Mock
    private EmployeeShiftRepository shiftRepository;

    @Mock
    private TimeService timeService;

    private ShiftAuditService auditService;

    private User sampleUser;
    private EmployeeShift sampleShift;
    private final LocalDateTime fixedNow = LocalDateTime.of(2026, 8, 11, 10, 0, 0);

    @BeforeEach
    void setUp() {
        auditService = new ShiftAuditService(auditLogRepository, shiftRepository, timeService);

        sampleUser = new User();
        sampleUser.setId(10L);
        sampleUser.setUsername("serveur1");
        sampleUser.setPrenom("Alice");
        sampleUser.setNom("Martin");

        sampleShift = new EmployeeShift();
        sampleShift.setId(100L);
        sampleShift.setUser(sampleUser);
        sampleShift.setDateShift(LocalDate.of(2026, 8, 12));
        sampleShift.setTypeShift(TypeShift.SOIR);
        sampleShift.setTypePoste(TypePoste.SERVEUR);
        sampleShift.setHeureDebut("17:00");
        sampleShift.setHeureFin("01:00");
        sampleShift.setHeuresEffectuees(new BigDecimal("8.0"));
    }

    @Test
    @DisplayName("logCreation should record CREATED audit entry with new snapshot")
    void logCreation_shouldSaveCreatedLog() {
        when(timeService.now()).thenReturn(fixedNow);
        when(auditLogRepository.save(any(ShiftAuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShiftAuditLog saved = auditService.logCreation(sampleShift, "manager1");

        assertThat(saved).isNotNull();
        assertThat(saved.getShiftId()).isEqualTo(100L);
        assertThat(saved.getAction()).isEqualTo(ShiftAuditAction.CREATED);
        assertThat(saved.getChangedBy()).isEqualTo("manager1");
        assertThat(saved.getChangedAt()).isEqualTo(fixedNow);
        assertThat(saved.getPreviousSnapshot()).isNull();
        assertThat(saved.getNewSnapshot()).contains("\"id\":100").contains("\"typeShift\":\"SOIR\"");

        verify(auditLogRepository).save(any(ShiftAuditLog.class));
    }

    @Test
    @DisplayName("logUpdate should record UPDATED audit entry with previous and new snapshots")
    void logUpdate_shouldSaveUpdatedLog() {
        when(timeService.now()).thenReturn(fixedNow);
        when(auditLogRepository.save(any(ShiftAuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String prevJson = "{\"id\":100,\"heureDebut\":\"16:00\"}";
        String newJson = "{\"id\":100,\"heureDebut\":\"17:00\"}";

        ShiftAuditLog saved = auditService.logUpdate(sampleShift, prevJson, newJson, "manager1");

        assertThat(saved).isNotNull();
        assertThat(saved.getAction()).isEqualTo(ShiftAuditAction.UPDATED);
        assertThat(saved.getPreviousSnapshot()).isEqualTo(prevJson);
        assertThat(saved.getNewSnapshot()).isEqualTo(newJson);
    }

    @Test
    @DisplayName("logDeletion should record DELETED audit entry with previous snapshot and null new snapshot")
    void logDeletion_shouldSaveDeletedLog() {
        when(timeService.now()).thenReturn(fixedNow);
        when(auditLogRepository.save(any(ShiftAuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String prevJson = "{\"id\":100,\"heureDebut\":\"17:00\"}";

        ShiftAuditLog saved = auditService.logDeletion(sampleShift, prevJson, "admin1");

        assertThat(saved).isNotNull();
        assertThat(saved.getAction()).isEqualTo(ShiftAuditAction.DELETED);
        assertThat(saved.getPreviousSnapshot()).isEqualTo(prevJson);
        assertThat(saved.getNewSnapshot()).isNull();
    }

    @Test
    @DisplayName("getHistoryForShift should return mapped DTOs in descending order")
    void getHistoryForShift_shouldReturnDtos() {
        ShiftAuditLog log1 = ShiftAuditLog.builder()
                .shiftId(100L)
                .user(sampleUser)
                .dateShift(LocalDate.of(2026, 8, 12))
                .action(ShiftAuditAction.CREATED)
                .changedBy("manager1")
                .changedAt(fixedNow)
                .newSnapshot("{\"id\":100}")
                .build();

        when(auditLogRepository.findByShiftIdOrderByChangedAtDesc(100L)).thenReturn(List.of(log1));

        List<ShiftAuditLogDTO> history = auditService.getHistoryForShift(100L);

        assertThat(history).hasSize(1);
        assertThat(history.get(0).shiftId()).isEqualTo(100L);
        assertThat(history.get(0).action()).isEqualTo(ShiftAuditAction.CREATED);
    }

    @Test
    @DisplayName("getAuditLogForWeek with and without userId filter")
    void getAuditLogForWeek_shouldFilterCorrectly() {
        LocalDate monday = LocalDate.of(2026, 8, 10);
        LocalDate sunday = LocalDate.of(2026, 8, 16);

        ShiftAuditLog log1 = ShiftAuditLog.builder()
                .shiftId(100L)
                .user(sampleUser)
                .dateShift(LocalDate.of(2026, 8, 12))
                .action(ShiftAuditAction.CREATED)
                .changedBy("manager1")
                .changedAt(fixedNow)
                .newSnapshot("{\"id\":100}")
                .build();

        when(auditLogRepository.findByDateShiftBetweenOrderByChangedAtDesc(monday, sunday))
                .thenReturn(List.of(log1));

        List<ShiftAuditLogDTO> allLogs = auditService.getAuditLogForWeek(monday, null);
        assertThat(allLogs).hasSize(1);

        when(auditLogRepository.findByDateShiftBetweenAndUserIdOrderByChangedAtDesc(monday, sunday, 10L))
                .thenReturn(List.of(log1));

        List<ShiftAuditLogDTO> userLogs = auditService.getAuditLogForWeek(monday, 10L);
        assertThat(userLogs).hasSize(1);
    }

    @Test
    @DisplayName("reconstructScheduleAt should accurately replay shifts based on audit logs and omit deleted shifts")
    void reconstructScheduleAt_shouldDeterministicReplay() {
        LocalDate monday = LocalDate.of(2026, 8, 10);
        LocalDate sunday = LocalDate.of(2026, 8, 16);
        LocalDateTime targetTime = LocalDateTime.of(2026, 8, 11, 14, 0, 0);

        String snapshotShift1 = """
                {"id":100,"userId":10,"userName":"Martin","userPrenom":"Alice","dateShift":"2026-08-12","typeShift":"SOIR","typePoste":"SERVEUR","heureDebut":"17:00","heureFin":"01:00"}
                """;

        ShiftAuditLog audit1 = ShiftAuditLog.builder()
                .shiftId(100L)
                .user(sampleUser)
                .dateShift(LocalDate.of(2026, 8, 12))
                .action(ShiftAuditAction.CREATED)
                .changedBy("manager1")
                .changedAt(LocalDateTime.of(2026, 8, 11, 9, 0, 0))
                .newSnapshot(snapshotShift1)
                .build();

        ShiftAuditLog audit2Deleted = ShiftAuditLog.builder()
                .shiftId(101L)
                .user(sampleUser)
                .dateShift(LocalDate.of(2026, 8, 13))
                .action(ShiftAuditAction.DELETED)
                .changedBy("manager1")
                .changedAt(LocalDateTime.of(2026, 8, 11, 10, 0, 0))
                .previousSnapshot("{\"id\":101}")
                .newSnapshot(null)
                .build();

        when(auditLogRepository.findByDateShiftBetweenAndChangedAtLessThanEqualOrderByChangedAtAsc(monday, sunday, targetTime))
                .thenReturn(List.of(audit1, audit2Deleted));
        when(shiftRepository.findByDateShiftBetween(monday, sunday))
                .thenReturn(List.of());

        List<EmployeeShiftResponseDTO> reconstructed = auditService.reconstructScheduleAt(monday, targetTime);

        assertThat(reconstructed).hasSize(1);
        assertThat(reconstructed.get(0).id()).isEqualTo(100L);
        assertThat(reconstructed.get(0).heureDebut()).isEqualTo("17:00");
    }

    @Test
    @DisplayName("logCreation should throw NullPointerException when shift is null")
    void logCreation_withNullShift_shouldThrow() {
        assertThatNullPointerException()
                .isThrownBy(() -> auditService.logCreation(null, "manager1"))
                .withMessage("shift must not be null");
    }

    @Test
    @DisplayName("logUpdate should throw NullPointerException when shift is null")
    void logUpdate_withNullShift_shouldThrow() {
        assertThatNullPointerException()
                .isThrownBy(() -> auditService.logUpdate(null, "{}", "{}", "manager1"))
                .withMessage("shift must not be null");
    }

    @Test
    @DisplayName("logDeletion should throw NullPointerException when shift is null")
    void logDeletion_withNullShift_shouldThrow() {
        assertThatNullPointerException()
                .isThrownBy(() -> auditService.logDeletion(null, "{}", "manager1"))
                .withMessage("shift must not be null");
    }

    @Test
    @DisplayName("logCreation with null username should fall back to SYSTEM as changedBy")
    void logCreation_withNullUsername_shouldFallbackToSystem() {
        when(timeService.now()).thenReturn(fixedNow);
        when(auditLogRepository.save(any(ShiftAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        ShiftAuditLog saved = auditService.logCreation(sampleShift, null);
        assertThat(saved.getChangedBy()).isEqualTo("SYSTEM");
    }

    @Test
    @DisplayName("logCreation with blank username should fall back to SYSTEM as changedBy")
    void logCreation_withBlankUsername_shouldFallbackToSystem() {
        when(timeService.now()).thenReturn(fixedNow);
        when(auditLogRepository.save(any(ShiftAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        ShiftAuditLog saved = auditService.logCreation(sampleShift, "   ");
        assertThat(saved.getChangedBy()).isEqualTo("SYSTEM");
    }

    @Test
    @DisplayName("getAuditLogForWeek with null week should default to current week's Monday")
    void getAuditLogForWeek_withNullWeek_shouldUseCurrentWeek() {
        LocalDate today = LocalDate.of(2026, 8, 11);
        when(timeService.today()).thenReturn(today);

        LocalDate monday = LocalDate.of(2026, 8, 10);
        LocalDate sunday = LocalDate.of(2026, 8, 16);

        when(auditLogRepository.findByDateShiftBetweenOrderByChangedAtDesc(monday, sunday))
                .thenReturn(List.of());

        List<ShiftAuditLogDTO> result = auditService.getAuditLogForWeek(null, null);
        assertThat(result).isEmpty();
        verify(auditLogRepository).findByDateShiftBetweenOrderByChangedAtDesc(monday, sunday);
    }

    @Test
    @DisplayName("reconstructScheduleAt with null week and null at should default to today and now")
    void reconstructScheduleAt_withNullWeekAndAt_shouldUseDefaults() {
        LocalDate today = LocalDate.of(2026, 8, 11);
        when(timeService.today()).thenReturn(today);
        when(timeService.now()).thenReturn(fixedNow);

        LocalDate monday = LocalDate.of(2026, 8, 10);
        LocalDate sunday = LocalDate.of(2026, 8, 16);

        when(auditLogRepository.findByDateShiftBetweenAndChangedAtLessThanEqualOrderByChangedAtAsc(
                monday, sunday, fixedNow))
                .thenReturn(List.of());
        when(shiftRepository.findByDateShiftBetween(monday, sunday)).thenReturn(List.of());

        List<EmployeeShiftResponseDTO> result = auditService.reconstructScheduleAt(null, null);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("reconstructScheduleAt should include legacy shift created before targetTime")
    void reconstructScheduleAt_legacyShift_createdBeforeTarget_shouldBeIncluded() {
        LocalDate monday = LocalDate.of(2026, 8, 10);
        LocalDate sunday = LocalDate.of(2026, 8, 16);
        LocalDateTime targetTime = LocalDateTime.of(2026, 8, 11, 14, 0, 0);

        EmployeeShift legacyShift = new EmployeeShift();
        legacyShift.setId(200L);
        legacyShift.setUser(sampleUser);
        legacyShift.setDateShift(LocalDate.of(2026, 8, 12));
        legacyShift.setTypeShift(TypeShift.MATIN);
        legacyShift.setTypePoste(TypePoste.SERVEUR);
        legacyShift.setCreatedAt(LocalDateTime.of(2026, 8, 10, 8, 0, 0)); // before target

        when(auditLogRepository.findByDateShiftBetweenAndChangedAtLessThanEqualOrderByChangedAtAsc(monday, sunday, targetTime))
                .thenReturn(List.of());
        when(shiftRepository.findByDateShiftBetween(monday, sunday)).thenReturn(List.of(legacyShift));

        List<EmployeeShiftResponseDTO> result = auditService.reconstructScheduleAt(monday, targetTime);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(200L);
    }

    @Test
    @DisplayName("reconstructScheduleAt should exclude legacy shift created after targetTime")
    void reconstructScheduleAt_legacyShift_createdAfterTarget_shouldBeExcluded() {
        LocalDate monday = LocalDate.of(2026, 8, 10);
        LocalDate sunday = LocalDate.of(2026, 8, 16);
        LocalDateTime targetTime = LocalDateTime.of(2026, 8, 11, 14, 0, 0);

        EmployeeShift futureShift = new EmployeeShift();
        futureShift.setId(201L);
        futureShift.setUser(sampleUser);
        futureShift.setDateShift(LocalDate.of(2026, 8, 12));
        futureShift.setTypeShift(TypeShift.SOIR);
        futureShift.setTypePoste(TypePoste.SERVEUR);
        futureShift.setCreatedAt(LocalDateTime.of(2026, 8, 11, 15, 0, 0)); // after target

        when(auditLogRepository.findByDateShiftBetweenAndChangedAtLessThanEqualOrderByChangedAtAsc(monday, sunday, targetTime))
                .thenReturn(List.of());
        when(shiftRepository.findByDateShiftBetween(monday, sunday)).thenReturn(List.of(futureShift));

        List<EmployeeShiftResponseDTO> result = auditService.reconstructScheduleAt(monday, targetTime);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("toJson should return null when dto is null")
    void toJson_withNullDto_shouldReturnNull() {
        assertThat(auditService.toJson(null)).isNull();
    }

    @Test
    @DisplayName("fromJson should return null when json is null or blank")
    void fromJson_withNullOrBlankJson_shouldReturnNull() {
        assertThat(auditService.fromJson(null)).isNull();
        assertThat(auditService.fromJson("")).isNull();
        assertThat(auditService.fromJson("   ")).isNull();
    }

    @Test
    @DisplayName("fromJson should return null when json is malformed")
    void fromJson_withMalformedJson_shouldReturnNull() {
        assertThat(auditService.fromJson("not-valid-json")).isNull();
    }
}
