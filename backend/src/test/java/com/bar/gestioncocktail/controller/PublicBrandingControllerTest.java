package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.relay.PublicBrandingDTO;
import com.bar.gestioncocktail.model.DefaultTheme;
import com.bar.gestioncocktail.service.relay.CloudRelayTunnelService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PublicBrandingController}.
 */
@ExtendWith(MockitoExtension.class)
class PublicBrandingControllerTest {

    @Mock
    private CloudRelayTunnelService tunnelService;

    @InjectMocks
    private PublicBrandingController controller;

    @Test
    @DisplayName("returns public white-label branding and relay health fallback info")
    void returnsBrandingAndHealth() {
        PublicBrandingDTO dto = new PublicBrandingDTO(
                "Le Shaker", "le-shaker", "order.leshaker.fr",
                "#6c7fe8", "#5a68d6", "https://cdn.example.com/logo.png",
                "https://cdn.example.com/banner.jpg", DefaultTheme.DARK,
                true, true, true, true,
                "https://order.leshaker.fr", "https://openbar.local", true, "Shaker-WiFi");
        when(tunnelService.getPublicBranding()).thenReturn(dto);

        assertThat(controller.getPublicBranding().getBody()).isEqualTo(dto);
        assertThat(controller.getRelayHealth().getBody()).isEqualTo(dto);
    }
}
