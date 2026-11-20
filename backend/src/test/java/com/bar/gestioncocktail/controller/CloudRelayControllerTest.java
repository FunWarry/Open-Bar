package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.relay.CloudRelayDiagnosticDTO;
import com.bar.gestioncocktail.dto.relay.CloudRelayStatusDTO;
import com.bar.gestioncocktail.model.RelayConnectionState;
import com.bar.gestioncocktail.service.relay.CloudRelayTunnelService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link CloudRelayController}.
 */
@ExtendWith(MockitoExtension.class)
class CloudRelayControllerTest {

    @Mock
    private CloudRelayTunnelService tunnelService;

    @InjectMocks
    private CloudRelayController controller;

    private CloudRelayStatusDTO sampleStatus(RelayConnectionState state) {
        return new CloudRelayStatusDTO(
                true, true, state, "le-shaker", null, "open-bar.eu",
                "https://le-shaker.open-bar.eu", "wss://relay.open-bar.eu/ws/tunnel",
                true, Instant.now(), Instant.now(), null, 0, 0L, 0, 5L, 12L, 18L,
                true, true, true, true, true, true, List.of("SERVEUR", "BARMAN", "MANAGER", "ADMIN"));
    }

    @Test
    @DisplayName("delegates status, connect, disconnect, test, and simulator endpoints cleanly")
    void delegatesAllEndpoints() {
        when(tunnelService.getStatus()).thenReturn(sampleStatus(RelayConnectionState.SIMULATED));
        when(tunnelService.connect()).thenReturn(sampleStatus(RelayConnectionState.CONNECTED));
        when(tunnelService.disconnect()).thenReturn(sampleStatus(RelayConnectionState.DISCONNECTED));
        when(tunnelService.simulateDisconnect()).thenReturn(sampleStatus(RelayConnectionState.RECONNECTING));
        when(tunnelService.simulateReconnect()).thenReturn(sampleStatus(RelayConnectionState.SIMULATED));
        when(tunnelService.runDiagnostics()).thenReturn(new CloudRelayDiagnosticDTO(
                true, 18L, "SIMULATED_OK", "OK", "https://le-shaker.open-bar.eu", true, true));

        assertThat(controller.getStatus().getBody()).isNotNull();
        assertThat(controller.connect().getBody().connectionState()).isEqualTo(RelayConnectionState.CONNECTED);
        assertThat(controller.disconnect().getBody().connectionState()).isEqualTo(RelayConnectionState.DISCONNECTED);
        assertThat(controller.simulateDisconnect().getBody().connectionState()).isEqualTo(RelayConnectionState.RECONNECTING);
        assertThat(controller.simulateReconnect().getBody().connectionState()).isEqualTo(RelayConnectionState.SIMULATED);

        ResponseEntity<CloudRelayDiagnosticDTO> diag = controller.runDiagnostics();
        assertThat(diag.getBody()).isNotNull();
        assertThat(diag.getBody().success()).isTrue();
    }
}
