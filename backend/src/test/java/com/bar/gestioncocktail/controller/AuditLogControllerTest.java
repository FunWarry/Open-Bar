package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.AuditLogResponseDTO;
import com.bar.gestioncocktail.model.AuditLog;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.service.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuditLogController}.
 */
@ExtendWith(MockitoExtension.class)
class AuditLogControllerTest {

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AuditLogController auditLogController;

    private User user;
    private AuditLog auditLog;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("admin");

        auditLog = new AuditLog();
        auditLog.setId(10L);
        auditLog.setUser(user);
        auditLog.setAction("CREATE_USER");
        auditLog.setEntityType("User");
        auditLog.setEntityId(2L);
        auditLog.setDetails("User bob created");
        auditLog.setIpAddress("127.0.0.1");
        auditLog.setTimestamp(LocalDateTime.now());
    }

    @Test
    @DisplayName("getAllAuditLogs - returns list of AuditLogResponseDTO")
    void getAllAuditLogs_success() {
        when(auditLogService.getAllAuditLogs()).thenReturn(List.of(auditLog));

        ResponseEntity<List<AuditLogResponseDTO>> response = auditLogController.getAllAuditLogs();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull().hasSize(1);
        assertThat(response.getBody().get(0).action()).isEqualTo("CREATE_USER");
    }

    @Test
    @DisplayName("getAuditLogsByUser - returns user logs")
    void getAuditLogsByUser_success() {
        when(auditLogService.getAuditLogsByUser(any(User.class))).thenReturn(List.of(auditLog));

        ResponseEntity<List<AuditLogResponseDTO>> response = auditLogController.getAuditLogsByUser(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull().hasSize(1);
        assertThat(response.getBody().get(0).userUsername()).isEqualTo("admin");
    }

    @Test
    @DisplayName("getAuditLogsByAction - returns logs filtered by action")
    void getAuditLogsByAction_success() {
        when(auditLogService.getAuditLogsByAction("CREATE_USER")).thenReturn(List.of(auditLog));

        ResponseEntity<List<AuditLogResponseDTO>> response = auditLogController.getAuditLogsByAction("CREATE_USER");

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull().hasSize(1);
    }

    @Test
    @DisplayName("getAuditLogsByEntityType - returns logs filtered by entity type")
    void getAuditLogsByEntityType_success() {
        when(auditLogService.getAuditLogsByEntityType("User")).thenReturn(List.of(auditLog));

        ResponseEntity<List<AuditLogResponseDTO>> response = auditLogController.getAuditLogsByEntityType("User");

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull().hasSize(1);
    }

    @Test
    @DisplayName("getAuditLogsByEntityId - returns logs filtered by entity ID")
    void getAuditLogsByEntityId_success() {
        when(auditLogService.getAuditLogsByEntityId(2L)).thenReturn(List.of(auditLog));

        ResponseEntity<List<AuditLogResponseDTO>> response = auditLogController.getAuditLogsByEntityId(2L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull().hasSize(1);
    }

    @Test
    @DisplayName("getAuditLogsByDate - returns logs in date range")
    void getAuditLogsByDate_success() {
        LocalDateTime now = LocalDateTime.now();
        when(auditLogService.getAuditLogsByDate(any(), any())).thenReturn(List.of(auditLog));

        ResponseEntity<List<AuditLogResponseDTO>> response = auditLogController.getAuditLogsByDate(now.minusDays(1), now);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull().hasSize(1);
    }

    @Test
    @DisplayName("getAuditLogsByUserAndDate - returns user logs in date range")
    void getAuditLogsByUserAndDate_success() {
        LocalDateTime now = LocalDateTime.now();
        when(auditLogService.getAuditLogsByUserAndDate(any(User.class), any(), any())).thenReturn(List.of(auditLog));

        ResponseEntity<List<AuditLogResponseDTO>> response = auditLogController.getAuditLogsByUserAndDate(1L, now.minusDays(1), now);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull().hasSize(1);
    }

    @Test
    @DisplayName("logAction - calls auditLogService.logAction")
    void logAction_success() {
        ResponseEntity<Void> response = auditLogController.logAction(1L, "DELETE", "Ingredient", 5L, "Detail text", "10.0.0.1");

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(auditLogService).logAction(any(User.class), eq("DELETE"), eq("Ingredient"), eq(5L), eq("Detail text"), eq("10.0.0.1"));
    }
}
