package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.LicenseActivateRequest;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack integration tests for hybrid DRM licensing, 2-day grace window,
 * HTTP 402 order lock on expiration, and preserved read-only fiscal/audit access.
 */
class LicenseIntegrationTest extends BaseIntegrationTest {

    private static KeyPair integrationEcKeyPair;
    private static String integrationEcPubPem;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Autowired
    private TableRepository tableRepository;

    @BeforeAll
    static void initIntegrationKeyPair() throws Exception {
        KeyPairGenerator ecGen = KeyPairGenerator.getInstance("EC");
        ecGen.initialize(new ECGenParameterSpec("secp256r1"));
        integrationEcKeyPair = ecGen.generateKeyPair();
        String base64 = Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.UTF_8))
                .encodeToString(integrationEcKeyPair.getPublic().getEncoded());
        integrationEcPubPem = "-----BEGIN PUBLIC KEY-----\n" + base64 + "\n-----END PUBLIC KEY-----";
    }

    @DynamicPropertySource
    static void overrideLicensingProperties(DynamicPropertyRegistry registry) {
        registry.add("openbar.licensing.enforced", () -> "true");
        registry.add("openbar.licensing.public-key-pem", () -> integrationEcPubPem);
        registry.add("openbar.licensing.grace-period-days", () -> "2");
    }

    private String signLicenseJwt(Instant expiration, List<String> modules) {
        return Jwts.builder()
                .subject("73282932000074")
                .claim("establishmentId", "73282932000074")
                .claim("plan", "PRO")
                .claim("licensedModules", modules)
                .issuedAt(Date.from(Instant.now().minus(30, ChronoUnit.DAYS)))
                .expiration(Date.from(expiration))
                .signWith(integrationEcKeyPair.getPrivate(), Jwts.SIG.ES256)
                .compact();
    }

    private String buildOrderJson(Long tableId, Long cocktailId) {
        return """
                {
                  "tableId": %d,
                  "items": [
                    { "cocktailId": %d, "quantite": 1, "prixUnitaire": 9.00 }
                  ]
                }
                """.formatted(tableId, cocktailId);
    }

    @Test
    @DisplayName("License lifecycle: active -> 2-day grace -> expired HTTP 402 order lock with read-only invoices/Z-report/audit preserved")
    void licenseLifecycle_enforcesGraceAndExpiredLock() throws Exception {
        TableEntity table = new TableEntity();
        table.setNumero(77);
        table.setCapacite(4);
        table.setZone("Salle");
        table.setOccupee(false);
        table = tableRepository.save(table);

        Cocktail cocktail = new Cocktail();
        cocktail.setNom("License Integration Mojito");
        cocktail.setPrix(new BigDecimal("9.00"));
        cocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        cocktail = cocktailRepository.save(cocktail);

        // 1. SERVEUR cannot access admin license activation (403)
        mockMvc.perform(post("/api/admin/license/activate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LicenseActivateRequest("a.b.c"))))
                .andExpect(status().isForbidden());

        // 2. Activate a license currently inside its 2-day grace window (expired 12h ago)
        String graceToken = signLicenseJwt(Instant.now().minus(12, ChronoUnit.HOURS), List.of("*"));
        mockMvc.perform(post("/api/admin/license/activate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LicenseActivateRequest(graceToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("GRACE_PERIOD"))
                .andExpect(jsonPath("$.orderCreationAllowed").value(true));

        // 3. Order creation succeeds during grace period
        mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buildOrderJson(table.getId(), cocktail.getId())))
                .andExpect(status().isOk());

        // 4. Activate an expired license beyond 2-day grace window (expired 3 days ago)
        String expiredToken = signLicenseJwt(Instant.now().minus(3, ChronoUnit.DAYS), List.of("*"));
        mockMvc.perform(post("/api/admin/license/activate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LicenseActivateRequest(expiredToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRED"))
                .andExpect(jsonPath("$.orderCreationAllowed").value(false));

        // 5. Order creation is locked with HTTP 402 Payment Required
        mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buildOrderJson(table.getId(), cocktail.getId())))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.fieldErrors.code").value("LICENSE_EXPIRED"));

        // 6. Read-only historical invoices, Z-reports, and audit exports remain accessible
        mockMvc.perform(get("/api/factures")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/factures/daily-recap")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/audit-logs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken()))
                .andExpect(status().isOk());

        // 7. Reactivate valid license -> orders unlocked again
        String validToken = signLicenseJwt(Instant.now().plus(30, ChronoUnit.DAYS), List.of("*"));
        mockMvc.perform(post("/api/admin/license/activate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LicenseActivateRequest(validToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VALID"))
                .andExpect(jsonPath("$.orderCreationAllowed").value(true));

        // Cleanup stored license record via DELETE
        mockMvc.perform(delete("/api/admin/license")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken()))
                .andExpect(status().isOk());
    }
}
