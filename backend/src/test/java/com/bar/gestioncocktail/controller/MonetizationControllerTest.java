package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CommissionSyncResultDTO;
import com.bar.gestioncocktail.dto.CommissionTierRatesDTO;
import com.bar.gestioncocktail.dto.LedgerVerificationDTO;
import com.bar.gestioncocktail.dto.MonetizationDashboardDTO;
import com.bar.gestioncocktail.dto.MonetizationSummaryDTO;
import com.bar.gestioncocktail.dto.MonthlyCommissionProofDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.CommissionInvoiceStatus;
import com.bar.gestioncocktail.model.TpeMonetizationTier;
import com.bar.gestioncocktail.repository.CardCommissionLedgerRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.AuditLogService;
import com.bar.gestioncocktail.service.monetization.CommissionLedgerService;
import com.bar.gestioncocktail.service.monetization.CommissionSyncService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link MonetizationController}.
 */
@ExtendWith(MockitoExtension.class)
class MonetizationControllerTest {

    @Mock
    private CommissionLedgerService ledgerService;
    @Mock
    private CommissionSyncService syncService;
    @Mock
    private CardCommissionLedgerRepository ledgerRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private HttpServletRequest httpRequest;

    private MonetizationController controller;

    @BeforeEach
    void setUp() {
        controller = new MonetizationController(
                ledgerService, syncService, ledgerRepository, auditLogService,
                userRepository, new ObjectMapper().findAndRegisterModules());
    }

    @Test
    @DisplayName("getSummary - returns lightweight monetization summary")
    void getSummary_returnsSummary() {
        MonetizationSummaryDTO summary = new MonetizationSummaryDTO(
                TpeMonetizationTier.CONCERT_IP_OFFLINE, "2026-11", CommissionInvoiceStatus.NONE,
                null, BigDecimal.ZERO, null, 0L, false, false, false);
        when(ledgerService.getSummary()).thenReturn(summary);

        ResponseEntity<MonetizationSummaryDTO> response = controller.getSummary();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(TpeMonetizationTier.CONCERT_IP_OFFLINE, response.getBody().activeTier());
    }

    @Test
    @DisplayName("getDashboard - rejects invalid YYYY-MM period with BusinessException")
    void getDashboard_invalidPeriod_throwsBusinessException() {
        assertThrows(BusinessException.class, () -> controller.getDashboard("2026/11"));
    }

    @Test
    @DisplayName("getDashboard - delegates valid period and returns full dashboard")
    void getDashboard_validPeriod_returnsDashboard() {
        CommissionTierRatesDTO rates = new CommissionTierRatesDTO(
                TpeMonetizationTier.CONCERT_IP_OFFLINE, 120, 10, 45, 5, "CONCERT_IP", true, false);
        MonetizationSummaryDTO summary = new MonetizationSummaryDTO(
                TpeMonetizationTier.CONCERT_IP_OFFLINE, "2026-11", CommissionInvoiceStatus.NONE,
                null, BigDecimal.ZERO, null, 0L, false, false, false);
        LedgerVerificationDTO integrity = new LedgerVerificationDTO(true, 1L, 1L, "abc", null, "OK");
        MonetizationDashboardDTO dashboard = new MonetizationDashboardDTO(
                "2026-11", "73282932000074", rates, summary,
                new BigDecimal("100.00"), 1L, new BigDecimal("1.30"),
                BigDecimal.ZERO, 0L, BigDecimal.ZERO, new BigDecimal("1.30"),
                null, "NONE", null, null, integrity, List.of(), List.of());

        when(ledgerService.getDashboard(YearMonth.of(2026, 11))).thenReturn(dashboard);

        ResponseEntity<MonetizationDashboardDTO> response = controller.getDashboard("2026-11");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("2026-11", response.getBody().billingPeriod());
    }

    @Test
    @DisplayName("downloadMonthlyProof - returns JSON attachment headers and serialized proof")
    void downloadMonthlyProof_returnsAttachment() {
        MonthlyCommissionProofDTO proof = new MonthlyCommissionProofDTO(
                "2026-11", "73282932000074", Instant.now(),
                new BigDecimal("50.00"), 1L, new BigDecimal("0.70"),
                BigDecimal.ZERO, 0L, BigDecimal.ZERO, new BigDecimal("0.70"),
                "0".repeat(64), "b".repeat(64), true, List.of(),
                "d".repeat(64), "h".repeat(64), "tok");
        when(ledgerService.exportMonthlyProof(YearMonth.of(2026, 11))).thenReturn(proof);

        ResponseEntity<byte[]> response = controller.downloadMonthlyProof("2026-11", httpRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getHeaders().getFirst("Content-Disposition")
                .contains("openbar-commission-proof-2026-11.json"));
        assertTrue(response.getBody().length > 0);
        verify(auditLogService).logAction(any(), eq("DOWNLOAD_MONTHLY_COMMISSION_PROOF"), any(), eq(1L), any(), any());
    }

    @Test
    @DisplayName("syncOnline - delegates to CommissionSyncService and logs audit action")
    void syncOnline_delegatesAndLogs() {
        MonetizationSummaryDTO summary = new MonetizationSummaryDTO(
                TpeMonetizationTier.CONCERT_IP_OFFLINE, "2026-11", CommissionInvoiceStatus.PENDING,
                "in_1", new BigDecimal("2.00"), null, 0L, false, false, true);
        when(syncService.syncNow(eq(YearMonth.of(2026, 11)), any()))
                .thenReturn(new CommissionSyncResultDTO(true, true, "SUCCESS", 2, "Synced", summary));

        ResponseEntity<CommissionSyncResultDTO> response = controller.syncOnline("2026-11", httpRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("SUCCESS", response.getBody().syncStatus());
        verify(auditLogService).logAction(any(), eq("SYNC_COMMISSION_LEDGER"), any(), eq(1L), any(), any());
    }
}
