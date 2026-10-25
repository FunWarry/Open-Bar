package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.SafetyAlertRequestDTO;
import com.bar.gestioncocktail.dto.SafetyAlertResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EstablishmentConfig;
import com.bar.gestioncocktail.model.SafetyAlert;
import com.bar.gestioncocktail.model.SafetyAlertStatus;
import com.bar.gestioncocktail.model.SafetyAlertType;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.SafetyAlertRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link SafetyAlertService} verifying Angel Shot safety alert creation,
 * rate limiting, module toggling, resolution, and queries.
 */
@ExtendWith(MockitoExtension.class)
class SafetyAlertServiceTest {

    @Mock
    private SafetyAlertRepository safetyAlertRepository;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private SafetyAlertService safetyAlertService;

    private TableEntity table;
    private EstablishmentConfig config;

    @BeforeEach
    void setUp() {
        table = new TableEntity();
        table.setId(10L);
        table.setNumero(4);

        config = new EstablishmentConfig();
        config.setModuleAngelShotSafetyEnabled(true);
    }

    @Test
    @DisplayName("Should successfully create active safety alert and broadcast WebSocket notification")
    void shouldCreateSafetyAlertSuccessfully() {
        when(establishmentConfigService.getConfig()).thenReturn(config);
        when(tableRepository.findById(10L)).thenReturn(Optional.of(table));
        when(safetyAlertRepository.findRecentAlertsForTable(eq(10L), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        when(safetyAlertRepository.save(any(SafetyAlert.class))).thenAnswer(invocation -> {
            SafetyAlert saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });

        SafetyAlertRequestDTO request = new SafetyAlertRequestDTO(
                SafetyAlertType.ANGEL_SHOT_LIME,
                "Patron feels unsafe, individual refuses to leave table"
        );

        SafetyAlertResponseDTO response = safetyAlertService.createAlert(10L, request);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals(10L, response.tableId());
        assertEquals(4, response.tableNumero());
        assertEquals(SafetyAlertType.ANGEL_SHOT_LIME, response.type());
        assertEquals(SafetyAlertStatus.ACTIVE, response.status());
        assertEquals("Patron feels unsafe, individual refuses to leave table", response.comment());

        verify(notificationService).notifierNouvelleAlerteSecurite(any(SafetyAlertResponseDTO.class));
    }

    @Test
    @DisplayName("Should throw BusinessException when Angel Shot safety module is disabled")
    void shouldThrowExceptionWhenModuleDisabled() {
        config.setModuleAngelShotSafetyEnabled(false);
        when(establishmentConfigService.getConfig()).thenReturn(config);

        SafetyAlertRequestDTO request = new SafetyAlertRequestDTO(
                SafetyAlertType.ANGEL_SHOT_NEAT,
                null
        );

        BusinessException exception = assertThrows(BusinessException.class, () ->
                safetyAlertService.createAlert(10L, request)
        );

        assertTrue(exception.getMessage().contains("Angel Shot safety protocol is currently disabled"));
        verifyNoInteractions(safetyAlertRepository);
        verifyNoInteractions(notificationService);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when table is not found")
    void shouldThrowExceptionWhenTableNotFound() {
        when(establishmentConfigService.getConfig()).thenReturn(config);
        when(tableRepository.findById(999L)).thenReturn(Optional.empty());

        SafetyAlertRequestDTO request = new SafetyAlertRequestDTO(
                SafetyAlertType.ANGEL_SHOT_ICE,
                null
        );

        assertThrows(ResourceNotFoundException.class, () ->
                safetyAlertService.createAlert(999L, request)
        );

        verifyNoInteractions(safetyAlertRepository);
    }

    @Test
    @DisplayName("Should reuse existing active alert when table triggered an alert within cooldown period")
    void shouldReuseExistingActiveAlertWhenWithinCooldown() {
        SafetyAlert existing = new SafetyAlert(table, SafetyAlertType.ANGEL_SHOT_NEAT, "First alert");
        existing.setId(77L);
        existing.setStatus(SafetyAlertStatus.ACTIVE);

        when(establishmentConfigService.getConfig()).thenReturn(config);
        when(tableRepository.findById(10L)).thenReturn(Optional.of(table));
        when(safetyAlertRepository.findRecentAlertsForTable(eq(10L), any(LocalDateTime.class)))
                .thenReturn(List.of(existing));

        SafetyAlertRequestDTO request = new SafetyAlertRequestDTO(
                SafetyAlertType.ANGEL_SHOT_NEAT,
                "Second alert"
        );

        SafetyAlertResponseDTO response = safetyAlertService.createAlert(10L, request);

        assertNotNull(response);
        assertEquals(77L, response.id());
        verify(safetyAlertRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    @Test
    @DisplayName("Should mark active alert as resolved and notify staff via WebSocket")
    void shouldResolveActiveAlertSuccessfully() {
        SafetyAlert alert = new SafetyAlert(
                table,
                SafetyAlertType.ANGEL_SHOT_ICE,
                "Needs taxi"
        );
        alert.setId(42L);
        alert.setStatus(SafetyAlertStatus.ACTIVE);

        when(safetyAlertRepository.findById(42L)).thenReturn(Optional.of(alert));
        when(safetyAlertRepository.save(any(SafetyAlert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SafetyAlertResponseDTO response = safetyAlertService.resolveAlert(42L, "Alex (Bartender)");

        assertNotNull(response);
        assertEquals(SafetyAlertStatus.RESOLVED, response.status());
        assertEquals("Alex (Bartender)", response.resolvedBy());
        assertNotNull(response.resolvedAt());

        verify(notificationService).notifierAlerteSecuriteResolue(any(SafetyAlertResponseDTO.class));
    }

    @Test
    @DisplayName("Should use fallback staff identifier when resolve request provides null or blank name")
    void shouldResolveAlertWithDefaultStaffName() {
        SafetyAlert alert = new SafetyAlert(
                table,
                SafetyAlertType.ANGEL_SHOT_NEAT,
                null
        );
        alert.setId(55L);
        alert.setStatus(SafetyAlertStatus.ACTIVE);

        when(safetyAlertRepository.findById(55L)).thenReturn(Optional.of(alert));
        when(safetyAlertRepository.save(any(SafetyAlert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SafetyAlertResponseDTO response = safetyAlertService.resolveAlert(55L, "   ");

        assertNotNull(response);
        assertEquals("Staff", response.resolvedBy());
        assertEquals(SafetyAlertStatus.RESOLVED, response.status());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when resolving non-existent alert")
    void shouldThrowExceptionWhenResolvingNonExistentAlert() {
        when(safetyAlertRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                safetyAlertService.resolveAlert(999L, "Staff")
        );
    }

    @Test
    @DisplayName("Should query all currently active safety alerts")
    void shouldReturnActiveAlerts() {
        SafetyAlert a1 = new SafetyAlert(table, SafetyAlertType.ANGEL_SHOT_NEAT, null);
        a1.setId(1L);
        SafetyAlert a2 = new SafetyAlert(table, SafetyAlertType.ANGEL_SHOT_LIME, null);
        a2.setId(2L);

        when(safetyAlertRepository.findByStatusOrderByCreatedAtDesc(SafetyAlertStatus.ACTIVE))
                .thenReturn(List.of(a1, a2));

        List<SafetyAlertResponseDTO> active = safetyAlertService.getActiveAlerts();

        assertEquals(2, active.size());
        assertEquals(1L, active.get(0).id());
        assertEquals(2L, active.get(1).id());
    }

    @Test
    @DisplayName("Should query active alerts for a specific table")
    void shouldReturnActiveAlertsForTable() {
        SafetyAlert a1 = new SafetyAlert(table, SafetyAlertType.ANGEL_SHOT_ICE, null);
        a1.setId(5L);

        when(safetyAlertRepository.findByTableIdAndStatus(10L, SafetyAlertStatus.ACTIVE))
                .thenReturn(List.of(a1));

        List<SafetyAlertResponseDTO> tableAlerts = safetyAlertService.getActiveAlertsForTable(10L);

        assertEquals(1, tableAlerts.size());
        assertEquals(5L, tableAlerts.get(0).id());
    }
}
