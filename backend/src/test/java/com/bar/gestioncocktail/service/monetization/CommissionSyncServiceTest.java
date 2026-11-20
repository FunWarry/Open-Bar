package com.bar.gestioncocktail.service.monetization;

import com.bar.gestioncocktail.config.MonetizationProperties;
import com.bar.gestioncocktail.dto.CommissionSyncResultDTO;
import com.bar.gestioncocktail.dto.MonetizationSummaryDTO;
import com.bar.gestioncocktail.dto.MonthlyCommissionProofDTO;
import com.bar.gestioncocktail.model.CardCommissionLedgerEntry;
import com.bar.gestioncocktail.model.CardCommissionStatus;
import com.bar.gestioncocktail.model.CommissionInvoiceStatus;
import com.bar.gestioncocktail.model.TpeMonetizationTier;
import com.bar.gestioncocktail.repository.CardCommissionLedgerRepository;
import com.bar.gestioncocktail.service.LicenseService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CommissionSyncService}.
 */
@ExtendWith(MockitoExtension.class)
class CommissionSyncServiceTest {

    @Mock
    private CommissionLedgerService ledgerService;
    @Mock
    private CardCommissionLedgerRepository ledgerRepository;
    @Mock
    private LicenseService licenseService;
    @Mock
    private HttpClient httpClient;
    @Mock
    private HttpResponse<String> httpResponse;

    private MonetizationProperties properties;
    private CommissionSyncService syncService;
    private MonthlyCommissionProofDTO sampleProof;
    private MonetizationSummaryDTO sampleSummary;

    @BeforeEach
    void setUp() {
        properties = new MonetizationProperties();
        properties.setBillingSyncUrl("https://licensing.open-bar.eu/api/v1/monetization/sync");
        syncService = new CommissionSyncService(
                ledgerService, ledgerRepository, licenseService, properties,
                new ObjectMapper().findAndRegisterModules(), httpClient);

        sampleProof = new MonthlyCommissionProofDTO(
                "2026-11", "73282932000074", Instant.now(),
                new BigDecimal("100.00"), 1L, new BigDecimal("1.30"),
                BigDecimal.ZERO, 0L, BigDecimal.ZERO, new BigDecimal("1.30"),
                "0".repeat(64), "a".repeat(64), true, List.of(),
                "d".repeat(64), "s".repeat(64), "compact"
        );
        sampleSummary = new MonetizationSummaryDTO(
                TpeMonetizationTier.CONCERT_IP_OFFLINE, "2026-11", CommissionInvoiceStatus.PENDING,
                "in_123", new BigDecimal("1.30"), Instant.now().plusSeconds(3600), 1L, false, false, true
        );
    }

    @Test
    @DisplayName("syncNow - marks Option 1 entries synced and updates billing record on 200 OK")
    void syncNow_success_marksSyncedAndUpdatesBilling() throws Exception {
        CardCommissionLedgerEntry entry = new CardCommissionLedgerEntry();
        entry.setId(42L);
        entry.setTier(TpeMonetizationTier.CONCERT_IP_OFFLINE);
        entry.setStatus(CardCommissionStatus.ACCUMULATED);

        when(ledgerRepository.findByBillingPeriodOrderBySequenceNumberAsc("2026-11")).thenReturn(List.of(entry));
        when(ledgerService.exportMonthlyProof(YearMonth.of(2026, 11))).thenReturn(sampleProof);
        when(ledgerService.markEntriesSyncedOnline(List.of(42L))).thenReturn(1);
        when(ledgerService.getSummary()).thenReturn(sampleSummary);
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString()))).thenReturn(httpResponse);
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn("{\"invoiceId\":\"in_123\",\"invoiceStatus\":\"PENDING\",\"pendingAmount\":\"1.30\"}");

        CommissionSyncResultDTO res = syncService.syncNow(YearMonth.of(2026, 11), "admin");

        assertTrue(res.synced());
        assertTrue(res.onlineReachable());
        assertEquals("SUCCESS", res.syncStatus());
        assertEquals(1, res.syncedEntriesCount());
        verify(ledgerService).updateBillingStatus(
                eq("2026-11"), eq("in_123"), eq(CommissionInvoiceStatus.PENDING),
                eq(new BigDecimal("1.30")), any(), eq("SUCCESS"), isNull());
    }

    @Test
    @DisplayName("syncNow - fails open cleanly with OFFLINE status on IOException")
    void syncNow_networkError_failsOpenOffline() throws Exception {
        when(ledgerRepository.findByBillingPeriodOrderBySequenceNumberAsc("2026-11")).thenReturn(List.of());
        when(ledgerService.exportMonthlyProof(YearMonth.of(2026, 11))).thenReturn(sampleProof);
        when(ledgerService.getSummary()).thenReturn(sampleSummary);
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenThrow(new IOException("Connection timed out"));

        CommissionSyncResultDTO res = syncService.syncNow(YearMonth.of(2026, 11), "admin");

        assertFalse(res.synced());
        assertFalse(res.onlineReachable());
        assertEquals("OFFLINE", res.syncStatus());
    }

    @Test
    @DisplayName("syncNow - returns UP_TO_DATE on HTTP 204")
    void syncNow_http204_returnsUpToDate() throws Exception {
        when(ledgerRepository.findByBillingPeriodOrderBySequenceNumberAsc("2026-11")).thenReturn(List.of());
        when(ledgerService.exportMonthlyProof(YearMonth.of(2026, 11))).thenReturn(sampleProof);
        when(ledgerService.getSummary()).thenReturn(sampleSummary);
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString()))).thenReturn(httpResponse);
        when(httpResponse.statusCode()).thenReturn(204);

        CommissionSyncResultDTO res = syncService.syncNow(YearMonth.of(2026, 11), "admin");

        assertFalse(res.synced());
        assertTrue(res.onlineReachable());
        assertEquals("UP_TO_DATE", res.syncStatus());
    }
}
