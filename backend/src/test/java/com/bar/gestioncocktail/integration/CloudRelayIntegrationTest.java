package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.AppSettingsRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.relay.CloudRelayAccessService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack integration tests verifying Cloud Relay tunnel management, white-label
 * public branding, subdomain host filtering, and configurable universal access policies.
 */
class CloudRelayIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private AppSettingsService appSettingsService;

    @Autowired
    private AppSettingsRepository appSettingsRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CloudRelayAccessService cloudRelayAccessService;

    @Test
    @DisplayName("Cloud Relay full lifecycle: public branding, diagnostics, host check, and configurable user/hardware policy")
    void fullCloudRelayLifecycle() throws Exception {
        String adminToken = getAdminToken();
        String serveurToken = getServeurToken();

        AppSettings settings = appSettingsService.getSettings();
        settings.setEstablishmentName("Le Shaker Integration");
        settings.setVenueSlug("le-shaker-int");
        settings.setCustomDomain("commande.leshaker-int.fr");
        settings.setCloudRelayEnabled(true);
        settings.setCloudRelayClientsEnabled(true);
        settings.setCloudRelayStaffEnabled(true);
        settings.setCloudRelayAdminEnabled(true);
        settings.setCloudRelayRemoteTpeEnabled(false);
        settings.setWifiEnabled(true);
        settings.setWifiSsid("Shaker-Guest-WiFi");
        appSettingsRepository.saveAndFlush(settings);

        // 1. Public branding & health endpoints return white-label metadata
        mockMvc.perform(get("/api/public/branding"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.establishmentName").value("Le Shaker Integration"))
                .andExpect(jsonPath("$.venueSlug").value("le-shaker-int"))
                .andExpect(jsonPath("$.effectivePublicUrl").value("https://commande.leshaker-int.fr"))
                .andExpect(jsonPath("$.wifiSsid").value("Shaker-Guest-WiFi"));

        // 2. Admin connects simulated tunnel and runs diagnostics
        mockMvc.perform(post("/api/admin/cloud-relay/connect")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.connectionState").value("SIMULATED"))
                .andExpect(jsonPath("$.publicUrl").value("https://commande.leshaker-int.fr"));

        mockMvc.perform(post("/api/admin/cloud-relay/test")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 3. Subdomain host validation rejects unknown tenant host with HTTP 421
        String relayToken = cloudRelayAccessService.getInternalTunnelToken();
        mockMvc.perform(get("/api/public/branding")
                        .header(CloudRelayAccessService.HEADER_VIA_RELAY, "true")
                        .header(CloudRelayAccessService.HEADER_RELAY_TOKEN, relayToken)
                        .header(CloudRelayAccessService.HEADER_FORWARDED_HOST, "unknown-bar.open-bar.eu"))
                .andExpect(status().is(421))
                .andExpect(jsonPath("$.errorCode").value("TENANT_HOST_MISMATCH"));

        // 4. Remote TPE dispatch blocked when cloudRelayRemoteTpeEnabled=false
        mockMvc.perform(post("/api/tpe/pay")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken)
                        .header(CloudRelayAccessService.HEADER_VIA_RELAY, "true")
                        .header(CloudRelayAccessService.HEADER_RELAY_TOKEN, relayToken)
                        .header(CloudRelayAccessService.HEADER_FORWARDED_HOST, "le-shaker-int.open-bar.eu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"montant\":12.50,\"terminalRole\":\"BAR\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("RELAY_REMOTE_TPE_DISABLED"));

        // 5. Per-user remoteAccessEnabled=false blocks that user through the tunnel
        User serveur = userRepository.findByUsername("serveur1").orElseThrow();
        serveur.setRemoteAccessEnabled(false);
        userRepository.saveAndFlush(serveur);

        mockMvc.perform(get("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken)
                        .header(CloudRelayAccessService.HEADER_VIA_RELAY, "true")
                        .header(CloudRelayAccessService.HEADER_RELAY_TOKEN, relayToken)
                        .header(CloudRelayAccessService.HEADER_FORWARDED_HOST, "le-shaker-int.open-bar.eu"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("RELAY_USER_ACCESS_DISABLED"));
    }
}
