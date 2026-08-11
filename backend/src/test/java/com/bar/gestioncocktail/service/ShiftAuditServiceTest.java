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
}
