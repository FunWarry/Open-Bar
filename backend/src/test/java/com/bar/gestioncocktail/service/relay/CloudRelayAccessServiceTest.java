package com.bar.gestioncocktail.service.relay;

import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import com.bar.gestioncocktail.service.relay.CloudRelayAccessService.RelayAccessDecision;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link CloudRelayAccessService} verifying configurable universal access
 * policies across clients, staff roles, individual users, and remote hardware dispatch.
 */
@ExtendWith(MockitoExtension.class)
class CloudRelayAccessServiceTest {

    @Mock
    private AppSettingsService appSettingsService;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private UserRepository userRepository;

    private CloudRelayAccessService accessService;
    private AppSettings settings;
    private User waiter;

    @BeforeEach
    void setUp() {
        accessService = new CloudRelayAccessService(
                appSettingsService,
                establishmentConfigService,
                userRepository,
                new ObjectMapper());

        settings = new AppSettings();
        settings.setCloudRelayEnabled(true);
        settings.setRelayPairingToken("pair-secret-123");
        settings.setCloudRelayClientsEnabled(true);
        settings.setCloudRelayStaffEnabled(true);
        settings.setCloudRelayAdminEnabled(true);
        settings.setCloudRelayRemoteTpeEnabled(true);
        settings.setCloudRelayRemotePrintingEnabled(true);
        settings.setCloudRelayAllowedRolesJson("[\"SERVEUR\",\"BARMAN\",\"MANAGER\",\"ADMIN\"]");

        waiter = new User();
        waiter.setId(10L);
        waiter.setUsername("lucas");
        waiter.setRoles(Set.of(UserRole.SERVEUR));
        waiter.setRemoteAccessEnabled(true);
    }

    @Test
    @DisplayName("isTunnelRequest rejects missing or spoofed internal tokens")
    void rejectsSpoofedTunnelHeaders() {
        when(appSettingsService.getSettings()).thenReturn(settings);

        MockHttpServletRequest noToken = new MockHttpServletRequest("GET", "/api/commandes");
        noToken.addHeader(CloudRelayAccessService.HEADER_VIA_RELAY, "true");
        assertThat(accessService.isTunnelRequest(noToken)).isFalse();

        MockHttpServletRequest wrongToken = new MockHttpServletRequest("GET", "/api/commandes");
        wrongToken.addHeader(CloudRelayAccessService.HEADER_VIA_RELAY, "true");
        wrongToken.addHeader(CloudRelayAccessService.HEADER_RELAY_TOKEN, "wrong-secret");
        assertThat(accessService.isTunnelRequest(wrongToken)).isFalse();

        MockHttpServletRequest validInternal = new MockHttpServletRequest("GET", "/api/commandes");
        validInternal.addHeader(CloudRelayAccessService.HEADER_VIA_RELAY, "true");
        validInternal.addHeader(CloudRelayAccessService.HEADER_RELAY_TOKEN, accessService.getInternalTunnelToken());
        assertThat(accessService.isTunnelRequest(validInternal)).isTrue();
    }

    @Test
    @DisplayName("evaluateRequest allows fallback branding endpoint even when Cloud Relay is disabled")
    void alwaysAllowsFallbackBranding() {
        MockHttpServletRequest request = tunnelRequest("GET", "/api/public/branding");
        RelayAccessDecision decision = accessService.evaluateRequest(request, null);
        assertThat(decision.allowed()).isTrue();
    }

    @Test
    @DisplayName("evaluateRequest returns 503 CLOUD_RELAY_OFFLINE when tunnel is disabled")
    void returns503WhenTunnelDisabled() {
        settings.setCloudRelayEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(settings);
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)).thenReturn(true);

        MockHttpServletRequest request = tunnelRequest("GET", "/api/public/tables/1/session");
        RelayAccessDecision decision = accessService.evaluateRequest(request, null);

        assertThat(decision.allowed()).isFalse();
        assertThat(decision.statusCode()).isEqualTo(503);
        assertThat(decision.errorCode()).isEqualTo("CLOUD_RELAY_OFFLINE");
    }

    @Test
    @DisplayName("evaluateRequest enforces client access toggle independently from staff")
    void enforcesPatronClientToggle() {
        settings.setCloudRelayClientsEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(settings);
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)).thenReturn(true);

        RelayAccessDecision decision = accessService.evaluateRequest(
                tunnelRequest("POST", "/api/public/commandes"), null);

        assertThat(decision.allowed()).isFalse();
        assertThat(decision.statusCode()).isEqualTo(403);
        assertThat(decision.errorCode()).isEqualTo("RELAY_CLIENT_ACCESS_DISABLED");
    }

    @Test
    @DisplayName("evaluateRequest enforces per-user remoteAccessEnabled and allowedRoles")
    void enforcesPerUserAndPerRoleAccess() {
        when(appSettingsService.getSettings()).thenReturn(settings);
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)).thenReturn(true);
        when(userRepository.findByUsername("lucas")).thenReturn(Optional.of(waiter));

        Authentication auth = new UsernamePasswordAuthenticationToken("lucas", "pwd", List.of());

        assertThat(accessService.evaluateRequest(tunnelRequest("POST", "/api/commandes"), auth).allowed()).isTrue();

        waiter.setRemoteAccessEnabled(false);
        RelayAccessDecision userDisabled = accessService.evaluateRequest(
                tunnelRequest("POST", "/api/commandes"), auth);
        assertThat(userDisabled.allowed()).isFalse();
        assertThat(userDisabled.errorCode()).isEqualTo("RELAY_USER_ACCESS_DISABLED");

        waiter.setRemoteAccessEnabled(true);
        settings.setCloudRelayAllowedRolesJson("[\"MANAGER\",\"ADMIN\"]");
        RelayAccessDecision roleDenied = accessService.evaluateRequest(
                tunnelRequest("POST", "/api/commandes"), auth);
        assertThat(roleDenied.allowed()).isFalse();
        assertThat(roleDenied.errorCode()).isEqualTo("RELAY_ROLE_ACCESS_DISABLED");
    }

    @Test
    @DisplayName("evaluateRequest enforces configurable remote TPE and printing hardware policies")
    void enforcesRemoteTpeAndPrintingPolicies() {
        settings.setCloudRelayRemoteTpeEnabled(false);
        settings.setCloudRelayRemotePrintingEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(settings);
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)).thenReturn(true);

        Authentication auth = new UsernamePasswordAuthenticationToken("lucas", "pwd", List.of());

        RelayAccessDecision tpeBlocked = accessService.evaluateRequest(
                tunnelRequest("POST", "/api/tpe/pay"), auth);
        assertThat(tpeBlocked.allowed()).isFalse();
        assertThat(tpeBlocked.errorCode()).isEqualTo("RELAY_REMOTE_TPE_DISABLED");

        RelayAccessDecision printBlocked = accessService.evaluateRequest(
                tunnelRequest("POST", "/api/printers/dispatch/1"), auth);
        assertThat(printBlocked.allowed()).isFalse();
        assertThat(printBlocked.errorCode()).isEqualTo("RELAY_REMOTE_PRINTING_DISABLED");
    }

    @Test
    @DisplayName("assertLoginAllowedIfTunnel blocks login when user remoteAccessEnabled is false")
    void blocksLoginViaTunnelWhenUserDisabled() {
        when(appSettingsService.getSettings()).thenReturn(settings);
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)).thenReturn(true);
        waiter.setRemoteAccessEnabled(false);

        MockHttpServletRequest req = tunnelRequest("POST", "/api/auth/login");
        assertThatThrownBy(() -> accessService.assertLoginAllowedIfTunnel(req, waiter))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("disabled for your user account");
    }

    private MockHttpServletRequest tunnelRequest(String method, String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.addHeader(CloudRelayAccessService.HEADER_VIA_RELAY, "true");
        request.addHeader(CloudRelayAccessService.HEADER_RELAY_TOKEN, accessService.getInternalTunnelToken());
        return request;
    }
}
