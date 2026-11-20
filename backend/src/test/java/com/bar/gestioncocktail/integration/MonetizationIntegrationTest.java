package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.model.CardCommissionSource;
import com.bar.gestioncocktail.repository.CardCommissionLedgerRepository;
import com.bar.gestioncocktail.service.monetization.CommissionLedgerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Full-stack Spring Boot + PostgreSQL Testcontainers integration tests for
 * the dual-tier TPE monetization engine, SHA-256 ledger verification,
 * monthly Z-report proof exports, Stripe Terminal Connect tokens, and RBAC.
 */
class MonetizationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private CommissionLedgerService commissionLedgerService;

    @Autowired
    private CardCommissionLedgerRepository ledgerRepository;

    @Test
    @DisplayName("Full monetization flow: record card entries -> verify SHA-256 -> export Z-proof -> RBAC checks")
    void fullMonetizationFlow_success() throws Exception {
        String adminToken = getAdminToken();
        String serveurToken = getServeurToken();

        commissionLedgerService.recordCardSettlement(
                new CommissionLedgerService.CardSettlementRecordCommand(
                        null, null, "FAC-INT-001", "tx-int-concert-1", "AUTH-INT-1", "01",
                        "CB", "************4242", CardCommissionSource.CONCERT_IP_TPE,
                        new BigDecimal("100.00"), "EUR"
                )
        );
        commissionLedgerService.recordCardSettlement(
                new CommissionLedgerService.CardSettlementRecordCommand(
                        null, null, "FAC-INT-002", "pi_int_wisepos_2", "pi_int_wisepos_2", "ST-01",
                        "VISA", "************8888", CardCommissionSource.STRIPE_TERMINAL_CONNECT,
                        new BigDecimal("100.00"), "EUR"
                )
        );

        // Staff (SERVEUR) can inspect lightweight status and request Stripe Terminal ConnectionToken
        mockMvc.perform(get("/api/admin/monetization/status")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeTier", notNullValue()));

        mockMvc.perform(post("/api/tpe/stripe-terminal/connection-token")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.secret", startsWith("pst_test_sim_")))
                .andExpect(jsonPath("$.simulator", is(true)));

        // Staff (SERVEUR) is forbidden from accessing full admin monetization dashboard or sync
        mockMvc.perform(get("/api/admin/monetization/dashboard")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken))
                .andExpect(status().isForbidden());

        // ADMIN accesses full dashboard, verifies SHA-256 chain, and exports signed monthly proof
        mockMvc.perform(get("/api/admin/monetization/dashboard")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.option1Commission", greaterThanOrEqualTo(1.30)))
                .andExpect(jsonPath("$.option3Commission", greaterThanOrEqualTo(0.50)))
                .andExpect(jsonPath("$.integrity.valid", is(true)));

        mockMvc.perform(post("/api/admin/monetization/verify")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(true)))
                .andExpect(jsonPath("$.verifiedEntries", greaterThanOrEqualTo(2)));

        mockMvc.perform(get("/api/admin/monetization/export-proof")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ledgerChainValid", is(true)))
                .andExpect(jsonPath("$.hmacSignature", not(emptyString())))
                .andExpect(jsonPath("$.compactProofToken", not(emptyString())));

        mockMvc.perform(get("/api/admin/monetization/export-proof/download")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("openbar-commission-proof-")));
    }
}
